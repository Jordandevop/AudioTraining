// Safari sur iPhone n'autorise un lecteur à jouer tout seul (après une requête)
// que s'il a déjà joué une fois pendant un toucher de l'utilisateur.
// On joue donc 0,1 s de silence au premier clic sur « Extrait » ou « Générer ».

let silentUrl = ''

function silence(): string {
  if (silentUrl) return silentUrl
  const sampleRate = 8000
  const samples = sampleRate / 10
  const buffer = new ArrayBuffer(44 + samples * 2) // WAV 16 bits mono, rempli de zéros
  const view = new DataView(buffer)
  const write = (offset: number, text: string) =>
    [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)))
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples * 2, true)
  silentUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
  return silentUrl
}

const unlocked = new WeakSet<HTMLAudioElement>()

/** À appeler directement dans le gestionnaire du clic (avant tout `await`). */
export function unlockAudio(audio: HTMLAudioElement | null) {
  if (!audio || unlocked.has(audio)) return
  unlocked.add(audio)
  audio.src = silence()
  audio.play().catch(() => {})
}
