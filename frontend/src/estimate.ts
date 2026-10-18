// Estimations indicatives, calculées dans le navigateur.

const WORDS_PER_MINUTE = 140 // débit moyen de la voix à vitesse normale
const WORDS_PER_PUNCTUATION = 1.5 // « virgule », « point à la ligne »…

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function countPunctuation(text: string): number {
  return (text.match(/\.{3}|…|[,;:?!.()«»"]|\n/g) ?? []).length
}

export function countSentences(text: string): number {
  const ends = text.match(/[.!?…]+(\s|$)|\n+/g) ?? []
  return Math.max(ends.length, text.trim() ? 1 : 0)
}

export function estimateSeconds(
  text: string,
  options: { rate: number; readPunctuation: boolean; pauseSeconds: number },
): number {
  let words = countWords(text)
  if (words === 0) return 0
  if (options.readPunctuation) words += countPunctuation(text) * WORDS_PER_PUNCTUATION
  const speech = (words / (WORDS_PER_MINUTE * (1 + options.rate / 100))) * 60
  const pauses = Math.max(countSentences(text) - 1, 0) * options.pauseSeconds
  return speech + pauses
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  if (total < 60) return `${total} s`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${minutes} min ${String(rest).padStart(2, '0')}` : `${minutes} min`
}
