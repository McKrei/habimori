import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthButton from "@/src/components/AuthButton";
import AuthGate from "@/src/components/AuthGate";
import { ActiveTimerProvider } from "@/src/components/ActiveTimerProvider";
import GlobalTimerBar from "@/src/components/GlobalTimerBar";
import { TranslationProvider, DEFAULT_LANGUAGE } from "@/src/i18n";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Habimori",
  description: "Minimal goal and time tracking",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-900`}
      >
        <TranslationProvider>
          <AuthGate lng={DEFAULT_LANGUAGE}>
            <ActiveTimerProvider>
              <div className="min-h-screen pb-24">
                <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
                  <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
                    <Link className="flex items-center gap-2" href="/">
                      <Image
                        src="/images/logo-header.png"
                        alt="Habimori"
                        width={50}
                        height={50}
                        className="rounded"
                        priority
                      />
                      <span className="text-xl font-semibold tracking-tight">
                        Habimori
                      </span>
                    </Link>
                      <div className="flex items-center gap-2">
                      <LanguageSwitcher lng={DEFAULT_LANGUAGE} />
                      <Link
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2"
                        href="/time-logs"
                        aria-label="Логи времени"
                        title="Логи времени"
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
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12,6 12,12 16,14" />
                        </svg>
                      </Link>
                      <Link
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-white focus-visible:outline-2 focus-visible:outline-offset-2"
                        href="/stats"
                        aria-label="Статистика"
                        title="Статистика"
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
                          <path d="M3 3v18h18" />
                          <path d="M7 15v3" />
                          <path d="M11 11v7" />
                          <path d="M15 7v11" />
                          <path d="M19 9v9" />
                        </svg>
                      </Link>
                      <AuthButton />
                    </div>
                  </div>
                </header>

                <main className="mx-auto w-full max-w-5xl px-4 py-3">
                  {children}
                </main>

                <GlobalTimerBar />
              </div>
            </ActiveTimerProvider>
          </AuthGate>
        </TranslationProvider>
      </body>
    </html>
  );
}
