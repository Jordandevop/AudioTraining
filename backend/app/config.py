"""Réglages de l'application, lus dans les variables d'environnement."""

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Voix françaises proposées (vérifiées avec `edge-tts --list-voices`).
VOICES: dict[str, str] = {
    "fr-FR-DeniseNeural": "Denise (femme)",
    "fr-FR-EloiseNeural": "Éloïse (femme)",
    "fr-FR-VivienneMultilingualNeural": "Vivienne (femme)",
    "fr-FR-HenriNeural": "Henri (homme)",
    "fr-FR-RemyMultilingualNeural": "Rémy (homme)",
}
DEFAULT_VOICE = "fr-FR-DeniseNeural"


def _str_env(name: str, default: str) -> str:
    """Une variable absente ou vide (ex. `TTS_PROVIDER=`) prend la valeur par défaut."""
    return os.environ.get(name, "").strip() or default


def _int_env(name: str, default: int) -> int:
    value = os.environ.get(name)
    return int(value) if value else default


def _list_env(name: str) -> list[str]:
    value = os.environ.get(name, "")
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass
class Settings:
    tts_provider: str = field(default_factory=lambda: _str_env("TTS_PROVIDER", "edge"))
    max_text_chars: int = field(default_factory=lambda: _int_env("MAX_TEXT_CHARS", 15000))
    rate_limit_per_hour: int = field(default_factory=lambda: _int_env("RATE_LIMIT_PER_HOUR", 20))
    preview_limit_per_hour: int = field(
        default_factory=lambda: _int_env("PREVIEW_LIMIT_PER_HOUR", 120)
    )
    # Plafonds toutes adresses confondues : bornent les abus même si une IP est falsifiée.
    global_limit_per_hour: int = field(
        default_factory=lambda: _int_env("GLOBAL_LIMIT_PER_HOUR", 300)
    )
    global_preview_limit_per_hour: int = field(
        default_factory=lambda: _int_env("GLOBAL_PREVIEW_LIMIT_PER_HOUR", 1500)
    )
    max_concurrent_generations: int = field(
        default_factory=lambda: _int_env("MAX_CONCURRENT_GENERATIONS", 3)
    )
    enable_api_docs: bool = field(
        default_factory=lambda: _str_env("ENABLE_API_DOCS", "false").lower() in ("1", "true", "oui")
    )
    tts_concurrency: int = field(default_factory=lambda: _int_env("TTS_CONCURRENCY", 4))
    generation_timeout_seconds: int = field(
        default_factory=lambda: _int_env("GENERATION_TIMEOUT_SECONDS", 240)
    )
    cors_origins: list[str] = field(default_factory=lambda: _list_env("CORS_ORIGINS"))
    frontend_dist: Path = field(
        default_factory=lambda: Path(
            _str_env("FRONTEND_DIST", str(BACKEND_DIR.parent / "frontend" / "dist"))
        )
    )
