# Доменные правила

## Сущности
- User: владелец всех данных.
- Context: обязателен для каждой записи и цели.
- Tag: опциональная метка для целей и time entries.
- Goal: правило с периодом (day/week/month), направлением и целью.
- Events: time_entries, counter_events, check_events.
- Goal periods: кэш статусов по периодам.

## Инварианты
- Каждый лог обязан иметь context.
- Goal всегда относится к context.
- Лог может существовать без goal (глобальный таймер).
- Один активный time entry на пользователя (ended_at = null).
- ended_at >= started_at или null.

## Семантика цели
Параметры цели:
- goal_type: time | counter | check
- period: day | week | month
- target_value (минуты/кол-во/0–1)
- target_op: gte (положительная цель) или lte (отрицательная цель)

Статус периода:
- in_progress, если период еще не завершен.
- success/fail, если период завершен и сравнение target_op проходит/нет.
- archived, если goal архивирована.

Для check-целей:
- target_op = gte означает «должно быть done».
- target_op = lte означает «должно быть not done».

## Границы периодов
- Day: локальный календарный день (period_end = period_start).
- Week: ISO неделя (Mon–Sun).
- Month: календарный месяц (последний день месяца).

Goal periods хранят:
- period_start, period_end (даты)
- actual_value, status

## Расчет actual_value
- Time: сумма пересечений записей с периодом, округление до минут (ended_at = null → now).
- Counter: сумма value_delta по событиям внутри периода.
- Check: последнее check_event в периоде (true = 1, false = 0).

Если событий нет, actual_value = 0.
