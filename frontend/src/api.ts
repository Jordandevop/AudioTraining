export type Voice = { id: string; label: string }

export type ServerOptions = {
  default: string
  voices: Voice[]
  max_text_chars: number
}

export type GenerateOptions = {
  text: string
  voice: string
  rate: number
  read_punctuation: boolean
  pause_seconds: number
}

export type GeneratedAudio = { blob: Blob; filename: string }

const GENERATE_TIMEOUT_MS = 5 * 60 * 1000
const PREVIEW_TIMEOUT_MS = 30 * 1000

export async function fetchOptions(signal?: AbortSignal): Promise<ServerOptions> {
  const response = await fetch('/api/voices', { signal })
  if (!response.ok) throw new Error('Serveur indisponible.')
  return response.json()
}

export async function generateAudio(options: GenerateOptions): Promise<GeneratedAudio> {
  const response = await postAudio('/api/audio/generate', options, GENERATE_TIMEOUT_MS)
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'dictee.mp3'
  return { blob: await response.blob(), filename }
}

// Extrait court (2 premières phrases) pour essayer les réglages.
export async function previewAudio(options: GenerateOptions): Promise<Blob> {
  const response = await postAudio('/api/audio/preview', options, PREVIEW_TIMEOUT_MS)
  return response.blob()
}

async function postAudio(path: string, options: GenerateOptions, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
      signal: controller.signal,
    })
  } catch {
    throw new Error(
      controller.signal.aborted
        ? 'La génération a pris trop de temps. Essayez avec un texte plus court.'
        : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.detail ?? `Erreur inattendue (code ${response.status}).`)
  }
  return response
}
