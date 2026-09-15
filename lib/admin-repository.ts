import {randomUUID} from 'node:crypto';
import postgres from 'postgres';

const connection=process.env.DATABASE_URL;
const sql=connection?postgres(connection,{max:5,idle_timeout:20,connect_timeout:10}):null;
function db(){if(!sql)throw new Error('DATABASE_NOT_CONFIGURED');return sql}

export async function getAdminDashboard(){
  const database=db();
  const [bookings,providers,services,rules,exceptions]=await Promise.all([
    database`select b.id::text,b.reference,b.provider_id as "providerId",p.name as "providerName",b.service_slug as "serviceSlug",b.customer_name as "customerName",b.customer_email as "customerEmail",b.customer_phone as "customerPhone",b.location_mode as "locationMode",b.venue,b.timezone,b.local_date::text as "localDate",to_char(b.local_time,'HH24:MI') as "localTime",b.status,b.customer_message as "customerMessage",b.created_at::text as "createdAt" from bookings b join providers p on p.id=b.provider_id order by b.created_at desc limit 250`,
    database`select id,name,type,active,timezone,created_at::text as "createdAt" from providers order by active desc,name`,
    database`select provider_id as "providerId",service_slug as "serviceSlug",duration_minutes as "durationMinutes",buffer_before_minutes as "bufferBeforeMinutes",buffer_after_minutes as "bufferAfterMinutes",capacity,booking_mode as "bookingMode",allowed_location_modes as "allowedLocationModes",active from provider_services order by provider_id,service_slug`,
    database`select id,provider_id as "providerId",day_of_week as "dayOfWeek",to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",timezone,capacity,active from availability_rules order by provider_id,day_of_week,local_start_time`,
    database`select id,provider_id as "providerId",local_date::text as "localDate",type,to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",capacity from availability_exceptions where local_date>=current_date-interval '30 days' order by local_date desc`
  ]);
  return {bookings,providers,services,rules,exceptions};
}

type ProviderInput={id?:string;name:string;type:'PANDIT'|'ASTROLOGER';timezone:string;active:boolean};
export async function saveProvider(input:ProviderInput){
  const id=input.id||randomUUID();
  const [row]=await db()`insert into providers(id,name,type,timezone,active) values(${id},${input.name},${input.type},${input.timezone},${input.active}) on conflict(id) do update set name=excluded.name,type=excluded.type,timezone=excluded.timezone,active=excluded.active,updated_at=now() returning id`;
  return row;
}

type ServiceInput={providerId:string;serviceSlug:string;durationMinutes:number;bufferBeforeMinutes:number;bufferAfterMinutes:number;capacity:number;bookingMode:'INSTANT'|'REQUEST';allowedLocationModes:string[];active:boolean};
export async function saveProviderService(input:ServiceInput){
  await db()`insert into provider_services(provider_id,service_slug,duration_minutes,buffer_before_minutes,buffer_after_minutes,capacity,booking_mode,allowed_location_modes,active) values(${input.providerId},${input.serviceSlug},${input.durationMinutes},${input.bufferBeforeMinutes},${input.bufferAfterMinutes},${input.capacity},${input.bookingMode},${input.allowedLocationModes},${input.active}) on conflict(provider_id,service_slug) do update set duration_minutes=excluded.duration_minutes,buffer_before_minutes=excluded.buffer_before_minutes,buffer_after_minutes=excluded.buffer_after_minutes,capacity=excluded.capacity,booking_mode=excluded.booking_mode,allowed_location_modes=excluded.allowed_location_modes,active=excluded.active`;
}

type RuleInput={id?:string;providerId:string;dayOfWeek:number;localStartTime:string;localEndTime:string;timezone:string;capacity:number;active:boolean};
export async function saveRule(input:RuleInput){const id=input.id||randomUUID();await db()`insert into availability_rules(id,provider_id,day_of_week,local_start_time,local_end_time,timezone,capacity,active) values(${id},${input.providerId},${input.dayOfWeek},${input.localStartTime},${input.localEndTime},${input.timezone},${input.capacity},${input.active}) on conflict(id) do update set provider_id=excluded.provider_id,day_of_week=excluded.day_of_week,local_start_time=excluded.local_start_time,local_end_time=excluded.local_end_time,timezone=excluded.timezone,capacity=excluded.capacity,active=excluded.active`;return {id}}
export async function deleteRule(id:string){await db()`delete from availability_rules where id=${id}`}

type ExceptionInput={id?:string;providerId:string;localDate:string;type:'UNAVAILABLE'|'CUSTOM_HOURS';localStartTime?:string;localEndTime?:string;capacity?:number};
export async function saveException(input:ExceptionInput){const id=input.id||randomUUID();await db()`insert into availability_exceptions(id,provider_id,local_date,type,local_start_time,local_end_time,capacity) values(${id},${input.providerId},${input.localDate},${input.type},${input.localStartTime||null},${input.localEndTime||null},${input.capacity||null}) on conflict(provider_id,local_date) do update set type=excluded.type,local_start_time=excluded.local_start_time,local_end_time=excluded.local_end_time,capacity=excluded.capacity`;return {id}}
export async function deleteException(id:string){await db()`delete from availability_exceptions where id=${id}`}

export async function updateBookingStatus(id:string,status:string){const [row]=await db()`update bookings set status=${status},updated_at=now() where id=${id}::bigint returning id::text`;if(!row)throw new Error('BOOKING_NOT_FOUND')}
