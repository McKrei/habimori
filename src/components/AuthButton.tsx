"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

function getDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  const name =
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    undefined;

  return name ?? user.email ?? "";
}

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const syncUser = async () => {
      const displayName = getDisplayName(user);
      const { error } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email ?? null,
          name: displayName || null,
        },
        { onConflict: "id" },
      );

      if (error) {
        console.error("Failed to sync user profile", error);
      }
    };

    void syncUser();
  }, [user]);

  const handleLogin = async () => {
    setIsWorking(true);
    const redirectTo = new URL(
      "/auth/callback",
      window.location.origin,
    ).toString();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      console.error("Failed to start OAuth flow", error);
      setIsWorking(false);
    }
  };

  const handleLogout = async () => {
    setIsWorking(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out", error);
    }

    setIsWorking(false);
  };

  const buttonLabel = user ? "Выйти" : "Войти через Google";

  return (
    <button
      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={user ? handleLogout : handleLogin}
      disabled={isWorking}
      aria-busy={isWorking}
      aria-label={buttonLabel}
      title={buttonLabel}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    </button>
  );
}
