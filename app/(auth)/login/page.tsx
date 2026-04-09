"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getEnvStatus } from "@/lib/env";
import { getBrowserSupabaseClient } from "@/lib/supabase-client";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [missingPublicEnv, setMissingPublicEnv] = useState<string[] | null>(null);

  useEffect(() => {
    setMissingPublicEnv(getEnvStatus().missingPublicSupabase);
  }, []);

  function resetState() {
    setMessage("");
    setError("");
  }

  async function handlePasswordAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetState();

    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setError(
        "Supabase public environment variables are not loaded in the running app. Verify .env.local uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart next dev.",
      );
      return;
    }

    setIsPending(true);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      setIsPending(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setMessage("Account created! Check your email to confirm your address, then sign in.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    window.location.href = "/onboarding";
  }

  async function handleGoogleSignIn() {
    resetState();

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

  const isSignUp = mode === "signup";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="section-kicker">Auth</p>
        <h1 className="auth-title">{isSignUp ? "Create your account" : "Sign in to Spark"}</h1>

        <form className="auth-form" onSubmit={handlePasswordAuth}>
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
          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="auth-input"
            type="password"
            placeholder={isSignUp ? "Choose a password" : "Your password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={isSignUp ? 6 : undefined}
          />
          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
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

        <p className="auth-copy" style={{ textAlign: "center", marginTop: "1rem" }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            className="auth-link"
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={() => {
              resetState();
              setMode(isSignUp ? "signin" : "signup");
            }}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>

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
