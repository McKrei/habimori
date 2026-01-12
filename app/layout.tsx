import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthButton from "@/src/components/AuthButton";
import AuthGate from "@/src/components/AuthGate";
import { ActiveTimerProvider } from "@/src/components/ActiveTimerProvider";
import { FilterProvider } from "@/src/components/FilterContext";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import GlobalTimerBar from "@/src/components/GlobalTimerBar";
import HeaderFilterButton from "@/src/components/HeaderFilterButton";
import ThemeSwitcher from "@/src/components/ThemeSwitcher";
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
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground`}
      >
        <ThemeProvider>
          <TranslationProvider>
            <AuthGate lng={DEFAULT_LANGUAGE}>
              <ActiveTimerProvider>
                <FilterProvider>
                  <div className="min-h-screen pb-24">
                    <header className="border-b border-border bg-surface/80 backdrop-blur">
                      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-3 py-3 sm:px-4 sm:py-4">
                        <Link className="flex items-center gap-1.5 sm:gap-2" href="/">
                          <Image
                            src="/images/logo-header.png"
                            alt="Habimori"
                            width={40}
                            height={40}
                            className="rounded sm:h-[50px] sm:w-[50px]"
                            priority
                          />
                          <span className="text-base font-semibold tracking-tight text-text-primary sm:text-xl">
                            Habimori
                          </span>
                        </Link>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <HeaderFilterButton />
                          <LanguageSwitcher lng={DEFAULT_LANGUAGE} />
                          <Link
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-surface hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors"
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-surface hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors"
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
                          <ThemeSwitcher />
                          <AuthButton />
                        </div>
                      </div>
                    </header>

                    <main className="mx-auto w-full max-w-5xl px-4 py-3">
                      {children}
                    </main>

                    <GlobalTimerBar />
                  </div>
                </FilterProvider>
              </ActiveTimerProvider>
            </AuthGate>
          </TranslationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
