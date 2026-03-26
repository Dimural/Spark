"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase-client";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing sign-in...");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setStatus("Missing Supabase keys.");
      setError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
      return;
    }

    const client = supabase;

    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    async function finishAuth() {
      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(
          code,
        );

        if (exchangeError) {
          setStatus("Sign-in failed.");
          setError(exchangeError.message);
          return;
        }

        router.replace("/dashboard");
        return;
      }

      if (tokenHash && type) {
        const { error: otpError } = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "email" | "recovery" | "invite" | "email_change",
        });

        if (otpError) {
          setStatus("Sign-in failed.");
          setError(otpError.message);
          return;
        }

        router.replace("/dashboard");
        return;
      }

      setStatus("No auth payload found.");
      setError("Try signing in again from the login page.");
    }

    void finishAuth();
  }, [router, searchParams]);

  return (
    <section className="auth-card">
      <p className="section-kicker">Callback</p>
      <h1 className="auth-title">{status}</h1>
      {error ? <p className="auth-error">{error}</p> : null}
    </section>
  );
}

function CallbackFallback() {
  return (
    <section className="auth-card">
      <p className="section-kicker">Callback</p>
      <h1 className="auth-title">Completing sign-in...</h1>
    </section>
  );
}

export default function CallbackPage() {
  return (
    <main className="auth-shell">
      <Suspense fallback={<CallbackFallback />}>
        <CallbackContent />
      </Suspense>
    </main>
  );
}
