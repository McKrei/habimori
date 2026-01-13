"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const SWIPE_PAGES = ["/", "/time-logs", "/stats"] as const;
const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_VERTICAL = 80;

function getNextPath(pathname: string, direction: "left" | "right") {
  const index = SWIPE_PAGES.indexOf(pathname as (typeof SWIPE_PAGES)[number]);
  if (index === -1) return null;
  const nextIndex =
    direction === "left"
      ? (index + 1) % SWIPE_PAGES.length
      : (index - 1 + SWIPE_PAGES.length) % SWIPE_PAGES.length;
  return SWIPE_PAGES[nextIndex];
}

function shouldIgnoreSwipe(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const interactive = target.closest(
    "button, a, input, textarea, select, [data-swipe-ignore='true']",
  );
  if (interactive) return true;

  let node: Element | null = target;
  while (node) {
    const style = window.getComputedStyle(node);
    if (
      (style.overflowX === "auto" || style.overflowX === "scroll") &&
      node.scrollWidth > node.clientWidth
    ) {
      return true;
    }
    node = node.parentElement;
  }

  return false;
}

export default function SwipeNavigator({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isTracking = useRef(false);

  const handleNavigate = useCallback(
    (direction: "left" | "right") => {
      const nextPath = getNextPath(pathname, direction);
      if (!nextPath || nextPath === pathname) return;

      const root = document.documentElement;
      root.dataset.navDirection = direction;

      // Prefer View Transitions for a smoother swipe animation.
      if ("startViewTransition" in document) {
        const transition = (document as Document & {
          startViewTransition?: (callback: () => void) => { finished: Promise<void> };
        }).startViewTransition?.(() => {
          router.push(nextPath);
        });
        transition?.finished.finally(() => {
          delete root.dataset.navDirection;
        });
        return;
      }

      router.push(nextPath);
      delete root.dataset.navDirection;
    },
    [pathname, router],
  );

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    if (shouldIgnoreSwipe(event.target)) return;
    const touch = event.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isTracking.current = true;
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isTracking.current || startX.current === null || startY.current === null) {
      return;
    }
    const touch = event.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = Math.abs(touch.clientY - startY.current);

    if (Math.abs(deltaX) > SWIPE_MIN_DISTANCE && deltaY < SWIPE_MAX_VERTICAL) {
      isTracking.current = false;
      startX.current = null;
      startY.current = null;
      handleNavigate(deltaX < 0 ? "left" : "right");
    }
  };

  const onTouchEnd = () => {
    isTracking.current = false;
    startX.current = null;
    startY.current = null;
  };

  const isEnabled = SWIPE_PAGES.includes(pathname as (typeof SWIPE_PAGES)[number]);

  return (
    <div
      onTouchStart={isEnabled ? onTouchStart : undefined}
      onTouchMove={isEnabled ? onTouchMove : undefined}
      onTouchEnd={isEnabled ? onTouchEnd : undefined}
    >
      {children}
    </div>
  );
}
