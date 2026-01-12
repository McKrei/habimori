# Конфигурация индикатора календаря (Donut Ring)

Кольцо-индикатор отображает состав статусов целей для каждого дня календаря.

## Файлы конфигурации

- `src/components/calendar/donutConfig.ts` — настройки кольца
- `src/components/home/HomeWeekCalendar.tsx` — константы для отзывчивого количества дней

---

## Адаптивное количество дней

Количество отображаемых дней в календаре зависит от ширины экрана:

| Ширина экрана | Количество дней |
|---------------|-----------------|
| < 640px       | 5               |
| 640–767px     | 7               |
| 768–1023px    | 7               |
| 1024–1279px   | 9               |
| ≥ 1280px      | 11              |

**Изменение в `HomeWeekCalendar.tsx`:**
```ts
const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
};

const DAY_COUNTS = {
  mobile: 5,
  tablet: 7,
  desktop: 9,
  wide: 11,
};
```

---

## Параметры конфигурации

### RING_THICKNESS

Толщина кольца зависит от общего количества целей в дне.

| Целей   | Толщина (px) |
|---------|--------------|
| 1–3     | 2            |
| 4–9     | 3            |
| 10–19   | 4            |
| 20+     | 5            |

**Изменение:**
```ts
export const RING_THICKNESS: Array<{ maxGoals: number; thickness: number }> = [
  { maxGoals: 3, thickness: 2 },
  { maxGoals: 9, thickness: 3 },
  { maxGoals: 19, thickness: 4 },
  { maxGoals: Infinity, thickness: 5 },
];
```

---

### STATUS_COLORS

Цвета сегментов по статусам:

| Статус       | Цвет     | HEX       |
|--------------|----------|-----------|
| fail         | Красный  | `#f43f5e` |
| in_progress  | Оранжевый| `#f59e0b` |
| success      | Зелёный  | `#10b981` |

**Изменение:**
```ts
export const STATUS_COLORS = {
  fail: "#f43f5e",
  in_progress: "#f59e0b",
  success: "#10b981",
} as const;
```

---

### SEGMENT_ORDER

Порядок отрисовки сегментов по часовой стрелке (начиная с 12 часов):

```ts
export const SEGMENT_ORDER = ["fail", "in_progress", "success"] as const;
```

Порядок фиксирован для визуальной "узнаваемости" — пользователь привыкает к расположению.

---

### SEGMENT_GAP_DEGREES

Зазор между сегментами в градусах. Применяется только если сегментов > 1.

```ts
export const SEGMENT_GAP_DEGREES = 6;
```

Увеличьте для более заметного разделения, уменьшите для плотного вида.

---

### MIN_SEGMENT_DEGREES

Минимальный угол сегмента в градусах. Гарантирует видимость малых долей.

```ts
export const MIN_SEGMENT_DEGREES = 12;
```

Если доля статуса даёт угол меньше этого значения, сегмент отрисуется с минимальным углом.

---

## Компоненты

### DonutRing

SVG-компонент для отрисовки кольца.

```tsx
<DonutRing
  counts={{ success: 2, in_progress: 1, fail: 0 }}
  size={52}
  disabled={false}
/>
```

### CalendarDay

Круглая ячейка дня с интегрированным кольцом.

```tsx
<CalendarDay
  weekday="ПН"
  date={12}
  counts={{ success: 2, in_progress: 1, fail: 0 }}
  isToday={false}
  isSelected={true}
  onClick={() => {}}
/>
```

---

## Визуальная логика

1. **Нет целей** — кольцо не отображается
2. **Один статус** — кольцо одним цветом на 360°
3. **Несколько статусов** — кольцо делится на дуги пропорционально количеству

### Состояния дня

- **selected**: фон внутреннего круга `bg-slate-800`, текст белый
- **today**: лёгкий фон `bg-emerald-50`, обводка `ring-emerald-300`
- **disabled**: `opacity-50` для всего контейнера

Кольцо не меняет свои цвета при selected/today — состояния применяются к внутреннему кругу.
