from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from ..integrations import (
    GoogleCalendarIntegration,
    SupabaseIntegration,
    token_is_expired,
    tokens_from_user_row,
)
from ..state import SparkState


def _parse_event_window(parsed: dict[str, Any]) -> tuple[str, str]:
    date_value = parsed.get("date")
    time_value = parsed.get("time") or "09:00"

    if not date_value:
        raise RuntimeError("Calendar events require a resolved date.")

    if "T" in str(date_value):
        start = datetime.fromisoformat(str(date_value).replace("Z", "+00:00"))
    else:
        start = datetime.fromisoformat(f"{date_value}T{time_value}")

    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)

    end = start + timedelta(hours=1)
    return start.isoformat(), end.isoformat()


def create_cal_event(
    state: SparkState,
    *,
    supabase: SupabaseIntegration | None = None,
    calendar: GoogleCalendarIntegration | None = None,
) -> dict[str, dict[str, Any]]:
    supabase_client = supabase or SupabaseIntegration()
    calendar_client = calendar or GoogleCalendarIntegration()
    user = supabase_client.get_user(state["user_id"])
    tokens = tokens_from_user_row(user)

    if token_is_expired(tokens.expires_at):
        tokens = calendar_client.refresh_access_token(tokens.refresh_token)
        supabase_client.update_google_tokens(state["user_id"], tokens)

    parsed = state["parsed"]
    timezone_name = state.get("user_timezone", "UTC")
    start_at, end_at = _parse_event_window(parsed)
    calendar_event = calendar_client.create_event(
        access_token=tokens.access_token,
        title=parsed["title"],
        description=parsed.get("description"),
        start_at=start_at,
        end_at=end_at,
        timezone=timezone_name,
    )
    stored_event = supabase_client.insert_event(
        user_id=state["user_id"],
        event_type="calendar_event",
        title=parsed["title"],
        description=parsed.get("description"),
        raw_note=state.get("raw_text"),
        event_date=start_at,
    )

    return {
        "result": {
            "status": "processed",
            "type": "calendar_event",
            "title": parsed["title"],
            "google_event_id": calendar_event.get("id"),
            "google_event_link": calendar_event.get("htmlLink"),
            "event_id": stored_event.get("id"),
        }
    }
