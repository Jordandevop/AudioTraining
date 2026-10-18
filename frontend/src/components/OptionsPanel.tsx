import type { Voice } from '../api'
import type { Settings } from '../settings'

type Props = {
  voices: Voice[]
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
  canReset: boolean
  disabled: boolean
  open: boolean // mobile : réglages dépliés
  onToggle: () => void
}

function rateLabel(rate: number): string {
  if (rate === 0) return 'Normale'
  return `${rate < 0 ? 'Plus lente' : 'Plus rapide'} (${rate > 0 ? '+' : ''}${rate} %)`
}

function pauseLabel(seconds: number): string {
  return seconds === 0 ? 'Aucune' : `${seconds.toLocaleString('fr-FR')} s`
}

export function OptionsPanel(props: Props) {
  const { settings, onChange } = props
  const voiceName = props.voices.find((voice) => voice.id === settings.voice)?.label.split(' ')[0]
  const summary = [
    voiceName,
    rateLabel(settings.rate).toLowerCase(),
    `pause ${pauseLabel(settings.pauseSeconds).toLowerCase()}`,
    settings.readPunctuation && 'ponctuation lue',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className={`card settings${props.open ? ' open' : ''}`} aria-label="Réglages de la dictée">
      {/* Mobile : une ligne de résumé qui déplie les réglages. */}
      <button
        type="button"
        className="settings-toggle"
        onClick={props.onToggle}
        aria-expanded={props.open}
        aria-controls="settings-body"
      >
        <span className="summary">
          <strong>Réglages</strong>
          {summary}
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
          <path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="row settings-head">
        <span className="label">Réglages de la dictée</span>
        <button
          type="button"
          className="link"
          onClick={props.onReset}
          disabled={props.disabled || !props.canReset}
        >
          Réinitialiser
        </button>
      </div>

      <fieldset className="settings-body" id="settings-body" disabled={props.disabled}>
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
          <div className="row">
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
        </div>

        <div className="field">
          <div className="row">
            <label htmlFor="pause" title="Le temps de taper la phrase avant que la voix continue.">
              Pause entre les phrases
            </label>
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
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={settings.readPunctuation}
            onChange={(event) => onChange({ readPunctuation: event.target.checked })}
          />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-text">
            Lire la ponctuation
            <small>« virgule », « point à la ligne »…</small>
          </span>
        </label>

        {props.canReset && (
          <button type="button" className="link mobile-reset" onClick={props.onReset}>
            Réinitialiser les réglages
          </button>
        )}
      </fieldset>
    </section>
  )
}
