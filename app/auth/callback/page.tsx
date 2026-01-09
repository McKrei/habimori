"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const finalizeAuth = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrorMessage(
            error.message || "Failed to finish authentication. Try again.",
          );
          return;
        }
      }

      router.replace("/");
    };

    void finalizeAuth();
  }, [router, searchParams]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
      {errorMessage ?? "Signing you in..."}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          Signing you in...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
