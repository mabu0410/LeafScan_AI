from __future__ import annotations

import time
from datetime import datetime
from typing import Any

import httpx

from app.config import (
    HOME_WEATHER_CACHE_TTL_SECONDS,
    HOME_WEATHER_LAT,
    HOME_WEATHER_LOCATION,
    HOME_WEATHER_LON,
)


_WEATHER_CACHE: dict[str, Any] = {
    "expires_at": 0.0,
    "data": None,
}


WEATHER_CODE_LABELS: dict[int, str] = {
    0: "Trời quang",
    1: "Ít mây",
    2: "Có mây",
    3: "Nhiều mây",
    45: "Sương mù",
    48: "Sương mù đóng băng",
    51: "Mưa phùn nhẹ",
    53: "Mưa phùn",
    55: "Mưa phùn dày",
    56: "Mưa phùn lạnh nhẹ",
    57: "Mưa phùn lạnh",
    61: "Mưa nhỏ",
    63: "Mưa vừa",
    65: "Mưa lớn",
    66: "Mưa lạnh nhẹ",
    67: "Mưa lạnh",
    71: "Tuyết nhẹ",
    73: "Tuyết vừa",
    75: "Tuyết dày",
    77: "Mưa tuyết",
    80: "Mưa rào nhẹ",
    81: "Mưa rào",
    82: "Mưa rào mạnh",
    85: "Mưa tuyết rào nhẹ",
    86: "Mưa tuyết rào mạnh",
    95: "Dông",
    96: "Dông kèm mưa đá nhẹ",
    99: "Dông kèm mưa đá mạnh",
}


def _empty_weather() -> dict[str, Any]:
    return {
        "location": HOME_WEATHER_LOCATION,
        "temperature_c": None,
        "humidity_percent": None,
        "wind_speed_kmh": None,
        "condition": "Không có dữ liệu",
        "weather_code": None,
        "observed_at": None,
    }


def _parse_observed_at(raw: Any) -> datetime | None:
    if not isinstance(raw, str) or not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def fetch_current_weather() -> dict[str, Any]:
    """Lấy thời tiết hiện tại từ Open-Meteo, có cache và fallback rỗng."""
    now = time.time()
    cached = _WEATHER_CACHE.get("data")
    if cached and float(_WEATHER_CACHE.get("expires_at", 0.0)) > now:
        return cached

    try:
        response = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": HOME_WEATHER_LAT,
                "longitude": HOME_WEATHER_LON,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                "timezone": "auto",
            },
            timeout=5.0,
        )
        response.raise_for_status()
        payload = response.json()
        current = payload.get("current") or {}
        weather_code = current.get("weather_code")
        weather_code_int = int(weather_code) if weather_code is not None else None
        data = {
            "location": HOME_WEATHER_LOCATION,
            "temperature_c": current.get("temperature_2m"),
            "humidity_percent": current.get("relative_humidity_2m"),
            "wind_speed_kmh": current.get("wind_speed_10m"),
            "condition": WEATHER_CODE_LABELS.get(weather_code_int or -1, "Không xác định"),
            "weather_code": weather_code_int,
            "observed_at": _parse_observed_at(current.get("time")),
        }
    except Exception:
        data = _empty_weather()

    _WEATHER_CACHE["data"] = data
    _WEATHER_CACHE["expires_at"] = now + max(60, HOME_WEATHER_CACHE_TTL_SECONDS)
    return data
