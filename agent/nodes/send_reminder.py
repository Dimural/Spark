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

    sms_status = "skipped"
    phone_number = user.get("phone") or user.get("phone_number")

    if phone_number:
        reminder_client.send_sms(to_number=phone_number, body_text=message)
        sms_status = "sent"

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
            "sms_status": sms_status,
            "event_id": stored_event.get("id"),
        }
    }
