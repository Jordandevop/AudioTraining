type Props = {
  audioUrl: string
  filename: string
}

export function ResultPanel({ audioUrl, filename }: Props) {
  return (
    <section className="result" aria-labelledby="result-title">
      <h2 id="result-title">Votre dictée est prête</h2>
      <audio controls src={audioUrl} preload="metadata">
        Votre navigateur ne peut pas lire l'audio. Téléchargez le fichier MP3.
      </audio>
      <a className="button button-secondary" href={audioUrl} download={filename}>
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
        Télécharger le MP3
      </a>
      <p className="hint">Écoutez-le dans votre lecteur habituel et retranscrivez dans Word.</p>
    </section>
  )
}
