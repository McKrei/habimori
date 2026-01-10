# Модель данных (MVP)

Основано на миграциях `supabase/migrations/0001_init.sql`, `0002_schema_hardening.sql`, `0003_feature8_polish.sql`.

## Общие принципы

- Все бизнес-таблицы принадлежат пользователю через `user_id`.
- Доступ ограничен RLS: чтение/запись только своих строк (`auth.uid()`).
- Связанные сущности проверяются через `exists` в политиках.

## Таблицы

### `users`
Профиль пользователя (расширение `auth.users`).

Поля:
- `id` uuid, PK, FK -> `auth.users(id)`, `on delete cascade`
- `email` varchar(320)
- `name` varchar(120)
- `created_at` timestamptz, default `now()`

### `contexts`
Контексты (области/проекты пользователя).

Поля:
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK -> `users(id)`, `on delete cascade`
- `name` varchar(80)
- `created_at` timestamptz, default `now()`

Ограничения и индексы:
- `contexts_user_name_uq` уникально по `(user_id, lower(name))`

### `tags`
Глобальные теги пользователя.

Поля:
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK -> `users(id)`, `on delete cascade`
- `name` varchar(60)
- `created_at` timestamptz, default `now()`

Ограничения и индексы:
- `tags_user_name_uq` уникально по `(user_id, lower(name))`

### `goals`
Цели пользователя.

Поля:
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK -> `users(id)`, `on delete cascade`
- `title` varchar(160)
- `goal_type` varchar(16), значения: `time | counter | check`
- `period` varchar(8), значения: `day | week | month`
- `target_value` integer, `>= 0`
- `target_op` varchar(3), значения: `gte | lte`
- `start_date` date
- `end_date` date
- `context_id` uuid, FK -> `contexts(id)`, `on delete restrict`
- `is_active` boolean, default `true`
- `is_archived` boolean, default `false`
- `created_at` timestamptz, default `now()`

Индексы:
- `goals_user_period_idx` по `(user_id, period, is_active)`

### `time_entries`
Сессии времени (таймер).

Поля:
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK -> `users(id)`, `on delete cascade`
- `started_at` timestamptz
- `ended_at` timestamptz, nullable
- `context_id` uuid, FK -> `contexts(id)`, `on delete restrict`
- `goal_id` uuid, FK -> `goals(id)`, `on delete set null`
- `created_at` timestamptz, default `now()`

Ограничения и индексы:
- `time_entries_time_chk` (`ended_at is null or ended_at >= started_at`)
- `time_entries_user_active_uq` уникально по `(user_id)` когда `ended_at is null`
- `time_entries_user_started_idx` по `(user_id, started_at)`
- `time_entries_user_context_started_idx` по `(user_id, context_id, started_at)`
- `time_entries_user_goal_started_idx` по `(user_id, goal_id, started_at)`

### `counter_events`
События счетчика.

Поля:
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK -> `users(id)`, `on delete cascade`
- `occurred_at` timestamptz
- `value_delta` integer
- `context_id` uuid, FK -> `contexts(id)`, `on delete restrict`
- `goal_id` uuid, FK -> `goals(id)`, `on delete set null`
- `created_at` timestamptz, default `now()`

Индексы:
- `counter_events_user_occurred_idx` по `(user_id, occurred_at)`

### `check_events`
События чек-целей (сделал/не сделал).

Поля:
- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, FK -> `users(id)`, `on delete cascade`
- `occurred_at` timestamptz
- `state` boolean
- `context_id` uuid, FK -> `contexts(id)`, `on delete restrict`
- `goal_id` uuid, FK -> `goals(id)`, `on delete set null`
- `created_at` timestamptz, default `now()`

Индексы:
- `check_events_user_occurred_idx` по `(user_id, occurred_at)`

### `goal_tags`
Связь целей и тегов (M2M).

Поля:
- `goal_id` uuid, FK -> `goals(id)`, `on delete cascade`
- `tag_id` uuid, FK -> `tags(id)`, `on delete cascade`
- `created_at` timestamptz, default `now()`

Индексы:
- PK `(goal_id, tag_id)`
- `goal_tags_tag_id_idx` по `(tag_id)`

### `time_entry_tags`
Связь временных сессий и тегов (M2M).

Поля:
- `time_entry_id` uuid, FK -> `time_entries(id)`, `on delete cascade`
- `tag_id` uuid, FK -> `tags(id)`, `on delete cascade`
- `created_at` timestamptz, default `now()`

Индексы:
- PK `(time_entry_id, tag_id)`
- `time_entry_tags_tag_id_idx` по `(tag_id)`

### `counter_event_tags`
Связь событий счетчика и тегов (M2M).

Поля:
- `counter_event_id` uuid, FK -> `counter_events(id)`, `on delete cascade`
- `tag_id` uuid, FK -> `tags(id)`, `on delete cascade`
- `created_at` timestamptz, default `now()`

Индексы:
- PK `(counter_event_id, tag_id)`
- `counter_event_tags_tag_id_idx` по `(tag_id)`

### `check_event_tags`
Связь чек-событий и тегов (M2M).

Поля:
- `check_event_id` uuid, FK -> `check_events(id)`, `on delete cascade`
- `tag_id` uuid, FK -> `tags(id)`, `on delete cascade`
- `created_at` timestamptz, default `now()`

Индексы:
- PK `(check_event_id, tag_id)`
- `check_event_tags_tag_id_idx` по `(tag_id)`

### `goal_periods`
Кэшированные периоды цели (успех/провал по периоду).

Поля:
- `id` uuid, PK, default `gen_random_uuid()`
- `goal_id` uuid, FK -> `goals(id)`, `on delete cascade`
- `period_start` date
- `period_end` date
- `actual_value` integer
- `status` varchar(16), значения: `success | fail | in_progress | archived`
- `calculated_at` timestamptz

Ограничения и индексы:
- `goal_periods_period_chk` (`period_start <= period_end`)
- `goal_periods_goal_period_uq` уникально по `(goal_id, period_start, period_end)`
- `goal_periods_goal_start_idx` по `(goal_id, period_start)`

## RLS (важные принципы)

- Все `select/update/delete` завязаны на принадлежность `user_id`.
- Для `insert/update` проверяется принадлежность связанных сущностей (`context_id`, `goal_id`).
- Для `*_tags` проверяется принадлежность обеих сторон связи.
