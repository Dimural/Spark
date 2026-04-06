"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getEnvStatus } from "@/lib/env";
import { getBrowserSupabaseClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [missingPublicEnv, setMissingPublicEnv] = useState<string[] | null>(null);

  useEffect(() => {
    setMissingPublicEnv(getEnvStatus().missingPublicSupabase);
  }, []);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setError(
        "Supabase public environment variables are not loaded in the running app. Verify .env.local uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart next dev.",
      );
      return;
    }

    setIsPending(true);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    setIsPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Magic link sent. Check your inbox to continue.");
  }

  async function handleGoogleSignIn() {
    setMessage("");
    setError("");

    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setError(
        "Supabase public environment variables are not loaded in the running app. Verify .env.local uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart next dev.",
      );
      return;
    }

    setIsPending(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });

    setIsPending(false);

    if (oauthError) {
      setError(oauthError.message);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="section-kicker">Auth</p>
        <h1 className="auth-title">Sign in to Spark</h1>
        <p className="auth-copy">
          Phase 1 sets up Supabase Auth so the app is ready as soon as your
          keys are available.
        </p>
        <p className="auth-copy">
          If you added `.env.local` after `next dev` was already running, restart
          the dev server so the browser bundle picks up the `NEXT_PUBLIC_*` values.
        </p>

        <form className="auth-form" onSubmit={handleMagicLink}>
          <label className="auth-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send magic link"}
          </button>
        </form>

        <button
          className="secondary-button auth-secondary"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isPending}
        >
          Continue with Google
        </button>

        {message ? <p className="auth-success">{message}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}

        {missingPublicEnv && missingPublicEnv.length > 0 ? (
          <div className="env-card">
            <h2>Missing public Supabase env</h2>
            <p>
              Next.js only exposes `NEXT_PUBLIC_*` values that were present when the
              dev server started.
            </p>
            <ul>
              {missingPublicEnv.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link className="auth-link" href="/onboarding">
          Continue to onboarding
        </Link>
      </section>
    </main>
  );
}
