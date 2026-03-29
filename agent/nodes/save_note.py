from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from ..integrations import SupabaseIntegration
from ..state import SparkState


def _resolve_event_date(parsed: dict[str, Any]) -> str | None:
    date_value = parsed.get("date")
    time_value = parsed.get("time")

    if not date_value:
        return None

    if "T" in str(date_value):
        resolved = datetime.fromisoformat(str(date_value).replace("Z", "+00:00"))

        if resolved.tzinfo is None:
            resolved = resolved.replace(tzinfo=UTC)

        return resolved.isoformat()

    if time_value:
        stamp = f"{date_value}T{time_value}"
    else:
        stamp = f"{date_value}T00:00:00"

    resolved = datetime.fromisoformat(stamp)

    if resolved.tzinfo is None:
        resolved = resolved.replace(tzinfo=UTC)

    return resolved.isoformat()


def save_note(
    state: SparkState,
    *,
    supabase: SupabaseIntegration | None = None,
) -> dict[str, dict[str, Any]]:
    supabase_client = supabase or SupabaseIntegration()
    parsed = state["parsed"]
    stored_event = supabase_client.insert_event(
        user_id=state["user_id"],
        event_type="note",
        title=parsed["title"],
        description=parsed.get("description"),
        raw_note=state.get("raw_text"),
        event_date=_resolve_event_date(parsed),
    )

    return {
        "result": {
            "status": "processed",
            "type": "note",
            "title": parsed["title"],
            "event_id": stored_event.get("id"),
        }
    }
