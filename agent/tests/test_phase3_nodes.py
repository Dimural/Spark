from dataclasses import dataclass

from agent.integrations import GoogleTokens
from agent.nodes import create_cal_event as create_cal_event_module
from agent.nodes.create_cal_event import create_cal_event
from agent.nodes.save_note import save_note
from agent.nodes.send_reminder import send_reminder


@dataclass
class FakeSupabase:
    user: dict
    inserted_events: list[dict]
    updated_tokens: list[GoogleTokens]

    def get_user(self, _: str) -> dict:
        return self.user

    def update_google_tokens(self, _: str, tokens: GoogleTokens) -> None:
        self.updated_tokens.append(tokens)

    def insert_event(self, **kwargs):
        self.inserted_events.append(kwargs)
        return {"id": f"event-{len(self.inserted_events)}"}


class FakeCalendar:
    def __init__(self):
        self.created_events = []
        self.refreshed_from = []

    def refresh_access_token(self, refresh_token: str) -> GoogleTokens:
        self.refreshed_from.append(refresh_token)
        return GoogleTokens(
            access_token="fresh-access",
            refresh_token=refresh_token,
            expires_at="2099-01-01T00:00:00+00:00",
        )

    def create_event(self, **kwargs):
        self.created_events.append(kwargs)
        return {"id": "google-123", "htmlLink": "https://calendar.google.com/event"}


class FakeReminder:
    def __init__(self):
        self.email_calls = []

    def send_email(self, **kwargs):
        self.email_calls.append(kwargs)
        return {"id": "email-123"}


def test_create_cal_event_refreshes_token_and_persists_event(monkeypatch):
    supabase = FakeSupabase(
        user={
            "id": "user-1",
            "google_access_token": "encrypted-access",
            "google_refresh_token": "encrypted-refresh",
            "token_expires_at": "2000-01-01T00:00:00+00:00",
        },
        inserted_events=[],
        updated_tokens=[],
    )
    calendar = FakeCalendar()

    monkeypatch.setattr(
        create_cal_event_module,
        "tokens_from_user_row",
        lambda _: GoogleTokens(
            access_token="stale-access",
            refresh_token="refresh-token",
            expires_at="2000-01-01T00:00:00+00:00",
        ),
    )
    monkeypatch.setattr(create_cal_event_module, "token_is_expired", lambda _: True)

    result = create_cal_event(
        {
            "user_id": "user-1",
            "user_timezone": "America/Toronto",
            "raw_text": "dentist appointment next tuesday 3pm",
            "parsed": {
                "title": "Dentist Appointment",
                "description": "Dentist appointment next Tuesday at 3pm",
                "date": "2026-04-07",
                "time": "15:00",
            },
        },
        supabase=supabase,
        calendar=calendar,
    )

    assert calendar.refreshed_from == ["refresh-token"]
    assert supabase.updated_tokens[0].access_token == "fresh-access"
    assert supabase.inserted_events[0]["event_type"] == "calendar_event"
    assert result["result"]["google_event_id"] == "google-123"


def test_send_reminder_sends_email_and_persists_event():
    supabase = FakeSupabase(
        user={"id": "user-1", "email": "user@example.com"},
        inserted_events=[],
        updated_tokens=[],
    )
    reminder = FakeReminder()

    result = send_reminder(
        {
            "user_id": "user-1",
            "raw_text": "follow up with design team",
            "parsed": {
                "title": "Follow up",
                "description": "Follow up with the design team",
            },
        },
        supabase=supabase,
        reminder=reminder,
    )

    assert reminder.email_calls[0]["to_email"] == "user@example.com"
    assert supabase.inserted_events[0]["event_type"] == "reminder"
    assert result["result"]["email_id"] == "email-123"


def test_save_note_persists_raw_note_and_type():
    supabase = FakeSupabase(
        user={},
        inserted_events=[],
        updated_tokens=[],
    )

    result = save_note(
        {
            "user_id": "user-1",
            "raw_text": "JWT tokens expire after one hour",
            "parsed": {
                "title": "JWT expiry",
                "description": "JWT tokens expire after one hour",
                "date": None,
                "time": None,
            },
        },
        supabase=supabase,
    )

    assert supabase.inserted_events[0]["event_type"] == "note"
    assert supabase.inserted_events[0]["raw_note"] == "JWT tokens expire after one hour"
    assert result["result"]["event_id"] == "event-1"
