"use client";

type StopIconProps = {
  size?: number;
  className?: string;
};

export default function StopIcon({ size = 24, className = "" }: StopIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
