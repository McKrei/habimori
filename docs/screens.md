# Screens and UI

## / (Main)
- Shows active, non-archived goals for today, sorted by status.
- Filters: context (single), status (single), tags (multi), reset.
- Goal card actions:
  - Counter: input + submit (+ defaults to 1)
  - Time: play/stop per goal (only one active timer per user)
  - Check: toggle done/undone
- Status indicator: success/fail/in_progress based on goal periods.

## /goals/new (Create goal)
- Fields: title, type, period, target, target operator, start/end dates.
- Context: required, creates on the fly.
- Tags: optional, creates on the fly.
- Saves goal, then recalculates goal periods.

## /goals/[id] (Goal details)
- Shows goal summary and period progress.
- Lists recent events (time/counter/check).
- Manual add for time, counter, check events.
- Goal tags can be edited.
- Goal can be archived; archived goals hidden from main screen.

## /stats (Stats)
- Filters: period (week/month/custom), contexts (multi), tags (multi).
- Charts:
  - goal status counts (success/fail/in_progress)
  - tracked time totals
  - time by context (stacked bars, interactive)
  - time distribution by context (pie)
