"""Faux fournisseur : renvoie du silence. Pour les tests et le mode démo."""

from ..audio import silence

CHARS_PER_SECOND = 15


class FakeTTSProvider:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def synthesize(self, text: str, voice: str, rate: int) -> bytes:
        self.calls.append(text)
        return silence(max(len(text) / CHARS_PER_SECOND, 0.1))
