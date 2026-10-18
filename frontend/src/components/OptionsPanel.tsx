import type { Voice } from '../api'
import type { Settings } from '../settings'

type Props = {
  voices: Voice[]
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
  canReset: boolean
  disabled: boolean
  onPreview: () => void
  previewLoading: boolean
  previewUrl: string
  previewKey: number
  previewError: string
  hasSelection: boolean
}

function rateLabel(rate: number): string {
  if (rate === 0) return 'Normale'
  return `${rate < 0 ? 'Plus lente' : 'Plus rapide'} (${rate > 0 ? '+' : ''}${rate} %)`
}

function pauseLabel(seconds: number): string {
  return seconds === 0 ? 'Aucune' : `${seconds.toLocaleString('fr-FR')} s`
}

function previewHint(props: Props): string {
  if (props.previewUrl) return 'Changez un réglage : l’extrait se met à jour tout seul.'
  if (props.hasSelection) return 'Le passage sélectionné, avec ces réglages.'
  return 'Les 2 premières phrases, avec ces réglages. Sélectionnez un passage pour l’écouter.'
}

export function OptionsPanel(props: Props) {
  const { settings, onChange } = props
  return (
    <fieldset className="options" disabled={props.disabled}>
      <legend>
        <span>Réglages de la dictée</span>
        <button
          type="button"
          className="link"
          onClick={props.onReset}
          disabled={props.disabled || !props.canReset}
        >
          Réinitialiser
        </button>
      </legend>

      <div className="field">
        <label htmlFor="voice">Voix</label>
        <select
          id="voice"
          value={settings.voice}
          onChange={(event) => onChange({ voice: event.target.value })}
        >
          {props.voices.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <div className="field-head">
          <label htmlFor="rate">Vitesse</label>
          <output htmlFor="rate">{rateLabel(settings.rate)}</output>
        </div>
        <input
          id="rate"
          type="range"
          min={-50}
          max={20}
          step={5}
          value={settings.rate}
          onChange={(event) => onChange({ rate: Number(event.target.value) })}
        />
        <div className="range-hints" aria-hidden="true">
          <span>Lente</span>
          <span>Rapide</span>
        </div>
      </div>

      <div className="field">
        <div className="field-head">
          <label htmlFor="pause">Pause entre les phrases</label>
          <output htmlFor="pause">{pauseLabel(settings.pauseSeconds)}</output>
        </div>
        <input
          id="pause"
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={settings.pauseSeconds}
          onChange={(event) => onChange({ pauseSeconds: Number(event.target.value) })}
        />
        <p className="hint">Le temps de taper la phrase avant que la voix continue.</p>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={settings.readPunctuation}
          onChange={(event) => onChange({ readPunctuation: event.target.checked })}
        />
        <span className="switch-track" aria-hidden="true" />
        <span>
          <strong>Lire la ponctuation</strong>
          <span className="hint">« virgule », « point à la ligne », « ouvrez la parenthèse »…</span>
        </span>
      </label>

      <div className="preview">
        <button
          type="button"
          className="button button-secondary"
          onClick={props.onPreview}
          disabled={props.previewLoading}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
            <path
              d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a3.5 3.5 0 0 0-2-3.2v6.4a3.5 3.5 0 0 0 2-3.2Z"
              fill="currentColor"
            />
          </svg>
          {props.previewLoading ? 'Chargement…' : 'Écouter un extrait'}
        </button>
        <p className="hint">{previewHint(props)}</p>
        {props.previewError && (
          <p className="error" role="alert">
            {props.previewError}
          </p>
        )}
        {props.previewUrl && (
          <audio key={props.previewKey} controls autoPlay src={props.previewUrl}>
            Votre navigateur ne peut pas lire l'extrait.
          </audio>
        )}
      </div>
    </fieldset>
  )
}
