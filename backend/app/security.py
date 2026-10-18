"""En-têtes de sécurité, taille maximale des requêtes et adresse IP du visiteur."""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Le site n'utilise que ses propres fichiers ; l'audio est lu depuis des URL blob:.
CONTENT_SECURITY_POLICY = "; ".join([
    "default-src 'self'",
    "img-src 'self' data:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])

SECURITY_HEADERS = {
    "content-security-policy": CONTENT_SECURITY_POLICY,
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "cross-origin-opener-policy": "same-origin",
}

TOO_LARGE = "Requête trop volumineuse. Raccourcissez le texte."


class SecurityMiddleware:
    """Ajoute les en-têtes de sécurité et refuse les corps de requête trop gros.

    La limite protège la mémoire du serveur gratuit : sans elle, un envoi
    de plusieurs centaines de Mo serait lu en entier avant d'être refusé.
    """

    def __init__(self, app: ASGIApp, max_body_bytes: int) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                present = {name.lower() for name, _ in message.get("headers", [])}
                extra = [
                    (name.encode(), value.encode())
                    for name, value in SECURITY_HEADERS.items()
                    if name.encode() not in present
                ]
                message["headers"] = [*message.get("headers", []), *extra]
            await send(message)

        length = dict(scope["headers"]).get(b"content-length", b"0")
        if not length.isdigit() or int(length) > self.max_body_bytes:
            response = JSONResponse({"detail": TOO_LARGE}, status_code=413)
            await response(scope, receive, send_with_headers)
            return

        # Corps envoyé par morceaux (sans Content-Length) : on compte au fil de l'eau.
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body_bytes:
                    raise HTTPException(413, TOO_LARGE)
            return message

        await self.app(scope, limited_receive, send_with_headers)


def client_ip(request: Request) -> str:
    """Adresse du visiteur, pour les limites de requêtes.

    Derrière Cloudflare (utilisé par Render), l'adresse réelle est dans
    CF-Connecting-IP, réécrit par Cloudflare (un visiteur ne peut pas la falsifier).
    Sinon, on prend l'adresse fournie par uvicorn (--proxy-headers).
    Les limites globales (toutes adresses confondues) bornent les abus dans tous les cas.
    """
    forwarded = request.headers.get("cf-connecting-ip", "").strip()
    if forwarded:
        return forwarded
    return request.client.host if request.client else "inconnu"
