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

  return (
    <button
      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={user ? handleLogout : handleLogin}
      disabled={isWorking}
      aria-busy={isWorking}
    >
      {user
        ? getDisplayName(user)
          ? `Logout (${getDisplayName(user)})`
          : "Logout"
        : "Login with Google"}
    </button>
  );
}
