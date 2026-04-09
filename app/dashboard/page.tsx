import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardEventFeed } from "@/components/dashboard-event-feed";
import { SignOutButton } from "@/components/sign-out-button";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { getServerSupabaseClient } from "@/lib/supabase";

async function getDashboardData() {
  const supabase = await getServerSupabaseClient();

  if (!supabase) {
    return { connected: false, events: [], summary: null, user: null };
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user ?? null;

  if (!user) {
    return { connected: false, events: [], summary: null, user: null };
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
  const { connected, events, summary, user } = await getDashboardData();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-shell__header ui-fade-in">
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

      <section className="dashboard-shell__grid ui-fade-in ui-fade-in--2">
        <article className="status-panel">
          <h2>Account</h2>
          <p>{user.email}</p>
        </article>

        <article className="status-panel">
          <h2>Google Calendar</h2>
          <p>
            {connected || googleStatus === "connected"
              ? "Google Calendar is connected."
              : "Connect Google so Spark can create calendar events from your notes."}
          </p>
          {googleStatus === "error" && googleError ? (
            <p className="auth-error">{googleError}</p>
          ) : null}
          <Link className="primary-button" href="/api/auth/google">
            {connected || googleStatus === "connected"
              ? "Reconnect Google Calendar"
              : "Connect Google Calendar"}
          </Link>
        </article>
      </section>

      <DashboardEventFeed initialEvents={events} initialSummary={summary} />
    </main>
  );
}
