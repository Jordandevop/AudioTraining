"""API AudioTraining : texte → MP3 dicté en français."""

import asyncio
import logging
import time
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import DEFAULT_VOICE, VOICES, Settings
from .generator import generate_mp3
from .rate_limit import RateLimiter
from .tts import TTSError, TTSProvider, TTSTimeout, get_provider

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s : %(message)s")
logger = logging.getLogger("audiotraining")

PREVIEW_SENTENCES = 2  # deux phrases : on entend aussi la pause entre elles


class GenerateRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE
    rate: int = Field(0, ge=-50, le=20)
    read_punctuation: bool = True
    pause_seconds: float = Field(0, ge=0, le=10)


def create_app(settings: Settings | None = None, provider: TTSProvider | None = None) -> FastAPI:
    settings = settings or Settings()
    provider = provider or get_provider(settings.tts_provider)
    limiter = RateLimiter(settings.rate_limit_per_hour)
    preview_limiter = RateLimiter(settings.preview_limit_per_hour)  # quota séparé

    app = FastAPI(title="AudioTraining", docs_url="/api/docs", openapi_url="/api/openapi.json")

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
            expose_headers=["Content-Disposition"],
        )

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": "Paramètres invalides. Rechargez la page et réessayez."},
        )

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    @app.get("/api/voices")
    async def voices() -> dict:
        return {
            "default": DEFAULT_VOICE,
            "voices": [{"id": voice_id, "label": label} for voice_id, label in VOICES.items()],
            "max_text_chars": settings.max_text_chars,
        }

    def validated_text(body: GenerateRequest) -> str:
        text = body.text.strip()
        if not text:
            raise HTTPException(400, "Le texte est vide. Collez un texte à dicter.")
        if len(text) > settings.max_text_chars:
            raise HTTPException(
                400,
                f"Le texte est trop long ({len(text)} caractères). "
                f"Maximum : {settings.max_text_chars} caractères.",
            )
        if body.voice not in VOICES:
            raise HTTPException(400, "Voix inconnue. Choisissez une voix dans la liste.")
        return text

    def client_ip(request: Request) -> str:
        return request.client.host if request.client else "inconnu"

    async def run_generation(
        text: str, body: GenerateRequest, max_sentences: int | None = None
    ) -> bytes:
        started = time.monotonic()
        try:
            audio = await asyncio.wait_for(
                generate_mp3(
                    text,
                    provider=provider,
                    voice=body.voice,
                    rate=body.rate,
                    read_punctuation=body.read_punctuation,
                    pause_seconds=body.pause_seconds,
                    concurrency=settings.tts_concurrency,
                    max_sentences=max_sentences,
                ),
                settings.generation_timeout_seconds,
            )
        except (asyncio.TimeoutError, TTSTimeout):
            raise HTTPException(
                504, "La génération a pris trop de temps. Essayez avec un texte plus court."
            )
        except TTSError:
            raise HTTPException(
                502, "Le service de voix est momentanément indisponible. Réessayez dans un instant."
            )
        # On ne journalise jamais le texte lui-même.
        logger.info(
            "%s : %d caractères, %d octets, %.1f s",
            "Extrait généré" if max_sentences else "Audio généré",
            len(text), len(audio), time.monotonic() - started,
        )
        return audio

    @app.post("/api/audio/preview")
    async def preview(body: GenerateRequest, request: Request) -> Response:
        text = validated_text(body)
        if not preview_limiter.allow(client_ip(request)):
            raise HTTPException(
                429,
                f"Trop d'écoutes d'extraits ({settings.preview_limit_per_hour} par heure). "
                "Réessayez un peu plus tard.",
            )
        audio = await run_generation(text, body, max_sentences=PREVIEW_SENTENCES)
        return Response(content=audio, media_type="audio/mpeg")

    @app.post("/api/audio/generate")
    async def generate(body: GenerateRequest, request: Request) -> Response:
        text = validated_text(body)
        if not limiter.allow(client_ip(request)):
            raise HTTPException(
                429,
                f"Limite atteinte : {settings.rate_limit_per_hour} générations par heure. "
                "Réessayez un peu plus tard.",
            )
        audio = await run_generation(text, body)
        stamp = datetime.now(ZoneInfo("Europe/Paris")).strftime("%Y%m%d-%H%M")
        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={"Content-Disposition": f'attachment; filename="dictee-{stamp}.mp3"'},
        )

    # Le frontend compilé est servi par le même serveur (une seule URL en production).
    if settings.frontend_dist.is_dir():
        app.mount("/", StaticFiles(directory=settings.frontend_dist, html=True), name="frontend")

    return app


app = create_app()
