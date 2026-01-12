"use client";

type PlayIconProps = {
  size?: number;
  className?: string;
};

export default function PlayIcon({ size = 24, className = "" }: PlayIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}
