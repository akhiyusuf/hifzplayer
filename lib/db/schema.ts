/** DDL applied on first Neon query. Keep in sync with db/schema.sql. */

export const SCHEMA_STATEMENTS = [
  `create table if not exists users (
  id text primary key,
  email text not null unique,
  name text,
  password_hash text,
  google_sub text,
  created_at timestamptz not null default now(),
  trial_used_at timestamptz,
  welcome_sent_for text
)`,
  `alter table users add column if not exists password_hash text`,
  `alter table users add column if not exists google_sub text`,
  `create unique index if not exists users_google_sub on users (google_sub)`,
  `create table if not exists otp_challenges (
  id text primary key,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
)`,
  `create index if not exists otp_challenges_email_created
  on otp_challenges (email, created_at desc)`,
  `create table if not exists sessions (
  id text primary key,
  user_id text not null references users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
)`,
  `create index if not exists sessions_user on sessions (user_id)`,
  `create table if not exists entitlements (
  user_id text primary key references users (id) on delete cascade,
  plus boolean not null default false,
  plan_id text not null,
  region_id text not null,
  processor text not null,
  until timestamptz,
  ref text not null,
  sub text,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  welcome_sent_for text,
  events jsonb not null default '[]'::jsonb
)`,
  `create table if not exists gift_holds (
  id text primary key,
  buyer_id text not null references users (id) on delete cascade,
  ref text not null,
  plan_id text not null,
  region_id text not null,
  processor text not null,
  until timestamptz,
  sub text,
  recipient_email text,
  recipient_user_id text,
  sent_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
)`,
  `create index if not exists gift_holds_buyer on gift_holds (buyer_id, created_at desc)`,
  `create index if not exists gift_holds_recipient_email on gift_holds (recipient_email)`,
  `create table if not exists practice_sessions (
  user_id text not null references users (id) on delete cascade,
  chapter int not null,
  range_from int not null,
  range_to int not null,
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  primary key (user_id, chapter, range_from, range_to)
)`,
  `create index if not exists practice_sessions_user_updated
  on practice_sessions (user_id, updated_at desc)`,
];
