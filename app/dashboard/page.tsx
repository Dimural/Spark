import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardEventFeed } from "@/components/dashboard-event-feed";
import { SignOutButton } from "@/components/sign-out-button";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { getEnvStatus } from "@/lib/env";
import { getServerSupabaseClient } from "@/lib/supabase";

async function getDashboardData() {
  const envStatus = getEnvStatus();
  const supabase = await getServerSupabaseClient();

  if (!supabase) {
    return {
      envStatus,
      connected: false,
      events: [],
      summary: null,
      user: null,
    };
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user ?? null;

  if (!user) {
    return {
      envStatus,
      connected: false,
      events: [],
      summary: null,
      user: null,
    };
  }

  const [{ data: userRow }, snapshot] = await Promise.all([
    supabase
      .from("users")
      .select("google_access_token, google_refresh_token")
      .eq("id", user.id)
      .maybeSingle(),
    getDashboardSnapshot(supabase),
  ]);

  return {
    envStatus,
    connected: Boolean(userRow?.google_access_token && userRow?.google_refresh_token),
    events: snapshot.events,
    summary: snapshot.summary,
    user,
  };
}

type DashboardPageProps = {
  searchParams?: Promise<{
    google?: string;
    error?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const googleStatus = params.google;
  const googleError = params.error;
  const { envStatus, connected, events, summary, user } = await getDashboardData();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-shell__header">
        <p className="section-kicker">Dashboard</p>
        <h1 className="dashboard-title">Your routed notes, reminders, and calendar actions.</h1>
        <p className="dashboard-copy">
          Spark keeps the note-taking habit lightweight, then shows the structured
          outcomes in one place after each Shortcut run.
        </p>
        <div className="dashboard-header-actions">
          <Link className="secondary-button dashboard-action" href="/onboarding">
            Open onboarding
          </Link>
          <Link className="primary-button dashboard-action" href="/onboarding/shortcut">
            Install Shortcut
          </Link>
          <SignOutButton />
        </div>
      </section>

      <section className="dashboard-shell__grid">
        <article className="status-panel">
          <h2>Auth status</h2>
          <p>{`Signed in as ${user.email}`}</p>
          <p>{`Ready to process notes for user ID ${user.id}.`}</p>
        </article>

        <article className="status-panel">
          <h2>Environment readiness</h2>
          {envStatus.missingAll.length === 0 ? (
            <p>All required environment variables are present.</p>
          ) : (
            <>
              <p>Add these values to `.env.local` before enabling the full app:</p>
              <ul className="status-list">
                {envStatus.missingAll.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </>
          )}
        </article>

        <article className="status-panel">
          <h2>Supabase setup</h2>
          <p>
            Spark is now reading processed items from the `events` table and exposing
            them through the authenticated `/api/events` route.
          </p>
          <p>Every routed note keeps the original `raw_note` for the later RAG phase.</p>
        </article>

        <article className="status-panel">
          <h2>Google Calendar</h2>
          <p>
            Connect Google so Spark can create calendar events from routed
            notes.
          </p>
          {connected || googleStatus === "connected" ? (
            <p>Google Calendar is connected for this account.</p>
          ) : null}
          {googleStatus === "error" && googleError ? <p>{googleError}</p> : null}
          <Link className="primary-button" href="/api/auth/google">
            Connect Google Calendar
          </Link>
        </article>
      </section>

      <DashboardEventFeed initialEvents={events} initialSummary={summary} />
    </main>
  );
}
