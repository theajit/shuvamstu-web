alter table bookings add column if not exists manage_token_hash text;
alter table bookings add column if not exists admin_notes text;
alter table bookings add column if not exists meeting_url text;
create unique index if not exists bookings_manage_token_hash_idx on bookings(manage_token_hash) where manage_token_hash is not null;
create table if not exists booking_events (
  id bigint generated always as identity primary key,
  booking_id bigint not null references bookings(id) on delete cascade,
  event_type text not null,
  actor text not null check(actor in ('CUSTOMER','ADMIN','SYSTEM')),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists booking_events_booking_idx on booking_events(booking_id,created_at desc);
