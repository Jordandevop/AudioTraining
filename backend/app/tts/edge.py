"""Voix Microsoft Edge via la bibliothèque `edge-tts` (gratuit, sans clé)."""

import asyncio
import logging

import edge_tts

from .base import TTSError, TTSTimeout

logger = logging.getLogger(__name__)

ATTEMPTS = 2
SEGMENT_TIMEOUT_SECONDS = 60


class EdgeTTSProvider:
    async def synthesize(self, text: str, voice: str, rate: int) -> bytes:
        last_error: Exception | None = None
        for attempt in range(1, ATTEMPTS + 1):
            try:
                return await asyncio.wait_for(
                    self._stream(text, voice, rate), SEGMENT_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError as error:
                last_error = error
            except Exception as error:  # erreurs réseau ou du service Microsoft
                last_error = error
            logger.warning("Edge TTS : échec tentative %d (%s)", attempt, type(last_error).__name__)
        if isinstance(last_error, asyncio.TimeoutError):
            raise TTSTimeout("Le service de voix met trop de temps à répondre.")
        raise TTSError("Le service de voix est indisponible.") from last_error

    async def _stream(self, text: str, voice: str, rate: int) -> bytes:
        communicate = edge_tts.Communicate(text, voice, rate=f"{rate:+d}%")
        audio = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio.extend(chunk["data"])
        if not audio:
            raise TTSError("Aucun audio reçu.")
        return bytes(audio)
