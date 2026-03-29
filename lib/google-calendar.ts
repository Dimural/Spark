import { decryptToken, encryptToken } from "./token-store";

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

type StoredGoogleTokens = {
  google_access_token: string | null;
  google_refresh_token: string | null;
  token_expires_at: string | null;
};

type GoogleTokenExchangeResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleCalendarEvent = {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
};

function requireGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth environment variables are missing.");
  }

  return { clientId, clientSecret, redirectUri };
}

function getExpiresAt(expiresIn: number) {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

async function exchangeGoogleToken(params: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed: ${errorText}`);
  }

  return (await response.json()) as GoogleTokenExchangeResponse;
}

export function buildGoogleOAuthUrl(state?: string) {
  const { clientId, redirectUri } = requireGoogleEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.events",
  });

  if (state) {
    params.set("state", state);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForGoogleTokens(code: string): Promise<GoogleOAuthTokens> {
  const { clientId, clientSecret, redirectUri } = requireGoogleEnv();
  const payload = await exchangeGoogleToken(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  );

  if (!payload.refresh_token) {
    throw new Error("Google did not return a refresh token. Reconnect with consent.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: getExpiresAt(payload.expires_in),
  };
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireGoogleEnv();
  const payload = await exchangeGoogleToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  );

  return {
    accessToken: payload.access_token,
    expiresAt: getExpiresAt(payload.expires_in),
  };
}

export function parseStoredGoogleTokens(tokens: StoredGoogleTokens) {
  if (!tokens.google_access_token || !tokens.google_refresh_token) {
    return null;
  }

  return {
    accessToken: decryptToken(tokens.google_access_token),
    refreshToken: decryptToken(tokens.google_refresh_token),
    expiresAt: tokens.token_expires_at,
  };
}

export function serializeGoogleTokens(tokens: GoogleOAuthTokens) {
  return {
    google_access_token: encryptToken(tokens.accessToken),
    google_refresh_token: encryptToken(tokens.refreshToken),
    token_expires_at: tokens.expiresAt,
  };
}

export function isGoogleAccessTokenExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return true;
  }

  return new Date(expiresAt).getTime() <= Date.now() + 60_000;
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEvent,
) {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar event creation failed: ${errorText}`);
  }

  return response.json();
}
