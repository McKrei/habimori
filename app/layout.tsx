import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthButton from "@/src/components/AuthButton";

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
        <div className="min-h-screen pb-24">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
              <Link className="text-lg font-semibold tracking-tight" href="/">
                Habimori
              </Link>
              <AuthButton />
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>

          <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 py-3">
              <button
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                type="button"
              >
                Play
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
