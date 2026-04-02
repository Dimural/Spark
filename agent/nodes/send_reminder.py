from __future__ import annotations

from typing import Any

from ..integrations import ReminderIntegration, SupabaseIntegration
from ..state import SparkState


def send_reminder(
    state: SparkState,
    *,
    supabase: SupabaseIntegration | None = None,
    reminder: ReminderIntegration | None = None,
) -> dict[str, dict[str, Any]]:
    supabase_client = supabase or SupabaseIntegration()
    reminder_client = reminder or ReminderIntegration()
    user = supabase_client.get_user(state["user_id"])
    parsed = state["parsed"]
    title = parsed["title"]
    description = parsed.get("description") or title
    message = f"Spark reminder: {description}"
    email_result = reminder_client.send_email(
        to_email=user["email"],
        subject=title,
        text=message,
    )

    stored_event = supabase_client.insert_event(
        user_id=state["user_id"],
        event_type="reminder",
        title=title,
        description=description,
        raw_note=state.get("raw_text"),
        event_date=None,
    )

    return {
        "result": {
            "status": "processed",
            "type": "reminder",
            "title": title,
            "email_id": email_result.get("id"),
            "event_id": stored_event.get("id"),
        }
    }
