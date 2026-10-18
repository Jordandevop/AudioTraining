from typing import Protocol


class TTSError(Exception):
    """Le fournisseur de voix a échoué."""


class TTSTimeout(TTSError):
    """Le fournisseur de voix n'a pas répondu à temps."""


class TTSProvider(Protocol):
    async def synthesize(self, text: str, voice: str, rate: int) -> bytes:
        """Renvoie le MP3 (24 kHz, 48 kbit/s, mono) de `text`.

        `rate` est l'écart de vitesse en pourcentage (-50 = deux fois plus lent).
        """
        ...
