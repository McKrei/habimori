import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthButton from "@/src/components/AuthButton";
import AuthGate from "@/src/components/AuthGate";
import { ActiveTimerProvider } from "@/src/components/ActiveTimerProvider";
import GlobalTimerBar from "@/src/components/GlobalTimerBar";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-900`}
      >
        <AuthGate>
          <ActiveTimerProvider>
            <div className="min-h-screen pb-24">
              <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
                  <Link
                    className="text-lg font-semibold tracking-tight"
                    href="/"
                  >
                    Habimori
                  </Link>
                  <AuthButton />
                </div>
              </header>

              <main className="mx-auto w-full max-w-5xl px-4 py-6">
                {children}
              </main>

              <GlobalTimerBar />
            </div>
          </ActiveTimerProvider>
        </AuthGate>
      </body>
    </html>
  );
}
