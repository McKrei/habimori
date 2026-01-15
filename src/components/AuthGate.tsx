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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          {t("auth.checkingSession")}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl animate-pulse" />
          <div className="absolute -right-16 top-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-[pulse_9s_ease-in-out_infinite]" />
          <div className="absolute bottom-10 left-1/2 h-56 w-[32rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl animate-[pulse_12s_ease-in-out_infinite]" />
          <div className="absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20 shadow-[0_0_80px_rgba(56,189,248,0.12)] animate-[spin_40s_linear_infinite]" />
          <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/10 shadow-[0_0_60px_rgba(168,85,247,0.15)] animate-[spin_25s_linear_infinite]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 animate-[pulse_10s_ease-in-out_infinite]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(2,6,23,0.95))]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            {t("landing.brand")}
          </div>

          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
              {t("landing.heroTagline")}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t("landing.heroTitle")}
              <span className="block bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                {t("landing.heroTitleAccent")}
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-slate-300 sm:text-lg">
              {t("landing.heroSubtitle")}
            </p>
            <p className="mx-auto max-w-2xl text-sm text-slate-400">
              {t("landing.heroPitch")}
            </p>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:gap-6">
            <li className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              {t("landing.bulletFocus")}
            </li>
            <li className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              {t("landing.bulletClarity")}
            </li>
            <li className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              {t("landing.bulletFlow")}
            </li>
          </ul>

          <div className="flex flex-col items-center gap-3">
            <button
              className="relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-purple-500/40 disabled:cursor-not-allowed disabled:opacity-60"
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
              {isWorking ? t("auth.signingIn") : t("auth.loginWithGoogle")}
            </button>
            <p className="text-xs text-slate-400">{t("landing.loginHint")}</p>
          </div>

          <div className="grid w-full gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm text-slate-300 shadow-lg shadow-black/40 backdrop-blur">
              <p className="text-base font-semibold text-white">
                {t("landing.featureGoalsTitle")}
              </p>
              <p className="mt-2 text-slate-400">{t("landing.featureGoalsBody")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm text-slate-300 shadow-lg shadow-black/40 backdrop-blur">
              <p className="text-base font-semibold text-white">
                {t("landing.featureTimeTitle")}
              </p>
              <p className="mt-2 text-slate-400">{t("landing.featureTimeBody")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left text-sm text-slate-300 shadow-lg shadow-black/40 backdrop-blur">
              <p className="text-base font-semibold text-white">
                {t("landing.featureStatsTitle")}
              </p>
              <p className="mt-2 text-slate-400">{t("landing.featureStatsBody")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
