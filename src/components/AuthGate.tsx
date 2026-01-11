"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/src/i18n/TranslationContext";

type AuthGateProps = {
  children: React.ReactNode;
  lng: string;
};

export default function AuthGate({ children, lng: _lng }: AuthGateProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
      setIsChecking(false);
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

  if (pathname?.startsWith("/auth/callback")) {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {t("auth.checkingSession")}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <button
          className="rounded-md bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={async () => {
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
          }}
          disabled={isWorking}
          aria-busy={isWorking}
        >
          {t("auth.loginWithGoogle")}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
