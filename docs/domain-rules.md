# Domain rules

## Entities
- User: owner of all data.
- Context: required for every log entry.
- Tag: optional label on goals and time entries.
- Goal: rule with period (day/week/month) and target.
- Events: time_entries, counter_events, check_events.
- Goal periods: cached period stats for goals.

## Invariants
- Every log entry must have a context.
- A goal always belongs to a context.
- A log entry can exist without a goal.
- One active time entry per user (ended_at is null).
- Time entry duration must be non-negative.

## Goal semantics
Goal is defined by:
- goal_type: time | counter | check
- period: day | week | month
- target_value (minutes/count/0-1)
- target_op: gte (positive) or lte (negative)

Status for a period:
- in_progress if current period is not finished.
- success/fail if period is finished and target_op comparison passes/fails.
- archived if goal is archived.

## Period boundaries
- Day: local calendar day.
- Week: ISO week (Mon-Sun).
- Month: calendar month.

Goal periods store:
- period_start, period_end (dates)
- actual_value, status

## Actual value calculation
- Time: sum of entry overlaps with period (ended_at null => now).
- Counter: sum of value_delta for events inside period.
- Check: last check_event in period wins (true => 1, false => 0).

If no events in period, actual_value = 0.
