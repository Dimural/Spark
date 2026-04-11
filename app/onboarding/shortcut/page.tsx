import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { getServerSupabaseClient } from "@/lib/supabase";
import { getServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { ShortcutConfigPanel } from "@/components/shortcut-config-panel";

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

async function getOrCreateApiKey(userId: string): Promise<string | null> {
  const admin = getServiceRoleSupabaseClient();

  if (!admin) {
    return null;
  }

  const { data } = await admin
    .from("users")
    .select("shortcut_api_key")
    .eq("id", userId)
    .single();

  if (data?.shortcut_api_key) {
    return data.shortcut_api_key as string;
  }

  const newKey = `sk_spark_${randomBytes(24).toString("hex")}`;

  await admin
    .from("users")
    .update({ shortcut_api_key: newKey })
    .eq("id", userId);

  return newKey;
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

  const [origin, apiKey] = await Promise.all([
    getAppOrigin(),
    getOrCreateApiKey(user.id),
  ]);

  const downloadUrl = getShortcutDownloadUrl();
  const ingestUrl = origin ? `${origin}/api/ingest-note` : "/api/ingest-note";

  return (
    <main className="dashboard-shell">
      <section className="dashboard-shell__header">
        <p className="section-kicker">Step 3 — Apple Shortcut</p>
        <h1 className="dashboard-title">Connect Apple Notes to Spark.</h1>
        <p className="dashboard-copy">
          Install the Shortcut below. It reads the latest note from your{" "}
          <strong>Spark Inbox</strong> folder in Apple Notes and sends it to
          your personal ingest endpoint. Tap it once from your Home Screen
          whenever you want Spark to process your notes.
        </p>
      </section>

      <section className="shortcut-layout">

        {/* ── Config values ─────────────────────────────────── */}
        <article className="status-panel shortcut-panel shortcut-panel--dark">
          <p className="signal-card__label">Your Shortcut values</p>
          <h2>Copy these into the Shortcut</h2>
          <p style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "1rem" }}>
            These are stored once when you first run the Shortcut. They never
            change unless you rotate the API key.
          </p>
          {apiKey ? (
            <ShortcutConfigPanel
              ingestUrl={ingestUrl}
              userId={user.id}
              apiKey={apiKey}
            />
          ) : (
            <p className="env-card">
              Could not load API key — make sure{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> is set.
            </p>
          )}
        </article>

        {/* ── Download + instructions ────────────────────────── */}
        <article className="status-panel shortcut-panel">
          <h2>Install flow</h2>

          <ol className="shortcut-steps">
            <li>
              In Apple Notes, create a folder named exactly{" "}
              <strong>Spark Inbox</strong>.
            </li>
            <li>
              Download the Shortcut using the button below (opens on iPhone /
              iPad).
            </li>
            <li>
              When prompted, paste the <strong>POST URL</strong>,{" "}
              <strong>User ID</strong>, and <strong>API Key</strong> from the
              panel on the left.
            </li>
            <li>
              Add the Shortcut to your Home Screen for one-tap capture.
            </li>
            <li>
              Write a note in <strong>Spark Inbox</strong>, then tap the
              Shortcut. Check your dashboard to confirm it was processed.
            </li>
          </ol>

          {downloadUrl ? (
            <a className="primary-button" href={downloadUrl}>
              Download Spark Shortcut
            </a>
          ) : (
            <div className="env-card">
              <h2>Shortcut link not set</h2>
              <p>
                Set <code>NEXT_PUBLIC_SHORTCUT_URL</code> to the public iCloud
                Shortcuts link. Until then, follow the manual build instructions
                below.
              </p>
            </div>
          )}

          <Link className="secondary-button" href="/onboarding">
            Back to onboarding
          </Link>
        </article>

      </section>

      {/* ── Manual build reference ─────────────────────────────── */}
      <section className="status-panel" style={{ marginTop: "2rem" }}>
        <p className="signal-card__label">Manual Shortcut build reference</p>
        <h2>Build the Shortcut yourself (if no download link)</h2>
        <p>
          Open the Shortcuts app on your iPhone or iPad and create a new
          Shortcut with the following actions in order:
        </p>
        <ol className="shortcut-steps shortcut-steps--spaced">
          <li>
            <strong>Text</strong> — set the value to your <em>POST URL</em>{" "}
            (copy from above). Name the variable <code>ingest_url</code>.
          </li>
          <li>
            <strong>Text</strong> — set the value to your <em>User ID</em>.
            Name the variable <code>user_id</code>.
          </li>
          <li>
            <strong>Text</strong> — set the value to your <em>API Key</em>{" "}
            (starts with <code>sk_spark_</code>). Name the variable{" "}
            <code>api_key</code>.
          </li>
          <li>
            <strong>Find Notes</strong> — filter by Folder is{" "}
            <strong>Spark Inbox</strong>, sort by Last Modified Date (newest
            first), limit to 1.
          </li>
          <li>
            <strong>Get Body of Note</strong> — pass the result of the previous
            step. Output is the raw note text.
          </li>
          <li>
            <strong>Get Contents of URL</strong>
            <ul>
              <li>URL: <code>ingest_url</code></li>
              <li>Method: POST</li>
              <li>Headers: <code>Authorization</code> → <code>Bearer [api_key]</code>, <code>Content-Type</code> → <code>application/json</code></li>
              <li>
                Body (JSON):
                <pre style={{ fontSize: "0.78rem", marginTop: "0.4rem" }}>{`{
  "text": "[Note Body from step 5]",
  "user_id": "[user_id from step 2]"
}`}</pre>
              </li>
            </ul>
          </li>
          <li>
            <strong>Show Notification</strong> — title: <em>Spark</em>, body:{" "}
            <em>Note processed.</em>
          </li>
        </ol>
        <p style={{ marginTop: "1rem", fontSize: "0.85rem", opacity: 0.7 }}>
          Once the Shortcut runs successfully you will see the routed item
          appear in your dashboard within a few seconds.
        </p>
      </section>
    </main>
  );
}
