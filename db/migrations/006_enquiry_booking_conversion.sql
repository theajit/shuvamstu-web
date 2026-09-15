-- Phone is nullable at the schema level only so legacy enquiries without a
-- captured number remain readable. New writes enforce it in the application;
-- after legacy rows are repaired a later migration can make it NOT NULL.
alter table enquiries add column if not exists phone text;
alter table enquiries alter column email drop not null;
alter table bookings alter column customer_email drop not null;

alter table enquiries add column if not exists booking_id bigint;

create unique index if not exists enquiries_booking_id_unique_idx
  on enquiries(booking_id)
  where booking_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enquiries_booking_id_fkey'
      and conrelid = 'enquiries'::regclass
  ) then
    alter table enquiries
      add constraint enquiries_booking_id_fkey
      foreign key (booking_id) references bookings(id);
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enquiries_converted_booking_check'
      and conrelid = 'enquiries'::regclass
  ) then
    alter table enquiries
      add constraint enquiries_converted_booking_check
      check (booking_id is null or status = 'CONVERTED');
  end if;
end
$$;
