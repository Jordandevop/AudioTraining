import { useState } from 'react'
import { formatDuration } from '../estimate'

export type Playing = {
  kind: 'preview' | 'result'
  url: string
  title: string
  key: number
  filename?: string
}

type Props = {
  onPreview: () => void
  onGenerate: () => void
  canPreview: boolean
  canGenerate: boolean
  previewLoading: boolean
  generating: boolean
  progress: number
  status: string
  error: string
  playing: Playing | null
}

// Les deux actions, l'avancement et un lecteur unique (extrait ou dictée complète).
export function ListenPanel(props: Props) {
  const { playing } = props
  return (
    <section className="card listen" aria-label="Écoute et génération">
      <div className="actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={props.onPreview}
          disabled={!props.canPreview}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2Z"
              fill="currentColor"
            />
          </svg>
          {props.previewLoading ? 'Chargement…' : 'Extrait'}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={props.onGenerate}
          disabled={!props.canGenerate}
        >
          {props.generating ? 'Génération…' : "Générer l'audio"}
        </button>
      </div>

      {props.generating && (
        <div
          className="progress"
          role="progressbar"
          aria-label="Progression estimée"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(props.progress * 100)}
        >
          <span style={{ width: `${props.progress * 100}%` }} />
        </div>
      )}
      <p className="status" aria-live="polite">
        {props.status}
      </p>
      {props.error && (
        <p className="error" role="alert">
          {props.error}
        </p>
      )}

      {playing ? (
        <Player key={playing.key} playing={playing} />
      ) : (
        <div className="player">
          <p className="player-empty">
            Écoutez un extrait pour régler la voix, puis générez la dictée complète.
          </p>
        </div>
      )}
    </section>
  )
}

function Player({ playing }: { playing: Playing }) {
  const [duration, setDuration] = useState(0)
  return (
    <div className="player filled">
      <div className="player-title">
        <span>{playing.title}</span>
        <span>{duration ? formatDuration(duration) : ''}</span>
      </div>
      <div className="player-row">
        <audio
          controls
          autoPlay
          src={playing.url}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        >
          Votre navigateur ne peut pas lire l'audio. Téléchargez le fichier MP3.
        </audio>
        {playing.kind === 'result' && (
          <a
            className="icon-button"
            href={playing.url}
            download={playing.filename}
            aria-label="Télécharger le MP3"
            title="Télécharger le MP3"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
              <path
                d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
