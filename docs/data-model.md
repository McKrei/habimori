# Data model (current)

Based on `supabase/migrations/*`.

## Common
- All business tables include `user_id` and are protected by RLS.
- Primary keys are UUID.
- Context/tag names are unique per user (case-insensitive).

## Core tables

### users
- id (PK, auth.users FK, cascade)
- email, name, created_at

### contexts
- id (PK)
- user_id (FK users, cascade)
- name (unique per user, lowercased index)
- created_at

### tags
- id (PK)
- user_id (FK users, cascade)
- name (unique per user, lowercased index)
- created_at

### goals
- id (PK)
- user_id (FK users, cascade)
- title
- goal_type: time | counter | check
- period: day | week | month
- target_value (>= 0)
- target_op: gte | lte
- start_date, end_date (start <= end)
- context_id (FK contexts, restrict)
- is_active, is_archived
- created_at

### time_entries
- id (PK)
- user_id (FK users, cascade)
- started_at, ended_at (ended_at >= started_at or null)
- context_id (FK contexts, restrict)
- goal_id (FK goals, set null)
- created_at
- unique index: one active entry per user (ended_at is null)

### counter_events
- id (PK)
- user_id (FK users, cascade)
- occurred_at
- value_delta
- context_id (FK contexts, restrict)
- goal_id (FK goals, set null)
- created_at

### check_events
- id (PK)
- user_id (FK users, cascade)
- occurred_at
- state (boolean)
- context_id (FK contexts, restrict)
- goal_id (FK goals, set null)
- created_at

### goal_periods
- id (PK)
- goal_id (FK goals, cascade)
- period_start, period_end
- actual_value
- status: success | fail | in_progress | archived
- calculated_at

## Tag relations
- goal_tags (goal_id, tag_id)
- time_entry_tags (time_entry_id, tag_id)
- counter_event_tags (counter_event_id, tag_id)
- check_event_tags (check_event_id, tag_id)

All relation tables are protected by RLS via ownership of parent rows.
