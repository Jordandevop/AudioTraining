"""Limite simple du nombre de générations par adresse IP (en mémoire)."""

import time
from collections import defaultdict, deque

WINDOW_SECONDS = 3600


class RateLimiter:
    def __init__(self, max_per_hour: int) -> None:
        self.max_per_hour = max_per_hour
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        """Enregistre une tentative et indique si elle est autorisée."""
        if self.max_per_hour <= 0:
            return True
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= self.max_per_hour:
            return False
        hits.append(now)
        return True
