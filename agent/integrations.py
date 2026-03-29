from __future__ import annotations

import base64
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib import error, parse, request


TOKEN_STORE_VERSION = "v1"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
RESEND_EMAIL_URL = "https://api.resend.com/emails"


def _require_env(key: str) -> str:
    value = os.getenv(key, "").strip()

    if not value:
        raise RuntimeError(f"{key} is required for Phase 3 integrations.")

    return value


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _request_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> Any:
    req = request.Request(url, method=method, headers=headers or {}, data=body)

    try:
        with request.urlopen(req) as response:
            payload = response.read().decode("utf-8")
    except error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed with {exc.code}: {payload}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc.reason}") from exc

    if not payload:
        return None

    return json.loads(payload)


def _import_aesgcm():
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "The 'cryptography' package is required to encrypt and decrypt OAuth tokens."
        ) from exc

    return AESGCM


@dataclass
class GoogleTokens:
    access_token: str
    refresh_token: str
    expires_at: str


class TokenStore:
    @staticmethod
    def _derive_key() -> bytes:
        secret = _require_env("TOKEN_ENCRYPTION_KEY").encode("utf-8")
        return hashlib.sha256(secret).digest()

    @classmethod
    def encrypt(cls, plain_text: str) -> str:
        AESGCM = _import_aesgcm()
        nonce = os.urandom(12)
        aesgcm = AESGCM(cls._derive_key())
        encrypted = aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
        payload = base64.b64encode(nonce + encrypted).decode("utf-8")
        return f"{TOKEN_STORE_VERSION}:{payload}"

    @classmethod
    def decrypt(cls, encrypted_text: str) -> str:
        version, payload = encrypted_text.split(":", 1)

        if version != TOKEN_STORE_VERSION:
            raise RuntimeError("Unsupported token version in storage.")

        AESGCM = _import_aesgcm()
        raw = base64.b64decode(payload.encode("utf-8"))
        nonce = raw[:12]
        ciphertext = raw[12:]
        aesgcm = AESGCM(cls._derive_key())
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")


class SupabaseIntegration:
    def __init__(self) -> None:
        base_url = _require_env("NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
        service_key = _require_env("SUPABASE_SERVICE_ROLE_KEY")
        self.base_headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        }
        self.rest_url = f"{base_url}/rest/v1"

    def get_user(self, user_id: str) -> dict[str, Any]:
        query = parse.urlencode({"id": f"eq.{user_id}", "select": "*"})
        response = _request_json(
            f"{self.rest_url}/users?{query}",
            headers={**self.base_headers, "Accept": "application/json"},
        )

        if not response:
            raise RuntimeError(f"No user found for id {user_id}.")

        return response[0]

    def update_google_tokens(self, user_id: str, tokens: GoogleTokens) -> None:
        body = json.dumps(
            {
                "google_access_token": TokenStore.encrypt(tokens.access_token),
                "google_refresh_token": TokenStore.encrypt(tokens.refresh_token),
                "token_expires_at": tokens.expires_at,
            }
        ).encode("utf-8")
        query = parse.urlencode({"id": f"eq.{user_id}"})
        _request_json(
            f"{self.rest_url}/users?{query}",
            method="PATCH",
            headers={
                **self.base_headers,
                "Prefer": "return=minimal",
            },
            body=body,
        )

    def insert_event(
        self,
        *,
        user_id: str,
        event_type: str,
        title: str,
        description: str | None,
        raw_note: str | None,
        event_date: str | None,
        status: str = "processed",
    ) -> dict[str, Any]:
        body = json.dumps(
            {
                "user_id": user_id,
                "type": event_type,
                "title": title,
                "description": description,
                "raw_note": raw_note,
                "event_date": event_date,
                "status": status,
            }
        ).encode("utf-8")

        response = _request_json(
            f"{self.rest_url}/events",
            method="POST",
            headers={
                **self.base_headers,
                "Prefer": "return=representation",
            },
            body=body,
        )

        if not response:
            raise RuntimeError("Supabase did not return the inserted event.")

        return response[0]


class GoogleCalendarIntegration:
    def __init__(self) -> None:
        self.client_id = _require_env("GOOGLE_CLIENT_ID")
        self.client_secret = _require_env("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = _require_env("GOOGLE_REDIRECT_URI")

    def refresh_access_token(self, refresh_token: str) -> GoogleTokens:
        body = parse.urlencode(
            {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            }
        ).encode("utf-8")
        response = _request_json(
            GOOGLE_TOKEN_URL,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            body=body,
        )

        return GoogleTokens(
            access_token=response["access_token"],
            refresh_token=refresh_token,
            expires_at=(_utc_now() + timedelta(seconds=response["expires_in"])).isoformat(),
        )

    def create_event(
        self,
        *,
        access_token: str,
        title: str,
        description: str | None,
        start_at: str,
        end_at: str,
        timezone: str,
    ) -> dict[str, Any]:
        body = json.dumps(
            {
                "summary": title,
                "description": description,
                "start": {"dateTime": start_at, "timeZone": timezone},
                "end": {"dateTime": end_at, "timeZone": timezone},
            }
        ).encode("utf-8")
        return _request_json(
            GOOGLE_CALENDAR_URL,
            method="POST",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            body=body,
        )


class ReminderIntegration:
    def __init__(self) -> None:
        self.resend_api_key = _require_env("RESEND_API_KEY")
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        self.twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER", "").strip()

    def send_email(self, *, to_email: str, subject: str, text: str) -> dict[str, Any]:
        body = json.dumps(
            {
                "from": "Spark <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "text": text,
            }
        ).encode("utf-8")
        return _request_json(
            RESEND_EMAIL_URL,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.resend_api_key}",
                "Content-Type": "application/json",
            },
            body=body,
        )

    def send_sms(self, *, to_number: str, body_text: str) -> dict[str, Any]:
        if (
            not self.twilio_account_sid
            or not self.twilio_auth_token
            or not self.twilio_phone_number
        ):
            raise RuntimeError("Twilio credentials are incomplete.")

        auth = base64.b64encode(
            f"{self.twilio_account_sid}:{self.twilio_auth_token}".encode("utf-8")
        ).decode("utf-8")
        body = parse.urlencode(
            {
                "To": to_number,
                "From": self.twilio_phone_number,
                "Body": body_text,
            }
        ).encode("utf-8")

        return _request_json(
            f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_account_sid}/Messages.json",
            method="POST",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body=body,
        )


def tokens_from_user_row(user: dict[str, Any]) -> GoogleTokens:
    access = user.get("google_access_token")
    refresh = user.get("google_refresh_token")

    if not access or not refresh:
        raise RuntimeError("Google Calendar is not connected for this user.")

    return GoogleTokens(
        access_token=TokenStore.decrypt(access),
        refresh_token=TokenStore.decrypt(refresh),
        expires_at=user.get("token_expires_at") or _utc_now().isoformat(),
    )


def token_is_expired(expires_at: str | None) -> bool:
    if not expires_at:
        return True

    return datetime.fromisoformat(expires_at.replace("Z", "+00:00")) <= _utc_now() + timedelta(
        minutes=1
    )
