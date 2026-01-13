"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/src/i18n/TranslationContext";
import { useTheme } from "@/src/components/ThemeProvider";

type HeaderPageButton = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const baseClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function HeaderPageButtons() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const activeClassName =
    theme === "light"
      ? "bg-white text-black cursor-default"
      : "bg-black text-white cursor-default";

  const inactiveClassName = "bg-accent text-surface hover:bg-accent-hover";

  const buttons: HeaderPageButton[] = [
    {
      href: "/time-logs",
      label: t("timeLogs.title"),
      icon: (
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
      ),
    },
    {
      href: "/stats",
      label: t("nav.stats"),
      icon: (
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
      ),
    },
  ];

  return (
    <>
      {buttons.map((button) => {
        const isActive =
          pathname === button.href || pathname.startsWith(`${button.href}/`);
        const className = `${baseClassName} ${
          isActive ? activeClassName : inactiveClassName
        }`;

        if (isActive) {
          return (
            <span
              key={button.href}
              className={className}
              aria-current="page"
              aria-label={button.label}
              title={button.label}
            >
              {button.icon}
            </span>
          );
        }

        return (
          <Link
            key={button.href}
            className={className}
            href={button.href}
            aria-label={button.label}
            title={button.label}
          >
            {button.icon}
          </Link>
        );
      })}
    </>
  );
}
