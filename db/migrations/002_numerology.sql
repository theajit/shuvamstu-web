alter table providers drop constraint if exists providers_type_check;
alter table providers add constraint providers_type_check check(type in ('PANDIT','ASTROLOGER','NUMEROLOGIST'));
