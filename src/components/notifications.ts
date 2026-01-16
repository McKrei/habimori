"use client";

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Ignore permission errors in restricted environments.
  }
}
