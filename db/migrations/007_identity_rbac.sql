create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('CUSTOMER','PUJARI','ADMIN')),
  status text not null default 'ACTIVE' check (status in ('INVITED','ACTIVE','SUSPENDED','DELETED')),
  display_name text not null,
  phone_e164 text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists app_users_email_active_unique on app_users(lower(email)) where deleted_at is null;

create table if not exists auth_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('LOGIN','SIGNUP','INVITE')),
  otp_hash text not null,
  role_hint text check (role_hint is null or role_hint in ('CUSTOMER','PUJARI','ADMIN')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  request_ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists auth_otp_lookup_idx on auth_otp_challenges(lower(email),created_at desc) where consumed_at is null;

create table if not exists app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_sessions_user_idx on app_sessions(user_id,expires_at desc);

create table if not exists customer_profiles (
  user_id uuid primary key references app_users(id),
  whatsapp_e164 text,
  privacy_consent_at timestamptz not null,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pujari_user_profiles (
  user_id uuid primary key references app_users(id),
  provider_id text not null unique references providers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_profiles (
  user_id uuid primary key references app_users(id),
  title text,
  created_at timestamptz not null default now()
);

alter table bookings add column if not exists customer_user_id uuid references app_users(id);
create index if not exists bookings_customer_user_idx on bookings(customer_user_id,created_at desc);

alter table booking_events add column if not exists actor_user_id uuid references app_users(id);
alter table booking_events drop constraint if exists booking_events_actor_check;
alter table booking_events add constraint booking_events_actor_check check(actor in ('CUSTOMER','PUJARI','ADMIN','SYSTEM'));

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references app_users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  reason text,
  before_summary jsonb,
  after_summary jsonb,
  request_ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on audit_logs(entity_type,entity_id,created_at desc);
