"""
Simple in-memory rate limiting helpers.

Lưu ý:
- Phù hợp môi trường single-process/mức tải vừa.
- Nếu scale nhiều worker, nên thay bằng Redis-based rate limiter.
"""
from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, status


_BUCKETS: defaultdict[str, deque[float]] = defaultdict(deque)
_LOCK = Lock()


def check_rate_limit(bucket_key: str, limit: int, window_seconds: int) -> None:
    """Raise 429 nếu vượt quá `limit` request trong `window_seconds`."""
    now = monotonic()
    window_start = now - window_seconds

    with _LOCK:
        bucket = _BUCKETS[bucket_key]
        while bucket and bucket[0] <= window_start:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít giây.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)
