import Link from "next/link";
import { getEnvStatus } from "@/lib/env";
import { getServerSupabaseClient } from "@/lib/supabase";

export default async function DashboardPage() {
  const envStatus = getEnvStatus();
  const supabase = await getServerSupabaseClient();
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;

  return (
    <main className="dashboard-shell">
      <section className="dashboard-shell__header">
        <p className="section-kicker">Dashboard</p>
        <h1 className="dashboard-title">Spark Phase 1 foundation</h1>
        <p className="dashboard-copy">
          This shell is ready for auth and data wiring. Add your keys to
          `.env.local`, run the Supabase migration, and the Phase 1 plumbing is
          in place.
        </p>
      </section>

      <section className="dashboard-shell__grid">
        <article className="status-panel">
          <h2>Auth status</h2>
          <p>{user ? `Signed in as ${user.email}` : "No active session yet."}</p>
          <Link className="primary-button" href="/login">
            Open login
          </Link>
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
            The SQL migration for `users`, `events`, and `api_calls` is included
            and ready to run in your Supabase project.
          </p>
          <p>Next phases can build on this without reshaping the foundation.</p>
        </article>
      </section>
    </main>
  );
}
