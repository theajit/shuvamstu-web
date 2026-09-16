create table if not exists ui_translations(
  source_hash text not null,
  locale text not null check(locale in('hi-IN','od-IN')),
  source_text text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(source_hash,locale)
);
create index if not exists ui_translations_locale_idx on ui_translations(locale,updated_at);
