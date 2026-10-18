import type { Voice } from '../api'

type Props = {
  voices: Voice[]
  voice: string
  onVoiceChange: (voice: string) => void
  rate: number
  onRateChange: (rate: number) => void
  readPunctuation: boolean
  onReadPunctuationChange: (value: boolean) => void
  pauseSeconds: number
  onPauseSecondsChange: (value: number) => void
  disabled: boolean
}

function rateLabel(rate: number): string {
  if (rate === 0) return 'Normale'
  return `${rate < 0 ? 'Plus lente' : 'Plus rapide'} (${rate > 0 ? '+' : ''}${rate} %)`
}

function pauseLabel(seconds: number): string {
  return seconds === 0 ? 'Aucune' : `${seconds.toLocaleString('fr-FR')} s`
}

export function OptionsPanel(props: Props) {
  return (
    <fieldset className="options" disabled={props.disabled}>
      <legend>Réglages de la dictée</legend>

      <div className="field">
        <label htmlFor="voice">Voix</label>
        <select
          id="voice"
          value={props.voice}
          onChange={(event) => props.onVoiceChange(event.target.value)}
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
          <output htmlFor="rate">{rateLabel(props.rate)}</output>
        </div>
        <input
          id="rate"
          type="range"
          min={-50}
          max={20}
          step={5}
          value={props.rate}
          onChange={(event) => props.onRateChange(Number(event.target.value))}
        />
        <div className="range-hints" aria-hidden="true">
          <span>Lente</span>
          <span>Rapide</span>
        </div>
      </div>

      <div className="field">
        <div className="field-head">
          <label htmlFor="pause">Pause entre les phrases</label>
          <output htmlFor="pause">{pauseLabel(props.pauseSeconds)}</output>
        </div>
        <input
          id="pause"
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={props.pauseSeconds}
          onChange={(event) => props.onPauseSecondsChange(Number(event.target.value))}
        />
        <p className="hint">Le temps de taper la phrase avant que la voix continue.</p>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={props.readPunctuation}
          onChange={(event) => props.onReadPunctuationChange(event.target.checked)}
        />
        <span className="switch-track" aria-hidden="true" />
        <span>
          <strong>Lire la ponctuation</strong>
          <span className="hint">« virgule », « point à la ligne », « ouvrez la parenthèse »…</span>
        </span>
      </label>
    </fieldset>
  )
}
