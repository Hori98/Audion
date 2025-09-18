import datetime as dt
import os

import pytest

from backend.models.schedule import DayOfWeek


# Import the helper from the unified audio router
from backend.routers.audio_unified import _calculate_next_generation_at


def _d(y, m, d, hh, mm):
    return dt.datetime(y, m, d, hh, mm)


def test_next_at_same_day_future_time_tokyo():
    # 2025-01-30 08:00 UTC -> 17:00 JST (UTC+9)
    now_utc = _d(2025, 1, 30, 8, 0)
    # Target 20:00 JST on Thursday (same day)
    next_at = _calculate_next_generation_at(
        generation_time="20:00",
        generation_days=[DayOfWeek.THURSDAY],
        timezone_name="Asia/Tokyo",
        now_utc=now_utc,
    )
    # Expect 2025-01-30 11:00 UTC (20:00 JST)
    assert next_at == _d(2025, 1, 30, 11, 0)


def test_next_at_same_day_past_time_roll_next_week():
    # 2025-01-30 12:00 UTC -> 21:00 JST
    now_utc = _d(2025, 1, 30, 12, 0)
    # Target 20:00 JST on Thursday (already passed)
    next_at = _calculate_next_generation_at(
        generation_time="20:00",
        generation_days=[DayOfWeek.THURSDAY],
        timezone_name="Asia/Tokyo",
        now_utc=now_utc,
    )
    # Next Thursday 20:00 JST -> 2025-02-06 11:00 UTC
    assert next_at == _d(2025, 2, 6, 11, 0)


def test_next_at_next_available_weekday():
    # 2025-01-30 (Thu) 00:00 UTC
    now_utc = _d(2025, 1, 30, 0, 0)
    # Allowed days: Friday only, time 09:15 local (JST)
    next_at = _calculate_next_generation_at(
        generation_time="09:15",
        generation_days=[DayOfWeek.FRIDAY],
        timezone_name="Asia/Tokyo",
        now_utc=now_utc,
    )
    # Friday is 2025-01-31; 09:15 JST -> 00:15 UTC
    assert next_at == _d(2025, 1, 31, 0, 15)

