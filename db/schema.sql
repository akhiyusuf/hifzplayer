-- Diras user rows. Apply on Neon when DATABASE_URL is set.
-- Plus still also lives on Clerk private metadata until a later cutover.
-- Quran audio does not belong here — use R2.

create table if not exists entitlements (
  user_id text primary key,
  plus boolean not null default false,
  plan_id text not null,
  region_id text not null,
  processor text not null,
  until timestamptz,
  ref text not null,
  sub text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text
);

create table if not exists practice_sessions (
  user_id text not null,
  chapter int not null,
  range_from int not null,
  range_to int not null,
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, chapter, range_from, range_to)
);

create index if not exists practice_sessions_user_updated
  on practice_sessions (user_id, updated_at desc);
