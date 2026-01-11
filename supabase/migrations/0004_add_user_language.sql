alter table public.users
add column if not exists language text not null default 'en';

update public.users
set language = 'en'
where language is null;
