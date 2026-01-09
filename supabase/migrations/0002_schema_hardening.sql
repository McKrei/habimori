alter table public.time_entries
  drop constraint if exists time_entries_time_chk,
  add constraint time_entries_time_chk check (ended_at is null or ended_at >= started_at);

alter table public.goals
  drop constraint if exists goals_dates_chk,
  add constraint goals_dates_chk check (start_date <= end_date);

create unique index if not exists goal_periods_goal_period_uq on public.goal_periods (goal_id, period_start, period_end);
create index if not exists goal_periods_goal_start_idx on public.goal_periods (goal_id, period_start);

create index if not exists time_entries_user_started_idx on public.time_entries (user_id, started_at);
create index if not exists time_entries_user_context_started_idx on public.time_entries (user_id, context_id, started_at);
create index if not exists time_entries_user_goal_started_idx on public.time_entries (user_id, goal_id, started_at);
create index if not exists counter_events_user_occurred_idx on public.counter_events (user_id, occurred_at);
create index if not exists check_events_user_occurred_idx on public.check_events (user_id, occurred_at);

create index if not exists goal_tags_tag_id_idx on public.goal_tags (tag_id);
create index if not exists time_entry_tags_tag_id_idx on public.time_entry_tags (tag_id);
create index if not exists counter_event_tags_tag_id_idx on public.counter_event_tags (tag_id);
create index if not exists check_event_tags_tag_id_idx on public.check_event_tags (tag_id);

create unique index if not exists time_entries_user_active_uq on public.time_entries (user_id)
  where ended_at is null;

drop index if exists public.contexts_user_name_uq;
create unique index contexts_user_name_uq on public.contexts (user_id, lower(name));

drop index if exists public.tags_user_name_uq;
create unique index tags_user_name_uq on public.tags (user_id, lower(name));

alter table public.goals
  drop constraint if exists goals_context_id_fkey,
  add constraint goals_context_id_fkey
    foreign key (context_id) references public.contexts (id) on delete restrict;

alter table public.time_entries
  drop constraint if exists time_entries_context_id_fkey,
  add constraint time_entries_context_id_fkey
    foreign key (context_id) references public.contexts (id) on delete restrict;

alter table public.counter_events
  drop constraint if exists counter_events_context_id_fkey,
  add constraint counter_events_context_id_fkey
    foreign key (context_id) references public.contexts (id) on delete restrict;

alter table public.check_events
  drop constraint if exists check_events_context_id_fkey,
  add constraint check_events_context_id_fkey
    foreign key (context_id) references public.contexts (id) on delete restrict;
