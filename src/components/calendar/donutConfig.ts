/**
 * Конфигурация кольца-индикатора статусов целей (donut ring)
 *
 * Документация: docs/calendar-donut.md
 */

/**
 * Толщина кольца в зависимости от общего количества целей в дне.
 * Массив должен быть отсортирован по возрастанию maxGoals.
 * Последний элемент должен иметь maxGoals: Infinity.
 */
export const RING_THICKNESS: Array<{ maxGoals: number; thickness: number }> = [
  { maxGoals: 3, thickness: 2 },
  { maxGoals: 9, thickness: 3 },
  { maxGoals: 19, thickness: 4 },
  { maxGoals: Infinity, thickness: 5 },
];

/**
 * Цвета сегментов кольца по статусам.
 * Используются HEX значения для SVG stroke.
 */
export const STATUS_COLORS = {
  fail: "#f43f5e", // Tailwind rose-500
  in_progress: "#f59e0b", // Tailwind amber-500
  success: "#10b981", // Tailwind emerald-500
} as const;

/**
 * Порядок отрисовки сегментов (по часовой стрелке).
 * Влияет на визуальную "узнаваемость" расположения статусов.
 */
export const SEGMENT_ORDER = ["fail", "in_progress", "success"] as const;

/**
 * Зазор между сегментами в градусах.
 * Применяется только если сегментов больше одного.
 */
export const SEGMENT_GAP_DEGREES = 6;

/**
 * Минимальный угол сегмента в градусах.
 * Если доля статуса даёт угол меньше этого значения,
 * сегмент всё равно будет отрисован с этим минимальным углом.
 */
export const MIN_SEGMENT_DEGREES = 12;

/**
 * Вычисляет толщину кольца по количеству целей.
 */
export function getRingThickness(totalGoals: number): number {
  for (const { maxGoals, thickness } of RING_THICKNESS) {
    if (totalGoals <= maxGoals) {
      return thickness;
    }
  }
  return RING_THICKNESS[RING_THICKNESS.length - 1]?.thickness ?? 3;
}
