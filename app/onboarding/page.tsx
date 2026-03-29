import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase";

async function getGoogleConnectionState(userId: string) {
  const supabase = await getServerSupabaseClient();

  if (!supabase) {
    return false;
  }

  const { data } = await supabase
    .from("users")
    .select("google_access_token, google_refresh_token")
    .eq("id", userId)
    .maybeSingle();

  return Boolean(data?.google_access_token && data?.google_refresh_token);
}

export default async function OnboardingPage() {
  const supabase = await getServerSupabaseClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const googleConnected = await getGoogleConnectionState(user.id);

  return (
    <main className="dashboard-shell">
      <section className="dashboard-shell__header">
        <p className="section-kicker">Onboarding</p>
        <h1 className="dashboard-title">Set up Spark once, then stay inside your notes.</h1>
        <p className="dashboard-copy">
          The flow is simple: confirm your account, connect Google Calendar, then
          install the Shortcut that sends your latest Spark Inbox note into the agent.
        </p>
      </section>

      <section className="onboarding-grid">
        <article className="status-panel onboarding-step">
          <span className="onboarding-step__index">01</span>
          <h2>Account ready</h2>
          <p>{user.email}</p>
          <p>Your Spark account is active and ready to route notes.</p>
        </article>

        <article className="status-panel onboarding-step">
          <span className="onboarding-step__index">02</span>
          <h2>Connect Google Calendar</h2>
          <p>
            Spark needs calendar access to turn date-based notes into scheduled events.
          </p>
          <p>{googleConnected ? "Google Calendar is connected." : "Google Calendar is not connected yet."}</p>
          <Link className="primary-button" href="/api/auth/google">
            {googleConnected ? "Reconnect Google Calendar" : "Connect Google Calendar"}
          </Link>
        </article>

        <article className="status-panel onboarding-step">
          <span className="onboarding-step__index">03</span>
          <h2>Install the Spark Shortcut</h2>
          <p>
            Use the Shortcut distribution page to download the workflow and confirm the
            folder name, API endpoint, and user ID it should send.
          </p>
          <Link className="secondary-button" href="/onboarding/shortcut">
            Open Shortcut setup
          </Link>
        </article>
      </section>

      <section className="cta-banner onboarding-banner">
        <div>
          <span className="section-kicker">Next step</span>
          <h2>After setup, the dashboard becomes your running record of routed work.</h2>
        </div>
        <Link className="primary-button" href="/dashboard">
          Open dashboard
        </Link>
      </section>
    </main>
  );
}
