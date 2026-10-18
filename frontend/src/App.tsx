import { useEffect, useRef, useState } from "react";
import {
  fetchOptions,
  generateAudio,
  previewAudio,
  type ServerOptions,
} from "./api";
import { ListenPanel, type Playing } from "./components/ListenPanel";
import { OptionsPanel } from "./components/OptionsPanel";
import { countWords, estimateSeconds, formatDuration } from "./estimate";
import { SAMPLE_TEXT } from "./sampleText";
import {
  BASE_SETTINGS,
  sameSettings,
  toRequest,
  type Settings,
} from "./settings";

type ServerState = "loading" | "waking" | "ready" | "unreachable";

const LIVE_PREVIEW_DELAY_MS = 500; // attendre la fin du réglage avant de régénérer
const PREVIEW_CACHE_SIZE = 20;
const WAKE_BANNER_DELAY_MS = 3000;
const WAKE_GIVE_UP_MS = 90_000;
const WAKE_RETRY_MS = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Une erreur inattendue est survenue.";

export default function App() {
  const [server, setServer] = useState<ServerState>("loading");
  const [options, setOptions] = useState<ServerOptions | null>(null);

  const [text, setText] = useState("");
  const [settings, setSettings] = useState<Settings>({
    voice: "",
    ...BASE_SETTINGS,
  });
  const [settingsOpen, setSettingsOpen] = useState(false); // mobile uniquement

  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");

  // Un seul lecteur : l'extrait ou la dictée complète, le plus récent des deux.
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previewRequest = useRef(0); // pour ignorer les réponses dépassées
  const previewCache = useRef(new Map<string, string>()); // requête → URL du MP3

  // Au chargement : récupérer les voix (et réveiller le serveur s'il dormait).
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const bannerTimer = setTimeout(() => {
      if (!cancelled)
        setServer((state) => (state === "loading" ? "waking" : state));
    }, WAKE_BANNER_DELAY_MS);

    async function load() {
      while (!cancelled) {
        try {
          const data = await fetchOptions();
          if (cancelled) return;
          setOptions(data);
          setSettings((current) => ({ ...current, voice: data.default }));
          setServer("ready");
          return;
        } catch {
          if (Date.now() - started > WAKE_GIVE_UP_MS) {
            if (!cancelled) setServer("unreachable");
            return;
          }
          await sleep(WAKE_RETRY_MS);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(bannerTimer);
    };
  }, []);

  // Chronomètre pendant la génération (pour la barre de progression).
  useEffect(() => {
    if (!generating) return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed((Date.now() - started) / 1000),
      250,
    );
    return () => clearInterval(timer);
  }, [generating]);

  const maxChars = options?.max_text_chars ?? 15000;
  const tooLong = text.length > maxChars;
  const words = countWords(text);
  const estimate = estimateSeconds(text, settings);
  const expectedGeneration = Math.max(4, estimate / 8 + 2);
  const progress = Math.min(0.95, 1 - Math.exp(-elapsed / expectedGeneration));
  const ready = server === "ready";
  const baseSettings: Settings = {
    voice: options?.default ?? "",
    ...BASE_SETTINGS,
  };

  // Tant qu'un extrait est affiché, chaque changement de réglage le met à jour.
  function changeSettings(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (playing?.kind === "preview") {
      clearTimeout(previewTimer.current);
      setPreviewLoading(true);
      previewTimer.current = setTimeout(
        () => playPreview(next),
        LIVE_PREVIEW_DELAY_MS,
      );
    }
  }

  // Le passage sélectionné, sinon le texte, sinon l'exemple (le serveur garde 2 phrases).
  function previewSource(): { text: string; selection: boolean } {
    const area = textRef.current;
    const selection = area
      ? text.slice(area.selectionStart, area.selectionEnd).trim()
      : "";
    return selection
      ? { text: selection, selection: true }
      : { text: text.trim() || SAMPLE_TEXT, selection: false };
  }

  function show(next: Playing) {
    setPlaying((current) => {
      if (current?.kind === "result") URL.revokeObjectURL(current.url); // les extraits restent en cache
      return { ...next, key: (current?.key ?? 0) + 1 }; // nouvelle clé = relecture
    });
  }

  async function playPreview(current: Settings) {
    clearTimeout(previewTimer.current);
    const source = previewSource();
    const request = toRequest(source.text, current);
    const cacheKey = JSON.stringify(request);
    const id = ++previewRequest.current;
    const title = source.selection
      ? "Extrait · sélection"
      : "Extrait · 2 phrases";
    setError("");

    const cache = previewCache.current;
    const cached = cache.get(cacheKey);
    if (cached) {
      cache.delete(cacheKey);
      cache.set(cacheKey, cached); // le plus récent en dernier
      setPreviewLoading(false);
      show({ kind: "preview", url: cached, title, key: 0 });
      return;
    }

    setPreviewLoading(true);
    try {
      const url = URL.createObjectURL(await previewAudio(request));
      cache.set(cacheKey, url);
      if (cache.size > PREVIEW_CACHE_SIZE) {
        const [oldestKey, oldestUrl] = cache.entries().next().value!;
        cache.delete(oldestKey);
        URL.revokeObjectURL(oldestUrl);
      }
      if (id === previewRequest.current)
        show({ kind: "preview", url, title, key: 0 });
    } catch (err) {
      if (id === previewRequest.current) setError(errorMessage(err));
    } finally {
      if (id === previewRequest.current) setPreviewLoading(false);
    }
  }

  async function handleGenerate() {
    clearTimeout(previewTimer.current);
    previewRequest.current++; // ignore un extrait encore en cours
    setPreviewLoading(false);
    setPlaying(null); // arrête l'extrait
    setError("");
    setElapsed(0);
    setGenerating(true);
    try {
      const result = await generateAudio(toRequest(text, settings));
      show({
        kind: "result",
        url: URL.createObjectURL(result.blob),
        filename: result.filename,
        title: "Dictée complète",
        key: 0,
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  function statusText(): string {
    if (generating) {
      const long =
        estimate > 300
          ? " (un texte long peut prendre une minute ou plus)"
          : "";
      return `Préparation de la dictée… ${Math.round(elapsed)} s${long}`;
    }
    if (previewLoading) return "Chargement de l’extrait…";
    if (playing?.kind === "preview")
      return "Changez un réglage : l’extrait se met à jour tout seul.";
    if (playing?.kind === "result")
      return "Écoutez-la dans votre lecteur habituel et retranscrivez dans Word.";
    if (hasSelection) return "Extrait : le passage sélectionné.";
    return "Extrait : les 2 premières phrases avec ces réglages.";
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24">
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
        <p className="tagline">
          Transformez un texte en dictée audio pour vous entraîner à la
          retranscription.
        </p>
      </header>

      {server === "waking" && (
        <p className="banner" role="status">
          <span className="spinner" aria-hidden="true" />
          Réveil du serveur en cours, cela peut prendre jusqu'à une minute…
        </p>
      )}
      {server === "unreachable" && (
        <p className="banner banner-error" role="alert">
          Le serveur ne répond pas. Rechargez la page dans quelques instants.
        </p>
      )}

      <main className="workspace">
        <section className="card editor" aria-labelledby="text-label">
          <div className="row">
            <label id="text-label" className="label" htmlFor="text">
              Texte à dicter
            </label>
            {text ? (
              <button
                type="button"
                className="link"
                onClick={() => setText("")}
              >
                Effacer
              </button>
            ) : (
              <button
                type="button"
                className="link"
                onClick={() => setText(SAMPLE_TEXT)}
              >
                Insérer un exemple
              </button>
            )}
          </div>
          <textarea
            id="text"
            ref={textRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onSelect={(event) =>
              setHasSelection(
                event.currentTarget.selectionStart !==
                  event.currentTarget.selectionEnd,
              )
            }
            placeholder="Collez ici un compte rendu, un courrier médical, une ordonnance…"
            spellCheck={false}
            aria-describedby="text-stats"
            aria-invalid={tooLong}
          />
          <p id="text-stats" className="stats">
            <span>
              <strong>{words.toLocaleString("fr-FR")}</strong> mots
            </span>
            <span className={tooLong ? "stats-error" : undefined}>
              <strong>{text.length.toLocaleString("fr-FR")}</strong> /{" "}
              {maxChars.toLocaleString("fr-FR")} caractères
            </span>
            <span>
              Durée estimée{" "}
              <strong>{words ? `≈ ${formatDuration(estimate)}` : "—"}</strong>
            </span>
          </p>
          {tooLong && (
            <p className="stats-error">
              Texte trop long : raccourcissez-le ou découpez-le en plusieurs
              dictées.
            </p>
          )}
          <p className="notice">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              <strong>Textes fictifs ou anonymisés uniquement.</strong> Ne
              collez jamais de données réelles de patients : le texte est envoyé
              au service de voix de Microsoft.
            </span>
          </p>
        </section>

        <aside className="panel">
          <OptionsPanel
            voices={options?.voices ?? []}
            settings={settings}
            onChange={changeSettings}
            onReset={() => changeSettings(baseSettings)}
            canReset={!sameSettings(settings, baseSettings)}
            disabled={generating || !ready}
            open={settingsOpen}
            onToggle={() => setSettingsOpen((open) => !open)}
          />
          <ListenPanel
            onPreview={() => playPreview(settings)}
            onGenerate={handleGenerate}
            canPreview={ready && !generating && !previewLoading}
            canGenerate={ready && words > 0 && !tooLong && !generating}
            previewLoading={previewLoading}
            generating={generating}
            progress={progress}
            status={statusText()}
            error={error}
            playing={playing}
          />
        </aside>
      </main>

      <footer className="bottombar">
        <span>© 2026 AudioTraining · Tous droits réservés</span>
        <a href="/mentions-legales.html">Mentions légales</a>
        <a href="/confidentialite.html">Confidentialité</a>
        <span>Aucun texte conservé · Voix Microsoft Edge ·</span>
      </footer>
    </div>
  );
}
