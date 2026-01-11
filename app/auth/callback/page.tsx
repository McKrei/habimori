"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useTranslation } from "@/src/i18n/TranslationContext";

function AuthCallbackContent({ lng: _lng }: { lng: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const finalizeAuth = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMessage(
            error.message || t("auth.authFailed"),
          );
          return;
        }
      }

      router.replace("/");
    };

    void finalizeAuth();
  }, [router, searchParams, t]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
      {errorMessage ?? t("auth.signingIn")}
    </div>
  );
}

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          {t("auth.signingIn")}
        </div>
      }
    >
      <AuthCallbackContent lng="ru" />
    </Suspense>
  );
}
