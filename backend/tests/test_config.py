from app.config import Settings

VARIABLES = (
    "TTS_PROVIDER", "MAX_TEXT_CHARS", "RATE_LIMIT_PER_HOUR", "PREVIEW_LIMIT_PER_HOUR",
    "TTS_CONCURRENCY", "GENERATION_TIMEOUT_SECONDS", "CORS_ORIGINS", "FRONTEND_DIST",
)


def test_variables_vides_prennent_les_valeurs_par_defaut(monkeypatch):
    # Cas d'un .env copié depuis un .env.example aux valeurs vides.
    for name in VARIABLES:
        monkeypatch.setenv(name, "")
    settings = Settings()
    assert settings.tts_provider == "edge"
    assert settings.max_text_chars == 15000
    assert settings.rate_limit_per_hour == 20
    assert settings.preview_limit_per_hour == 120
    assert settings.cors_origins == []
    assert settings.frontend_dist.name == "dist"


def test_variables_renseignees(monkeypatch):
    monkeypatch.setenv("TTS_PROVIDER", "fake")
    monkeypatch.setenv("RATE_LIMIT_PER_HOUR", "5")
    monkeypatch.setenv("CORS_ORIGINS", "https://a.fr, https://b.fr")
    settings = Settings()
    assert settings.tts_provider == "fake"
    assert settings.rate_limit_per_hour == 5
    assert settings.cors_origins == ["https://a.fr", "https://b.fr"]
