import asyncio

from fastapi.testclient import TestClient

from app.rate_limit import CLEANUP_THRESHOLD, RateLimiter
from tests.test_api import generate, make_client, preview


def test_entetes_de_securite_sur_toutes_les_reponses(tmp_path):
    (tmp_path / "index.html").write_text("<h1>AudioTraining</h1>")
    from app.config import Settings
    from app.main import create_app
    from app.tts.fake import FakeTTSProvider

    client = TestClient(create_app(Settings(frontend_dist=tmp_path), FakeTTSProvider()))
    for response in (client.get("/"), client.get("/health"), generate(client), client.get("/inexistant")):
        headers = response.headers
        assert "frame-ancestors 'none'" in headers["content-security-policy"]
        assert "media-src 'self' blob:" in headers["content-security-policy"]
        assert headers["x-content-type-options"] == "nosniff"
        assert headers["x-frame-options"] == "DENY"
        assert headers["referrer-policy"] == "no-referrer"
        assert "strict-transport-security" in headers


def test_requete_trop_volumineuse_refusee():
    client = make_client(max_text_chars=100)
    response = client.post(
        "/api/audio/generate",
        content=b'{"text": "' + b"a" * 10_000 + b'"}',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert "volumineuse" in response.json()["detail"]


def test_requete_par_morceaux_trop_volumineuse_refusee():
    client = make_client(max_text_chars=100)

    def chunks():
        yield b'{"text": "'
        for _ in range(20):
            yield b"a" * 1000
        yield b'"}'

    response = client.post(
        "/api/audio/generate", content=chunks(), headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 413


def test_documentation_api_desactivee_par_defaut():
    assert make_client().get("/api/docs").status_code == 404
    assert make_client().get("/api/openapi.json").status_code == 404
    assert make_client(enable_api_docs=True).get("/api/docs").status_code == 200


def test_ip_cloudflare_utilisee_pour_les_limites():
    client = make_client(rate_limit_per_hour=1)
    assert generate(client, **{}).status_code == 200
    # Même machine, mais deux visiteurs différents vus par Cloudflare.
    other = client.post(
        "/api/audio/generate", json={"text": "Bonjour."}, headers={"CF-Connecting-IP": "203.0.113.7"}
    )
    assert other.status_code == 200
    again = client.post(
        "/api/audio/generate", json={"text": "Bonjour."}, headers={"CF-Connecting-IP": "203.0.113.7"}
    )
    assert again.status_code == 429


def test_limite_globale_toutes_adresses_confondues():
    client = make_client(global_limit_per_hour=2)
    for ip in ("198.51.100.1", "198.51.100.2"):
        response = client.post(
            "/api/audio/generate", json={"text": "Bonjour."}, headers={"CF-Connecting-IP": ip}
        )
        assert response.status_code == 200
    response = client.post(
        "/api/audio/generate", json={"text": "Bonjour."}, headers={"CF-Connecting-IP": "198.51.100.3"}
    )
    assert response.status_code == 429
    assert "sollicité" in response.json()["detail"]


def test_limite_globale_des_extraits():
    client = make_client(global_preview_limit_per_hour=1)
    assert preview(client).status_code == 200
    assert preview(client, text="Autre.").status_code == 429


class BlockingProvider:
    def __init__(self) -> None:
        self.release = asyncio.Event()

    async def synthesize(self, text, voice, rate):
        await self.release.wait()
        from app.audio import silence

        return silence(0.1)


def test_serveur_occupe_au_dela_des_generations_simultanees():
    async def scenario():
        import httpx

        from app.config import Settings
        from app.main import create_app
        from pathlib import Path

        provider = BlockingProvider()
        app = create_app(
            Settings(frontend_dist=Path("/inexistant"), max_concurrent_generations=1), provider
        )
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            first = asyncio.create_task(client.post("/api/audio/generate", json={"text": "Un."}))
            await asyncio.sleep(0.05)
            second = await client.post("/api/audio/generate", json={"text": "Deux."})
            provider.release.set()
            return (await first).status_code, second.status_code, second.json()["detail"]

    first, second, detail = asyncio.run(scenario())
    assert (first, second) == (200, 503)
    assert "occupé" in detail


def test_limiteur_purge_les_adresses_inactives(monkeypatch):
    limiter = RateLimiter(5)
    clock = [0.0]
    monkeypatch.setattr("app.rate_limit.time.monotonic", lambda: clock[0])
    for i in range(CLEANUP_THRESHOLD + 1):
        limiter.allow(f"ip-{i}")
    clock[0] = 4000.0  # plus d'une heure plus tard
    limiter.allow("nouvelle")
    assert len(limiter._hits) == 1
