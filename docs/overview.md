# Habimori overview

Habimori is a minimal goal + time tracking app. Users create goals (time, counter, or check), log activity quickly from the main screen, and can run a global timer without selecting a goal.

## Core concepts
- Goal: rule with period (day/week/month), target value, and positive/negative operator.
- Context: required grouping for all logging.
- Tags: optional labels for goals and time sessions.
- Events: time entries, counter events, check events.
- Goal periods: cached period results (success/fail/in_progress/archived).

## Current behavior
- Google OAuth via Supabase.
- Main screen shows active goals, sorted by status, with quick logging.
- Goals can be created with context + optional tags.
- Goal details show recent events and allow manual entries.
- Global timer starts a time entry without a goal.
- Stats screen includes period/context/tag filters and charts for goals/time.
