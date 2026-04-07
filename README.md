# Spark

Spark turns messy Apple Notes into action.

Write the way you already think, tap once from a home screen Shortcut, and let Spark route the result into a calendar event, an email reminder, or a saved note in your dashboard.

## What It Does

- Accepts raw note text from an Apple Shortcut via `POST /api/ingest-note`
- Runs a LangGraph agent to parse and classify the note
- Routes the output into one of three outcomes:
  - Google Calendar event
  - Resend email reminder
  - Structured note stored in Supabase
- Shows processed items in a Next.js dashboard

## Stack

- Next.js 15 app router
- TypeScript
- Supabase Auth + Postgres
- LangGraph + Groq
- Google Calendar API
- Resend
- Upstash Redis

## Repository Layout

```text
app/
  (auth)/                  Login and auth callback pages
  api/                     Ingest, events, and Google OAuth routes
  dashboard/               Logged-in product UI
  onboarding/              Setup flow and Shortcut instructions
agent/
  nodes/                   LangGraph nodes
  graph.py                 Graph wiring
  integrations.py          Supabase, Calendar, and reminder integrations
  run_agent.py             CLI entrypoint used by the Next.js app
lib/
  agent-runner.ts          Spawns the Python agent
  google-calendar.ts       Google OAuth and Calendar helpers
  rate-limit.ts            Upstash-backed rate limiting
  token-store.ts           OAuth token encryption
supabase/migrations/
  0001_initial_schema.sql  Initial schema and RLS policies
```

## Current Product Flow

1. A user writes a note in Apple Notes.
2. A Shortcut sends the latest note from the Spark inbox to `/api/ingest-note`.
3. The API authenticates the request, checks rate limits, and invokes the Python agent.
4. The agent parses the note, classifies intent, and runs the matching integration node.
5. Spark stores the outcome and returns a normalized result to the client.

## LangGraph Routing

The agent currently routes every input into exactly one category:

- `calendar_event`
- `reminder`
- `note`

The main graph lives in [`agent/graph.py`](/Users/dimural/Spark/agent/graph.py) and the node prompts live in [`agent/prompts.py`](/Users/dimural/Spark/agent/prompts.py).

## Local Setup

### 1. Install dependencies

```bash
npm ci
python3 -m venv agent/.venv
agent/.venv/bin/pip install -r agent/requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and provide values for:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GROQ_API_KEY=
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_SHORTCUT_URL=
```

### 3. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Useful Commands

```bash
npm run dev
npm run lint
npm run build
agent/.venv/bin/pytest agent/tests
```

## API Surface

### `POST /api/ingest-note`

Authenticated ingest endpoint for Shortcut submissions.

Request body:

```json
{
  "text": "tomorrow morning remind me to send the deck",
  "user_id": "user-uuid"
}
```

### `GET /api/events`

Returns the current user's processed items. Supports `?type=calendar_event|reminder|note`.

### `GET /api/events/summary`

Returns dashboard summary metrics for the authenticated user.

### `GET /api/auth/google`

Starts Google OAuth or handles the callback when a `code` query parameter is present.

## Security Notes

- OAuth tokens are encrypted before they are stored
- LLM calls stay server-side
- Supabase tables use row-level security
- Ingest requests are rate-limited before the agent runs

## Status

Working now:

- Landing page
- Onboarding pages
- Dashboard UI
- Google OAuth route
- Ingest API
- Event listing API
- LangGraph parsing and classification
- Calendar, reminder, and note nodes
- Unit tests for agent nodes
- CI workflow for lint, build, and agent tests

Still expected before a production launch:

- End-to-end live integration validation against real external services
- More complete dashboard analytics and UX hardening
- Production deployment and secrets configuration

## Development Notes

- The Python agent is invoked from Next.js through [`lib/agent-runner.ts`](/Users/dimural/Spark/lib/agent-runner.ts).
- If `agent/.venv/bin/python` is unavailable, the runner falls back to `python3`.
- The authoritative project context is also captured in [`SPARK_CONTEXT.md`](/Users/dimural/Spark/SPARK_CONTEXT.md), though that file is currently ignored by git in this repo.

## License

No license file is present yet. Treat the repository as private unless that changes.
