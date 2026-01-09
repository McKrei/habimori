create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email varchar(320),
  name varchar(120),
  created_at timestamptz not null default now()
);

create table if not exists public.contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name varchar(80) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name varchar(60) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title varchar(160) not null,
  goal_type varchar(16) not null,
  period varchar(8) not null,
  target_value integer not null,
  target_op varchar(3) not null,
  start_date date not null,
  end_date date not null,
  context_id uuid not null references public.contexts (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint goals_goal_type_chk check (goal_type in ('time', 'counter', 'check')),
  constraint goals_period_chk check (period in ('day', 'week', 'month')),
  constraint goals_target_op_chk check (target_op in ('gte', 'lte')),
  constraint goals_target_value_chk check (target_value >= 0),
  constraint goals_dates_chk check (start_date <= end_date)
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  context_id uuid not null references public.contexts (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint time_entries_time_chk check (ended_at is null or ended_at > started_at)
);

create table if not exists public.counter_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  occurred_at timestamptz not null,
  value_delta integer not null,
  context_id uuid not null references public.contexts (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.check_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  occurred_at timestamptz not null,
  state boolean not null,
  context_id uuid not null references public.contexts (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.goal_tags (
  goal_id uuid not null references public.goals (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, tag_id)
);

create table if not exists public.time_entry_tags (
  time_entry_id uuid not null references public.time_entries (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (time_entry_id, tag_id)
);

create table if not exists public.counter_event_tags (
  counter_event_id uuid not null references public.counter_events (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (counter_event_id, tag_id)
);

create table if not exists public.check_event_tags (
  check_event_id uuid not null references public.check_events (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (check_event_id, tag_id)
);

create table if not exists public.goal_periods (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  actual_value integer not null,
  status varchar(16) not null,
  calculated_at timestamptz,
  constraint goal_periods_status_chk check (status in ('success', 'fail', 'in_progress')),
  constraint goal_periods_period_chk check (period_start <= period_end)
);

create unique index if not exists contexts_user_name_uq on public.contexts (user_id, name);
create unique index if not exists tags_user_name_uq on public.tags (user_id, name);

create index if not exists goals_user_period_idx on public.goals (user_id, period, is_active);
create index if not exists time_entries_user_started_idx on public.time_entries (user_id, started_at);
create index if not exists counter_events_user_occurred_idx on public.counter_events (user_id, occurred_at);
create index if not exists check_events_user_occurred_idx on public.check_events (user_id, occurred_at);
create unique index if not exists goal_periods_goal_period_uq on public.goal_periods (goal_id, period_start, period_end);
create index if not exists goal_periods_goal_start_idx on public.goal_periods (goal_id, period_start);
create index if not exists goal_tags_tag_id_idx on public.goal_tags (tag_id);
create index if not exists time_entry_tags_tag_id_idx on public.time_entry_tags (tag_id);
create index if not exists counter_event_tags_tag_id_idx on public.counter_event_tags (tag_id);
create index if not exists check_event_tags_tag_id_idx on public.check_event_tags (tag_id);

alter table public.users enable row level security;
alter table public.contexts enable row level security;
alter table public.tags enable row level security;
alter table public.goals enable row level security;
alter table public.time_entries enable row level security;
alter table public.counter_events enable row level security;
alter table public.check_events enable row level security;
alter table public.goal_tags enable row level security;
alter table public.time_entry_tags enable row level security;
alter table public.counter_event_tags enable row level security;
alter table public.check_event_tags enable row level security;
alter table public.goal_periods enable row level security;

create policy users_select on public.users
  for select
  using (id = auth.uid());

create policy users_insert on public.users
  for insert
  with check (id = auth.uid());

create policy users_update on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy users_delete on public.users
  for delete
  using (id = auth.uid());

create policy contexts_select on public.contexts
  for select
  using (user_id = auth.uid());

create policy contexts_insert on public.contexts
  for insert
  with check (user_id = auth.uid());

create policy contexts_update on public.contexts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy contexts_delete on public.contexts
  for delete
  using (user_id = auth.uid());

create policy tags_select on public.tags
  for select
  using (user_id = auth.uid());

create policy tags_insert on public.tags
  for insert
  with check (user_id = auth.uid());

create policy tags_update on public.tags
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tags_delete on public.tags
  for delete
  using (user_id = auth.uid());

create policy goals_select on public.goals
  for select
  using (user_id = auth.uid());

create policy goals_insert on public.goals
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
  );

create policy goals_update on public.goals
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
  );

create policy goals_delete on public.goals
  for delete
  using (user_id = auth.uid());

create policy time_entries_select on public.time_entries
  for select
  using (user_id = auth.uid());

create policy time_entries_insert on public.time_entries
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
    and (
      goal_id is null or exists (
        select 1 from public.goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    )
  );

create policy time_entries_update on public.time_entries
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
    and (
      goal_id is null or exists (
        select 1 from public.goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    )
  );

create policy time_entries_delete on public.time_entries
  for delete
  using (user_id = auth.uid());

create policy counter_events_select on public.counter_events
  for select
  using (user_id = auth.uid());

create policy counter_events_insert on public.counter_events
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
    and (
      goal_id is null or exists (
        select 1 from public.goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    )
  );

create policy counter_events_update on public.counter_events
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
    and (
      goal_id is null or exists (
        select 1 from public.goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    )
  );

create policy counter_events_delete on public.counter_events
  for delete
  using (user_id = auth.uid());

create policy check_events_select on public.check_events
  for select
  using (user_id = auth.uid());

create policy check_events_insert on public.check_events
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
    and (
      goal_id is null or exists (
        select 1 from public.goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    )
  );

create policy check_events_update on public.check_events
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.contexts c
      where c.id = context_id and c.user_id = auth.uid()
    )
    and (
      goal_id is null or exists (
        select 1 from public.goals g
        where g.id = goal_id and g.user_id = auth.uid()
      )
    )
  );

create policy check_events_delete on public.check_events
  for delete
  using (user_id = auth.uid());

create policy goal_tags_select on public.goal_tags
  for select
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create policy goal_tags_insert on public.goal_tags
  for insert
  with check (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );

create policy goal_tags_delete on public.goal_tags
  for delete
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create policy time_entry_tags_select on public.time_entry_tags
  for select
  using (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_id and te.user_id = auth.uid()
    )
  );

create policy time_entry_tags_insert on public.time_entry_tags
  for insert
  with check (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_id and te.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );

create policy time_entry_tags_delete on public.time_entry_tags
  for delete
  using (
    exists (
      select 1 from public.time_entries te
      where te.id = time_entry_id and te.user_id = auth.uid()
    )
  );

create policy counter_event_tags_select on public.counter_event_tags
  for select
  using (
    exists (
      select 1 from public.counter_events ce
      where ce.id = counter_event_id and ce.user_id = auth.uid()
    )
  );

create policy counter_event_tags_insert on public.counter_event_tags
  for insert
  with check (
    exists (
      select 1 from public.counter_events ce
      where ce.id = counter_event_id and ce.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );

create policy counter_event_tags_delete on public.counter_event_tags
  for delete
  using (
    exists (
      select 1 from public.counter_events ce
      where ce.id = counter_event_id and ce.user_id = auth.uid()
    )
  );

create policy check_event_tags_select on public.check_event_tags
  for select
  using (
    exists (
      select 1 from public.check_events ce
      where ce.id = check_event_id and ce.user_id = auth.uid()
    )
  );

create policy check_event_tags_insert on public.check_event_tags
  for insert
  with check (
    exists (
      select 1 from public.check_events ce
      where ce.id = check_event_id and ce.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );

create policy check_event_tags_delete on public.check_event_tags
  for delete
  using (
    exists (
      select 1 from public.check_events ce
      where ce.id = check_event_id and ce.user_id = auth.uid()
    )
  );

create policy goal_periods_select on public.goal_periods
  for select
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create policy goal_periods_insert on public.goal_periods
  for insert
  with check (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create policy goal_periods_update on public.goal_periods
  for update
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create policy goal_periods_delete on public.goal_periods
  for delete
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );
