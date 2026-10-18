"""Limite simple du nombre de générations par adresse IP (en mémoire)."""

import time
from collections import defaultdict, deque

WINDOW_SECONDS = 3600
CLEANUP_THRESHOLD = 10_000  # au-delà, on purge les adresses inactives


class RateLimiter:
    def __init__(self, max_per_hour: int) -> None:
        self.max_per_hour = max_per_hour
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        """Enregistre une tentative et indique si elle est autorisée."""
        if self.max_per_hour <= 0:
            return True
        now = time.monotonic()
        if len(self._hits) > CLEANUP_THRESHOLD:
            self._cleanup(now)
        hits = self._hits[key]
        while hits and now - hits[0] > WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= self.max_per_hour:
            return False
        hits.append(now)
        return True

    def _cleanup(self, now: float) -> None:
        """Oublie les adresses sans tentative depuis plus d'une heure (mémoire bornée)."""
        stale = [key for key, hits in self._hits.items() if not hits or now - hits[-1] > WINDOW_SECONDS]
        for key in stale:
            del self._hits[key]
