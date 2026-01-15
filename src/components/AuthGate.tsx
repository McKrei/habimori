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
      <div className="relative min-h-screen overflow-hidden bg-[#05070d] px-4 text-slate-100">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(99,102,241,0.2),transparent_48%)]" />
          <div className="absolute inset-0 opacity-35 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:42px_42px] motion-safe:animate-[grid-drift_28s_linear_infinite]" />
          <div className="absolute -left-24 top-16 h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.55),transparent_65%)] blur-3xl motion-safe:animate-[float-1_18s_ease-in-out_infinite]" />
          <div className="absolute -right-32 top-1/4 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.45),transparent_65%)] blur-3xl motion-safe:animate-[float-2_22s_ease-in-out_infinite]" />
          <div className="absolute left-1/3 top-2/3 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.35),transparent_70%)] blur-3xl motion-safe:animate-[float-3_20s_ease-in-out_infinite]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 py-20 text-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
              {t("landing.badge")}
            </span>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              {t("landing.title")}
            </h1>
            <p className="mx-auto max-w-2xl text-base text-slate-300 sm:text-lg">
              {t("landing.subtitle")}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              className="rounded-full bg-white px-7 py-3 text-base font-semibold text-slate-950 shadow-[0_0_35px_rgba(99,102,241,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(99,102,241,0.6)] disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              {t("landing.note")}
            </p>
          </div>

          <div className="grid w-full gap-4 md:grid-cols-3">
            {[
              {
                title: t("landing.featureFocusTitle"),
                description: t("landing.featureFocusDesc"),
              },
              {
                title: t("landing.featureTimerTitle"),
                description: t("landing.featureTimerDesc"),
              },
              {
                title: t("landing.featureStatsTitle"),
                description: t("landing.featureStatsDesc"),
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-left text-sm text-slate-200 shadow-[0_0_45px_rgba(15,23,42,0.35)] backdrop-blur"
              >
                <p className="text-sm font-semibold text-white">
                  {feature.title}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="w-full rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-left backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t("landing.insideTitle")}
            </p>
            <div className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                {t("landing.insideGoals")}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.8)]" />
                {t("landing.insideTimer")}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.8)]" />
                {t("landing.insideStats")}
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 shadow-[0_0_12px_rgba(240,171,252,0.8)]" />
                {t("landing.insideLogs")}
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-white">
              {t("landing.motto")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
