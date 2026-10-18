import { useEffect, useRef, useState } from 'react'
import { fetchOptions, generateAudio, previewAudio, type ServerOptions } from './api'
import { OptionsPanel } from './components/OptionsPanel'
import { ResultPanel } from './components/ResultPanel'
import { countWords, estimateSeconds, formatDuration } from './estimate'
import { SAMPLE_TEXT } from './sampleText'
import { BASE_SETTINGS, sameSettings, toRequest, type Settings } from './settings'

type ServerState = 'loading' | 'waking' | 'ready' | 'unreachable'

const LIVE_PREVIEW_DELAY_MS = 500 // attendre la fin du réglage avant de régénérer
const PREVIEW_CACHE_SIZE = 20
const WAKE_BANNER_DELAY_MS = 3000
const WAKE_GIVE_UP_MS = 90_000
const WAKE_RETRY_MS = 4000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function App() {
  const [server, setServer] = useState<ServerState>('loading')
  const [options, setOptions] = useState<ServerOptions | null>(null)

  const [text, setText] = useState('')
  const [settings, setSettings] = useState<Settings>({ voice: '', ...BASE_SETTINGS })

  const [generating, setGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [audio, setAudio] = useState<{ url: string; filename: string } | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [preview, setPreview] = useState<{ url: string; key: number } | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const previewRequest = useRef(0) // pour ignorer les réponses dépassées
  const previewCache = useRef(new Map<string, string>()) // requête → URL du MP3

  // Au chargement : récupérer les voix (et réveiller le serveur s'il dormait).
  useEffect(() => {
    let cancelled = false
    const started = Date.now()
    const bannerTimer = setTimeout(() => {
      if (!cancelled) setServer((state) => (state === 'loading' ? 'waking' : state))
    }, WAKE_BANNER_DELAY_MS)

    async function load() {
      while (!cancelled) {
        try {
          const data = await fetchOptions()
          if (cancelled) return
          setOptions(data)
          setSettings((current) => ({ ...current, voice: data.default }))
          setServer('ready')
          return
        } catch {
          if (Date.now() - started > WAKE_GIVE_UP_MS) {
            if (!cancelled) setServer('unreachable')
            return
          }
          await sleep(WAKE_RETRY_MS)
        }
      }
    }
    load()
    return () => {
      cancelled = true
      clearTimeout(bannerTimer)
    }
  }, [])

  // Chronomètre pendant la génération (pour la barre de progression).
  useEffect(() => {
    if (!generating) return
    const started = Date.now()
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 250)
    return () => clearInterval(timer)
  }, [generating])

  const maxChars = options?.max_text_chars ?? 15000
  const tooLong = text.length > maxChars
  const words = countWords(text)
  const estimate = estimateSeconds(text, settings)
  const expectedGeneration = Math.max(4, estimate / 8 + 2)
  const progress = Math.min(0.95, 1 - Math.exp(-elapsed / expectedGeneration))
  const canGenerate = server === 'ready' && words > 0 && !tooLong && !generating
  const baseSettings: Settings = { voice: options?.default ?? '', ...BASE_SETTINGS }

  // Tant qu'un extrait est affiché, chaque changement de réglage le met à jour.
  function changeSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    if (preview) {
      clearTimeout(previewTimer.current)
      setPreviewLoading(true)
      previewTimer.current = setTimeout(() => playPreview(next), LIVE_PREVIEW_DELAY_MS)
    }
  }

  // Le passage sélectionné, sinon le texte, sinon l'exemple (le serveur garde 2 phrases).
  function previewText(): string {
    const area = textRef.current
    const selection = area ? text.slice(area.selectionStart, area.selectionEnd).trim() : ''
    return selection || text.trim() || SAMPLE_TEXT
  }

  function showPreview(url: string) {
    setPreview((current) => ({ url, key: (current?.key ?? 0) + 1 })) // nouvelle clé = relecture
  }

  async function playPreview(current: Settings) {
    clearTimeout(previewTimer.current)
    const request = toRequest(previewText(), current)
    const cacheKey = JSON.stringify(request)
    const id = ++previewRequest.current
    setPreviewError('')

    const cache = previewCache.current
    const cached = cache.get(cacheKey)
    if (cached) {
      cache.delete(cacheKey)
      cache.set(cacheKey, cached) // le plus récent en dernier
      setPreviewLoading(false)
      showPreview(cached)
      return
    }

    setPreviewLoading(true)
    try {
      const url = URL.createObjectURL(await previewAudio(request))
      cache.set(cacheKey, url)
      if (cache.size > PREVIEW_CACHE_SIZE) {
        const [oldestKey, oldestUrl] = cache.entries().next().value!
        cache.delete(oldestKey)
        URL.revokeObjectURL(oldestUrl)
      }
      if (id === previewRequest.current) showPreview(url)
    } catch (err) {
      if (id === previewRequest.current) {
        setPreviewError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.')
      }
    } finally {
      if (id === previewRequest.current) setPreviewLoading(false)
    }
  }

  async function handleGenerate() {
    clearTimeout(previewTimer.current)
    previewRequest.current++ // ignore un extrait encore en cours
    setPreview(null) // arrête l'extrait
    setPreviewLoading(false)
    setError('')
    setElapsed(0)
    setGenerating(true)
    try {
      const result = await generateAudio(toRequest(text, settings))
      if (audio) URL.revokeObjectURL(audio.url)
      setAudio({ url: URL.createObjectURL(result.blob), filename: result.filename })
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28">
            <path
              d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <h1>AudioTraining</h1>
        </div>
        <p>Transformez un texte en dictée audio pour vous entraîner à la retranscription.</p>
      </header>

      {server === 'waking' && (
        <p className="banner" role="status">
          <span className="spinner" aria-hidden="true" />
          Réveil du serveur en cours, cela peut prendre jusqu'à une minute…
        </p>
      )}
      {server === 'unreachable' && (
        <p className="banner banner-error" role="alert">
          Le serveur ne répond pas. Rechargez la page dans quelques instants.
        </p>
      )}

      <main className="layout">
        <section className="editor" aria-labelledby="text-label">
          <div className="editor-head">
            <label id="text-label" htmlFor="text">
              Texte à dicter
            </label>
            <div className="editor-actions">
              {!text && (
                <button type="button" className="link" onClick={() => setText(SAMPLE_TEXT)}>
                  Insérer un exemple
                </button>
              )}
              {text && (
                <button type="button" className="link" onClick={() => setText('')}>
                  Effacer
                </button>
              )}
            </div>
          </div>
          <textarea
            id="text"
            ref={textRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onSelect={(event) =>
              setHasSelection(event.currentTarget.selectionStart !== event.currentTarget.selectionEnd)
            }
            placeholder="Collez ici un compte rendu, un courrier médical, une ordonnance…"
            spellCheck={false}
            aria-describedby="text-stats"
            aria-invalid={tooLong}
          />
          <p id="text-stats" className={`stats${tooLong ? ' stats-error' : ''}`}>
            <span>{words.toLocaleString('fr-FR')} mots</span>
            <span>
              {text.length.toLocaleString('fr-FR')} / {maxChars.toLocaleString('fr-FR')} caractères
            </span>
            <span>Durée estimée : {words ? `≈ ${formatDuration(estimate)}` : '—'}</span>
          </p>
          {tooLong && (
            <p className="stats-error">Texte trop long : raccourcissez-le ou découpez-le en plusieurs dictées.</p>
          )}
          <p className="notice">
            <strong>Textes fictifs ou anonymisés uniquement.</strong> Ne collez jamais de données
            réelles de patients : le texte est envoyé au service de voix de Microsoft pour être lu,
            puis oublié.
          </p>
        </section>

        <aside className="side">
          <OptionsPanel
            voices={options?.voices ?? []}
            settings={settings}
            onChange={changeSettings}
            onReset={() => changeSettings(baseSettings)}
            canReset={!sameSettings(settings, baseSettings)}
            disabled={generating || server !== 'ready'}
            onPreview={() => playPreview(settings)}
            previewLoading={previewLoading}
            previewUrl={preview?.url ?? ''}
            previewKey={preview?.key ?? 0}
            previewError={previewError}
            hasSelection={hasSelection}
          />

          <button
            type="button"
            className="button button-primary"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            {generating ? 'Génération en cours…' : "Générer l'audio"}
          </button>

          {generating && (
            <div className="progress" role="status">
              <div
                className="progress-bar"
                role="progressbar"
                aria-label="Progression estimée"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="hint">
                Préparation de la dictée… {Math.round(elapsed)} s
                {estimate > 300 && ' (un texte long peut prendre une minute ou plus)'}
              </p>
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div ref={resultRef} aria-live="polite">
            {audio && !generating && <ResultPanel audioUrl={audio.url} filename={audio.filename} />}
          </div>
        </aside>
      </main>

      <footer className="footer">
        <p>
          Aucun texte ni fichier n'est conservé sur le serveur. Voix de synthèse Microsoft Edge
          (AudioTraining n'est pas affilié à Microsoft).
        </p>
        <p>
          © 2026 AudioTraining · Tous droits réservés ·{' '}
          <a href="/mentions-legales.html">Mentions légales</a> ·{' '}
          <a href="/confidentialite.html">Confidentialité</a>
        </p>
      </footer>
    </div>
  )
}
