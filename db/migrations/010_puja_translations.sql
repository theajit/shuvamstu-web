create table if not exists puja_translations(
  puja_id uuid not null references pujas(id) on delete cascade,
  locale text not null check(locale in('hi-IN','od-IN')),
  name text not null default '',
  short_description text not null default '',
  full_description text not null default '',
  source_hash text not null,
  status text not null default 'PENDING' check(status in('PENDING','COMPLETED','FAILED')),
  error_message text,
  translated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(puja_id,locale)
);

create index if not exists puja_translations_status_idx on puja_translations(status,updated_at);
