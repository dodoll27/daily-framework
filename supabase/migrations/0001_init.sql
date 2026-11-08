-- Daily Framework — initial schema
-- Six tables, all scoped to the user via RLS. Weekly totals, the furthest-behind
-- block and the streak are computed from sessions + days, never stored.
-- Times of day are stored as minutes from midnight (540 = 09:00).

create extension if not exists pgcrypto;

-- ───────────────────────── blocks
create table public.blocks (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name                   text not null,
  color                  text not null default '#64748b',
  weekly_target_minutes  int,             -- hour-based blocks
  target_sessions        int,             -- session-based blocks (Sport)
  is_floor               boolean not null default false, -- counts as the streak "floor" block (Job search)
  deep_only              boolean not null default false, -- never scheduled in tired/shallow slots (Learning)
  prioritize             boolean not null default true,  -- eligible for the "furthest behind" suggestion
  sort_order             int not null default 0,
  created_at             timestamptz not null default now()
);

-- ───────────────────────── day templates
-- slots: [{ "start": 540, "end": 660, "block_id": "...", "energy": "deep" | "shallow" }]
create table public.day_templates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name           text not null,
  description    text,
  place_default  text not null default 'home' check (place_default in ('home','outside')),
  slots          jsonb not null default '[]'::jsonb,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- ───────────────────────── tasks
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  block_id    uuid not null references public.blocks(id) on delete cascade,
  title       text not null,
  energy      text not null default 'shallow' check (energy in ('deep','shallow')),
  status      text not null default 'open' check (status in ('open','archived')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index tasks_user_block_idx on public.tasks (user_id, block_id, status, sort_order);

-- ───────────────────────── days
create table public.days (
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date           date not null,
  template_id    uuid references public.day_templates(id) on delete set null,
  place_default  text not null default 'home' check (place_default in ('home','outside')),
  review_done    boolean not null default false,
  energy_note    text,
  mood           int check (mood between 1 and 5),
  is_freeze      boolean not null default false,
  created_at     timestamptz not null default now(),
  primary key (user_id, date)
);

-- ───────────────────────── slots
create table public.slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  start_min   int not null check (start_min >= 0 and start_min < 1440),
  end_min     int not null check (end_min > start_min and end_min <= 1440),
  block_id    uuid not null references public.blocks(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,
  label       text,                -- "2h on the plan checker"
  energy      text not null default 'deep' check (energy in ('deep','shallow')),
  status      text not null default 'planned' check (status in ('planned','honoured','adjusted','skipped')),
  created_at  timestamptz not null default now()
);
create index slots_user_date_idx on public.slots (user_id, date, start_min);

-- ───────────────────────── sessions
create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slot_id     uuid references public.slots(id) on delete set null,
  block_id    uuid not null references public.blocks(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete set null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,          -- null = timer running
  place       text not null default 'home' check (place in ('home','outside')),
  source      text not null default 'timer' check (source in ('timer','manual','fried')),
  created_at  timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create index sessions_user_started_idx on public.sessions (user_id, started_at);
create unique index sessions_one_running_idx on public.sessions (user_id) where ended_at is null;

-- ───────────────────────── RLS
do $$
declare t text;
begin
  foreach t in array array['blocks','day_templates','tasks','days','slots','sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ───────────────────────── seed defaults for every new user
create or replace function public.seed_user_defaults(uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b_projects uuid; b_job uuid; b_learning uuid; b_sport uuid; b_social uuid;
begin
  if exists (select 1 from public.blocks where user_id = uid) then return; end if;

  insert into public.blocks (user_id, name, color, weekly_target_minutes, target_sessions, is_floor, deep_only, prioritize, sort_order)
  values (uid, 'Projects', '#6366f1', 15*60, null, false, false, true, 0) returning id into b_projects;
  insert into public.blocks (user_id, name, color, weekly_target_minutes, target_sessions, is_floor, deep_only, prioritize, sort_order)
  values (uid, 'Job search', '#f59e0b', 10*60, null, true, false, true, 1) returning id into b_job;
  insert into public.blocks (user_id, name, color, weekly_target_minutes, target_sessions, is_floor, deep_only, prioritize, sort_order)
  values (uid, 'Learning', '#10b981', 7*60, null, false, true, true, 2) returning id into b_learning;
  insert into public.blocks (user_id, name, color, weekly_target_minutes, target_sessions, is_floor, deep_only, prioritize, sort_order)
  values (uid, 'Sport', '#ef4444', null, 4, false, false, false, 3) returning id into b_sport;
  insert into public.blocks (user_id, name, color, weekly_target_minutes, target_sessions, is_floor, deep_only, prioritize, sort_order)
  values (uid, 'Social', '#ec4899', 3*60, null, false, false, false, 4) returning id into b_social;

  insert into public.day_templates (user_id, name, description, place_default, sort_order, slots) values
  (uid, 'Hard training', 'Job search first, workout midday, shallow afternoon', 'home', 0, jsonb_build_array(
    jsonb_build_object('start', 540,  'end', 660,  'block_id', b_job,      'energy', 'deep'),
    jsonb_build_object('start', 660,  'end', 750,  'block_id', b_projects, 'energy', 'shallow'),
    jsonb_build_object('start', 780,  'end', 870,  'block_id', b_sport,    'energy', 'deep'),
    jsonb_build_object('start', 930,  'end', 1080, 'block_id', b_projects, 'energy', 'shallow')
  )),
  (uid, 'Light training', 'Job search, learning, short workout, deep project block', 'home', 1, jsonb_build_array(
    jsonb_build_object('start', 540,  'end', 660,  'block_id', b_job,      'energy', 'deep'),
    jsonb_build_object('start', 660,  'end', 750,  'block_id', b_learning, 'energy', 'deep'),
    jsonb_build_object('start', 750,  'end', 810,  'block_id', b_sport,    'energy', 'deep'),
    jsonb_build_object('start', 870,  'end', 1080, 'block_id', b_projects, 'energy', 'deep')
  )),
  (uid, 'Rest', 'No workout: long project block, good day to work outside', 'outside', 2, jsonb_build_array(
    jsonb_build_object('start', 540,  'end', 660,  'block_id', b_job,      'energy', 'deep'),
    jsonb_build_object('start', 660,  'end', 750,  'block_id', b_learning, 'energy', 'deep'),
    jsonb_build_object('start', 840,  'end', 1080, 'block_id', b_projects, 'energy', 'deep')
  ));

  insert into public.tasks (user_id, block_id, title, energy, sort_order) values
    (uid, b_job,      'Send 2 applications',           'shallow', 0),
    (uid, b_job,      'Follow-ups on open applications','shallow', 1),
    (uid, b_job,      'Interview prep: system design',  'deep',    2),
    (uid, b_projects, 'Room OS: deep work',             'deep',    0),
    (uid, b_projects, 'Fix lint + tests',               'shallow', 1),
    (uid, b_projects, 'CSS polish on portfolio',        'shallow', 2),
    (uid, b_learning, 'Course: next module',            'deep',    0),
    (uid, b_learning, 'Flashcards',                     'shallow', 1),
    (uid, b_sport,    'Workout',                        'deep',    0),
    (uid, b_social,   'Evening out',                    'shallow', 0);
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration can call this via RPC.
create or replace function public.ensure_defaults()
returns void language sql security definer set search_path = public as $$
  select public.seed_user_defaults(auth.uid());
$$;
revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;
grant execute on function public.ensure_defaults() to authenticated;
