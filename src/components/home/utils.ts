export function getDateString(date: Date) {
  const localMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return localMidnight.toISOString().slice(0, 10);
}

export function getTodayDateString() {
  return getDateString(new Date());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
