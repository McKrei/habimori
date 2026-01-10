export function getTodayDateString() {
  const now = new Date();
  const localMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return localMidnight.toISOString().slice(0, 10);
}
