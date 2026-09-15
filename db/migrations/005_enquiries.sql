create table if not exists enquiries (
  id bigint generated always as identity primary key,
  reference text not null unique,
  name text not null,
  email text not null,
  service_slug text,
  puja_category text,
  preferred_date date,
  message text,
  status text not null default 'NEW' check(status in ('NEW','CONTACTED','CONVERTED','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_status_created_idx on enquiries(status,created_at desc);
