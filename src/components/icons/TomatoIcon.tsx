"use client";

type TomatoIconProps = {
  size?: number;
  className?: string;
};

export default function TomatoIcon({
  size = 24,
  className = "",
}: TomatoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5.5c-1.1-1.6-2.8-2.6-4.8-2.6a.9.9 0 0 0 0 1.8c1.1 0 2.2.5 2.9 1.3-1.3.2-2.5.7-3.5 1.5a.9.9 0 0 0 1.1 1.4c1-.8 2.2-1.2 3.5-1.2h1.7c1.3 0 2.6.4 3.6 1.2a.9.9 0 1 0 1.1-1.4c-1-.8-2.2-1.3-3.5-1.5.7-.8 1.8-1.3 2.9-1.3a.9.9 0 1 0 0-1.8c-2 0-3.7 1-4.8 2.6z" />
      <path d="M12 7.5c-4.1 0-7.5 3.1-7.5 7 0 4 3.1 6.5 7.5 6.5s7.5-2.5 7.5-6.5c0-3.9-3.4-7-7.5-7z" />
    </svg>
  );
}
