import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/supabase";

function getShortcutDownloadUrl() {
  return process.env.NEXT_PUBLIC_SHORTCUT_URL?.trim() || "";
}

async function getAppOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") || "http";

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
}

export default async function ShortcutPage() {
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

  const origin = await getAppOrigin();
  const downloadUrl = getShortcutDownloadUrl();
  const ingestUrl = origin ? `${origin}/api/ingest-note` : "/api/ingest-note";

  return (
    <main className="dashboard-shell">
      <section className="dashboard-shell__header">
        <p className="section-kicker">Shortcut</p>
        <h1 className="dashboard-title">Install the Apple Shortcut that powers Spark Inbox.</h1>
        <p className="dashboard-copy">
          The Shortcut reads the latest note in your Spark Inbox folder and posts it to
          your authenticated ingest endpoint with your stored user ID.
        </p>
      </section>

      <section className="shortcut-layout">
        <article className="status-panel shortcut-panel shortcut-panel--dark">
          <p className="signal-card__label">Shortcut configuration</p>
          <h2>Spark Inbox</h2>
          <div className="shortcut-config">
            <div>
              <span>Folder</span>
              <strong>Spark Inbox</strong>
            </div>
            <div>
              <span>POST URL</span>
              <strong>{ingestUrl}</strong>
            </div>
            <div>
              <span>User ID</span>
              <strong>{user.id}</strong>
            </div>
          </div>
        </article>

        <article className="status-panel shortcut-panel">
          <h2>Install flow</h2>
          <div className="shortcut-steps">
            <p>1. Download the Shortcut on your iPhone or iPad.</p>
            <p>2. Confirm the Apple Notes folder is named `Spark Inbox`.</p>
            <p>3. Store the API URL and your user ID in the Shortcut once.</p>
            <p>4. Add it to your Home Screen for one-tap capture.</p>
          </div>

          {downloadUrl ? (
            <a className="primary-button" href={downloadUrl}>
              Download Spark Shortcut
            </a>
          ) : (
            <div className="env-card">
              <h2>Shortcut link missing</h2>
              <p>
                Set `NEXT_PUBLIC_SHORTCUT_URL` to the public Apple Shortcuts link, then
                this page will expose the download button.
              </p>
            </div>
          )}

          <Link className="secondary-button" href="/onboarding">
            Back to onboarding
          </Link>
        </article>
      </section>
    </main>
  );
}
