import type { GenerateOptions } from './api'

export type Settings = {
  voice: string
  rate: number
  readPunctuation: boolean
  pauseSeconds: number
}

// Réglages de base (la voix par défaut vient du serveur).
export const BASE_SETTINGS: Omit<Settings, 'voice'> = {
  rate: -10,
  readPunctuation: true,
  pauseSeconds: 2,
}

export function sameSettings(a: Settings, b: Settings): boolean {
  return (
    a.voice === b.voice &&
    a.rate === b.rate &&
    a.readPunctuation === b.readPunctuation &&
    a.pauseSeconds === b.pauseSeconds
  )
}

export function toRequest(text: string, settings: Settings): GenerateOptions {
  return {
    text,
    voice: settings.voice,
    rate: settings.rate,
    read_punctuation: settings.readPunctuation,
    pause_seconds: settings.pauseSeconds,
  }
}
