"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      return;
    }

    setIsPending(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className="secondary-button dashboard-action" type="button" onClick={handleSignOut}>
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
