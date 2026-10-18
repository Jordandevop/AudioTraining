import asyncio
import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mutagen.mp3 import MP3

from app.config import Settings
from app.main import create_app
from app.tts import TTSError
from app.tts.fake import FakeTTSProvider


def make_client(provider=None, **overrides) -> TestClient:
    settings = Settings(frontend_dist=Path("/inexistant"), **overrides)
    return TestClient(create_app(settings, provider or FakeTTSProvider()))


def generate(client: TestClient, **body):
    return client.post("/api/audio/generate", json={"text": "Bonjour.", **body})


def test_health():
    assert make_client().get("/health").json() == {"status": "ok"}


def test_voix_disponibles():
    data = make_client().get("/api/voices").json()
    assert data["default"] in [voice["id"] for voice in data["voices"]]


def test_texte_court_renvoie_un_mp3_telechargeable():
    response = generate(make_client(), text="Le patient va bien.")
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.headers["content-disposition"].startswith('attachment; filename="dictee-')
    assert MP3(io.BytesIO(response.content)).info.length > 0


def test_ponctuation_lue_et_envoyee_au_fournisseur():
    provider = FakeTTSProvider()
    generate(make_client(provider), text="Un, deux.")
    assert provider.calls == ["Un virgule, deux point."]


def test_ponctuation_non_lue():
    provider = FakeTTSProvider()
    generate(make_client(provider), text="Un, deux.", read_punctuation=False)
    assert provider.calls == ["Un, deux."]


def test_texte_long_avec_pauses_une_phrase_par_segment():
    provider = FakeTTSProvider()
    text = " ".join(f"Phrase numéro {i}." for i in range(200))
    response = generate(make_client(provider), text=text, pause_seconds=2)
    assert response.status_code == 200
    assert len(provider.calls) == 200
    assert provider.calls[150] == "Phrase numéro 150 point."  # ordre conservé
    # 199 pauses de 2 s entre les 200 phrases
    assert MP3(io.BytesIO(response.content)).info.length > 199 * 2


def test_texte_long_sans_pause_regroupe_en_blocs():
    provider = FakeTTSProvider()
    text = " ".join(f"Phrase numéro {i}." for i in range(500))
    assert generate(make_client(provider), text=text).status_code == 200
    assert 1 < len(provider.calls) < 20


@pytest.mark.parametrize("text", ["", "   \n "])
def test_texte_vide_refuse(text):
    response = generate(make_client(), text=text)
    assert response.status_code == 400
    assert "vide" in response.json()["detail"]


def test_texte_trop_long_refuse():
    response = generate(make_client(max_text_chars=100), text="a" * 101)
    assert response.status_code == 400
    assert "trop long" in response.json()["detail"]


def test_parametres_invalides_message_en_francais():
    response = generate(make_client(), rate=500)
    assert response.status_code == 400
    assert "invalides" in response.json()["detail"]
    assert generate(make_client(), voice="en-US-Inconnue").status_code == 400


def test_limite_de_requetes():
    client = make_client(rate_limit_per_hour=2)
    assert generate(client).status_code == 200
    assert generate(client).status_code == 200
    response = generate(client)
    assert response.status_code == 429
    assert "Limite atteinte" in response.json()["detail"]


class FailingProvider:
    async def synthesize(self, text, voice, rate):
        raise TTSError("panne")


class SlowProvider:
    async def synthesize(self, text, voice, rate):
        await asyncio.sleep(5)
        return b""


def test_fournisseur_en_panne():
    response = generate(make_client(FailingProvider()))
    assert response.status_code == 502
    assert "indisponible" in response.json()["detail"]


def test_delai_depasse():
    response = generate(make_client(SlowProvider(), generation_timeout_seconds=0.1))
    assert response.status_code == 504


def test_cors_uniquement_si_configure():
    origin = {"Origin": "http://localhost:5173"}
    assert "access-control-allow-origin" not in make_client().get("/health", headers=origin).headers
    client = make_client(cors_origins=["http://localhost:5173"])
    assert client.get("/health", headers=origin).headers["access-control-allow-origin"] == (
        "http://localhost:5173"
    )


def test_frontend_servi_par_le_meme_serveur(tmp_path):
    (tmp_path / "index.html").write_text("<h1>AudioTraining</h1>")
    client = TestClient(create_app(Settings(frontend_dist=tmp_path), FakeTTSProvider()))
    assert "AudioTraining" in client.get("/").text
    assert client.get("/health").json() == {"status": "ok"}


def preview(client: TestClient, **body):
    return client.post("/api/audio/preview", json={"text": "Bonjour.", **body})


def test_extrait_deux_premieres_phrases_seulement():
    provider = FakeTTSProvider()
    text = " ".join(f"Phrase numéro {i}." for i in range(10))
    response = preview(make_client(provider), text=text, pause_seconds=2)
    assert response.status_code == 200
    assert provider.calls == ["Phrase numéro 0 point.", "Phrase numéro 1 point."]


def test_extrait_garde_le_retour_a_la_ligne():
    provider = FakeTTSProvider()
    preview(make_client(provider), text="Titre\nPremière phrase. Deuxième.", pause_seconds=1)
    assert provider.calls == ["Titre à la ligne.", "Première phrase point."]


def test_extrait_phrase_tres_longue_tronquee():
    provider = FakeTTSProvider()
    preview(make_client(provider), text="mot " * 500, read_punctuation=False)
    assert len(provider.calls) == 1
    assert len(provider.calls[0]) <= 300


def test_extrait_ecoute_dans_la_page_sans_telechargement():
    response = preview(make_client())
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert "content-disposition" not in response.headers
    assert MP3(io.BytesIO(response.content)).info.length > 0


def test_extrait_ne_consomme_pas_le_quota_de_generation():
    client = make_client(rate_limit_per_hour=1)
    for _ in range(3):
        assert preview(client).status_code == 200
    assert generate(client).status_code == 200


def test_extrait_limite_propre():
    client = make_client(preview_limit_per_hour=1)
    assert preview(client).status_code == 200
    response = preview(client)
    assert response.status_code == 429
    assert "extraits" in response.json()["detail"]
    assert generate(client).status_code == 200


def test_extrait_memes_validations_et_erreurs():
    assert preview(make_client(), text="   ").status_code == 400
    assert preview(make_client(), voice="en-US-Inconnue").status_code == 400
    assert preview(make_client(max_text_chars=5), text="Bonjour à tous.").status_code == 400
    assert preview(make_client(FailingProvider())).status_code == 502
