import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGate from "@/src/components/AuthGate";
import { ActiveTimerProvider } from "@/src/components/ActiveTimerProvider";
import { FilterProvider } from "@/src/components/FilterContext";
import { ThemeProvider } from "@/src/components/ThemeProvider";
import GlobalTimerBar from "@/src/components/GlobalTimerBar";
import HeaderFilterButton from "@/src/components/HeaderFilterButton";
import HeaderPageButtons from "@/src/components/HeaderPageButtons";
import HeaderSettingsLink from "@/src/components/HeaderSettingsLink";
import SwipeNavigator from "@/src/components/SwipeNavigator";
import { TranslationProvider, DEFAULT_LANGUAGE } from "@/src/i18n";

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
                        <Link
                          className="flex items-center gap-1.5 sm:gap-2"
                          href="/"
                        >
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
                          <div className="mr-2.5">
                            <HeaderFilterButton />
                          </div>
                          <HeaderPageButtons />
                          <HeaderSettingsLink />
                        </div>
                      </div>
                    </header>

                    <SwipeNavigator>
                      <main className="mx-auto w-full max-w-5xl px-4 py-3">
                        {children}
                      </main>
                    </SwipeNavigator>

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
