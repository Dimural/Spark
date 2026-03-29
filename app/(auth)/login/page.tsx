"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { getEnvStatus } from "@/lib/env";
import { getBrowserSupabaseClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const envStatus = useMemo(() => getEnvStatus(), []);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setError(
        "Supabase environment variables are missing. Add them to .env.local before signing in.",
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
        "Supabase environment variables are missing. Add them to .env.local before signing in.",
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

        {envStatus.missingPublicSupabase.length > 0 ? (
          <div className="env-card">
            <h2>Missing public env</h2>
            <ul>
              {envStatus.missingPublicSupabase.map((key) => (
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
