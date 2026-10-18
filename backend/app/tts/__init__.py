from .base import TTSError, TTSProvider, TTSTimeout


def get_provider(name: str) -> TTSProvider:
    """Choisit le fournisseur de voix selon la variable TTS_PROVIDER."""
    if name == "edge":
        from .edge import EdgeTTSProvider

        return EdgeTTSProvider()
    if name == "fake":
        from .fake import FakeTTSProvider

        return FakeTTSProvider()
    raise ValueError(f"Fournisseur de voix inconnu : {name!r} (attendu : edge ou fake)")


__all__ = ["TTSError", "TTSProvider", "TTSTimeout", "get_provider"]
