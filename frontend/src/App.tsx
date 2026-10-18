import { useEffect, useRef, useState } from 'react'
import { fetchOptions, generateAudio, type ServerOptions } from './api'
import { OptionsPanel } from './components/OptionsPanel'
import { ResultPanel } from './components/ResultPanel'
import { countWords, estimateSeconds, formatDuration } from './estimate'
import { SAMPLE_TEXT } from './sampleText'

type ServerState = 'loading' | 'waking' | 'ready' | 'unreachable'

const WAKE_BANNER_DELAY_MS = 3000
const WAKE_GIVE_UP_MS = 90_000
const WAKE_RETRY_MS = 4000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default function App() {
  const [server, setServer] = useState<ServerState>('loading')
  const [options, setOptions] = useState<ServerOptions | null>(null)

  const [text, setText] = useState('')
  const [voice, setVoice] = useState('')
  const [rate, setRate] = useState(-10)
  const [readPunctuation, setReadPunctuation] = useState(true)
  const [pauseSeconds, setPauseSeconds] = useState(2)

  const [generating, setGenerating] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [audio, setAudio] = useState<{ url: string; filename: string } | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

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
          setVoice(data.default)
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
  const estimate = estimateSeconds(text, { rate, readPunctuation, pauseSeconds })
  const expectedGeneration = Math.max(4, estimate / 8 + 2)
  const progress = Math.min(0.95, 1 - Math.exp(-elapsed / expectedGeneration))
  const canGenerate = server === 'ready' && words > 0 && !tooLong && !generating

  async function handleGenerate() {
    setError('')
    setElapsed(0)
    setGenerating(true)
    try {
      const result = await generateAudio({
        text,
        voice,
        rate,
        read_punctuation: readPunctuation,
        pause_seconds: pauseSeconds,
      })
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
            value={text}
            onChange={(event) => setText(event.target.value)}
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
        </section>

        <aside className="side">
          <OptionsPanel
            voices={options?.voices ?? []}
            voice={voice}
            onVoiceChange={setVoice}
            rate={rate}
            onRateChange={setRate}
            readPunctuation={readPunctuation}
            onReadPunctuationChange={setReadPunctuation}
            pauseSeconds={pauseSeconds}
            onPauseSecondsChange={setPauseSeconds}
            disabled={generating || server !== 'ready'}
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
        Aucun texte ni fichier n'est conservé sur le serveur. Voix de synthèse Microsoft Edge.
      </footer>
    </div>
  )
}
