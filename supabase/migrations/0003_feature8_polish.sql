alter table public.goals
  add column if not exists is_archived boolean not null default false;

alter table public.goal_periods
  drop constraint if exists goal_periods_status_chk;

alter table public.goal_periods
  add constraint goal_periods_status_chk check (
    status in ('success', 'fail', 'in_progress', 'archived')
  );
