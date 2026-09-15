import {createHash,randomBytes,randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {generateAvailableSlots,generateBookingReference,type AvailabilityException,type AvailabilityRule,type ExistingBooking,type LocationMode,type Provider,type ProviderService} from './scheduling';

const connection=process.env.DATABASE_URL;
const sql=connection?postgres(connection,{max:5,idle_timeout:20,connect_timeout:10}):null;
function db(){if(!sql)throw new Error('DATABASE_NOT_CONFIGURED');return sql}

export async function getAdminDashboard(){
  const database=db();
  const [bookings,providers,services,rules,exceptions,enquiries]=await Promise.all([
    database`select b.id::text,b.reference,b.provider_id as "providerId",p.name as "providerName",b.service_slug as "serviceSlug",b.customer_name as "customerName",b.customer_email as "customerEmail",b.customer_phone as "customerPhone",b.location_mode as "locationMode",b.venue,b.timezone,b.local_date::text as "localDate",to_char(b.local_time,'HH24:MI') as "localTime",b.requested_start::text as "requestedStart",b.requested_end::text as "requestedEnd",b.status,b.customer_message as "customerMessage",b.admin_notes as "adminNotes",b.meeting_url as "meetingUrl",b.created_at::text as "createdAt",coalesce((select json_agg(json_build_object('type',e.event_type,'actor',e.actor,'details',e.details,'createdAt',e.created_at) order by e.created_at desc) from booking_events e where e.booking_id=b.id),'[]') as events from bookings b join providers p on p.id=b.provider_id order by b.local_date desc,b.local_time desc limit 500`,
    database`select id,name,type,active,timezone,slug,bio,experience_years as "experienceYears",city,languages,specialties,qualifications,photo_url as "photoUrl",published,created_at::text as "createdAt" from providers order by active desc,name`,
    database`select provider_id as "providerId",service_slug as "serviceSlug",duration_minutes as "durationMinutes",buffer_before_minutes as "bufferBeforeMinutes",buffer_after_minutes as "bufferAfterMinutes",capacity,booking_mode as "bookingMode",allowed_location_modes as "allowedLocationModes",active from provider_services order by provider_id,service_slug`,
    database`select id,provider_id as "providerId",day_of_week as "dayOfWeek",to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",timezone,capacity,active from availability_rules order by provider_id,day_of_week,local_start_time`,
    database`select id,provider_id as "providerId",local_date::text as "localDate",type,to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",capacity from availability_exceptions where local_date>=current_date-interval '30 days' order by local_date desc`,
    database`select e.id::text,e.reference,e.name,e.email,e.phone,e.service_slug as "serviceSlug",e.puja_category as "pujaCategory",e.preferred_date::text as "preferredDate",e.message,e.status,e.booking_id::text as "bookingId",b.reference as "bookingReference",e.created_at::text as "createdAt" from enquiries e left join bookings b on b.id=e.booking_id order by e.created_at desc limit 500`
  ]);
  return {bookings,providers,services,rules,exceptions,enquiries};
}

type ProviderInput={id?:string;name:string;type:'PANDIT'|'ASTROLOGER'|'NUMEROLOGIST';timezone:string;active:boolean;slug:string;bio:string;experienceYears:number|null;city:string;languages:string[];specialties:string[];qualifications:string;photoUrl:string;published:boolean};
export async function saveProvider(input:ProviderInput){
  const id=input.id||randomUUID();
  const [row]=await db()`insert into providers(id,name,type,timezone,active,slug,bio,experience_years,city,languages,specialties,qualifications,photo_url,published) values(${id},${input.name},${input.type},${input.timezone},${input.active},${input.slug||null},${input.bio||null},${input.experienceYears},${input.city||null},${input.languages},${input.specialties},${input.qualifications||null},${input.photoUrl||null},${input.published}) on conflict(id) do update set name=excluded.name,type=excluded.type,timezone=excluded.timezone,active=excluded.active,slug=excluded.slug,bio=excluded.bio,experience_years=excluded.experience_years,city=excluded.city,languages=excluded.languages,specialties=excluded.specialties,qualifications=excluded.qualifications,photo_url=excluded.photo_url,published=excluded.published,updated_at=now() returning id`;
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

export async function updateBookingStatus(id:string,status:string,adminNotes:string,meetingUrl:string){return db().begin(async transaction=>{const [row]=await transaction`update bookings set status=${status},admin_notes=${adminNotes||null},meeting_url=${meetingUrl||null},updated_at=now() where id=${id}::bigint returning id::text,reference,customer_email as "customerEmail",service_slug as "serviceSlug",local_date::text as "localDate",to_char(local_time,'HH24:MI') as "localTime",status`;if(!row)throw new Error('BOOKING_NOT_FOUND');await transaction`insert into booking_events(booking_id,event_type,actor,details) values(${id}::bigint,'STATUS_UPDATED','ADMIN',${transaction.json({status,adminNotes,meetingUrl})})`;return row})}

export async function rescheduleBooking(input:{id:string;localDate:string;localTime:string;requestedStart:string;requestedEnd:string;status:string;actor?:'ADMIN'|'CUSTOMER'}){return db().begin(async transaction=>{
  const [booking]=await transaction`select b.id,b.provider_id as "providerId",b.capacity_used as "capacityUsed",b.buffer_before_minutes as "bufferBeforeMinutes",b.buffer_after_minutes as "bufferAfterMinutes",ps.capacity,b.reference,b.customer_email as "customerEmail",b.service_slug as "serviceSlug" from bookings b join provider_services ps on ps.provider_id=b.provider_id and ps.service_slug=b.service_slug where b.id=${input.id}::bigint`;
  if(!booking)throw new Error('BOOKING_NOT_FOUND');await transaction`select pg_advisory_xact_lock(hashtextextended(${booking.providerId},0))`;await transaction`select id from bookings where id=${input.id}::bigint for update`;
  const occupiedStart=new Date(Date.parse(input.requestedStart)-booking.bufferBeforeMinutes*60000).toISOString(),occupiedEnd=new Date(Date.parse(input.requestedEnd)+booking.bufferAfterMinutes*60000).toISOString();
  const [usage]=await transaction`with overlapping_bookings as (select occupied_start,occupied_end,capacity_used from bookings where provider_id=${booking.providerId} and id<>${input.id}::bigint and status in ('REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS') and tstzrange(occupied_start,occupied_end,'[)') && tstzrange(${occupiedStart}::timestamptz,${occupiedEnd}::timestamptz,'[)') for update),points as (select ${occupiedStart}::timestamptz point union select occupied_start from overlapping_bookings),loads as (select point,coalesce((select sum(capacity_used) from overlapping_bookings where occupied_start<=point and occupied_end>point),0)::int used from points) select coalesce(max(used),0)::int maximum from loads`;
  if(usage.maximum+booking.capacityUsed>booking.capacity)throw new Error('CAPACITY_UNAVAILABLE');
  const [updated]=await transaction`update bookings set local_date=${input.localDate},local_time=${input.localTime},requested_start=${input.requestedStart},requested_end=${input.requestedEnd},occupied_start=${occupiedStart},occupied_end=${occupiedEnd},status=${input.status},updated_at=now() where id=${input.id}::bigint returning id::text,reference,customer_email as "customerEmail",service_slug as "serviceSlug",local_date::text as "localDate",to_char(local_time,'HH24:MI') as "localTime",status`;
  await transaction`insert into booking_events(booking_id,event_type,actor,details) values(${input.id}::bigint,'RESCHEDULED',${input.actor||'ADMIN'},${transaction.json({localDate:input.localDate,localTime:input.localTime,status:input.status})})`;return updated;
})}
export async function getBookingSchedulingConfig(id:string){const [row]=await db()`select b.timezone,ps.duration_minutes as "durationMinutes" from bookings b join provider_services ps on ps.provider_id=b.provider_id and ps.service_slug=b.service_slug where b.id=${id}::bigint`;return row||null}
export async function updateEnquiryStatus(id:string,status:string){const database=db();const [row]=await database`update enquiries set status=${status},updated_at=now() where id=${id}::bigint and booking_id is null returning id::text`;if(row)return;const [existing]=await database`select booking_id::text as "bookingId" from enquiries where id=${id}::bigint`;if(existing?.bookingId)throw new Error('ENQUIRY_ALREADY_CONVERTED');throw new Error('ENQUIRY_NOT_FOUND')}

export type ConvertEnquiryInput={enquiryId:string;providerId:string;localDate:string;localTime:string;locationMode:LocationMode;venue:string};
export type ConvertedEnquiryBooking={id:string;reference:string;status:string;serviceSlug:string;providerId:string;providerName:string;customerEmail:string|null;customerPhone:string;localDate:string;localTime:string;requestedStart:string;requestedEnd:string;manageToken?:string;created:boolean};

/** Convert an enquiry into exactly one confirmed booking. Enquiry and provider
 * locks make retries and concurrent admin submissions safe. */
export async function convertEnquiryToBooking(input:ConvertEnquiryInput):Promise<ConvertedEnquiryBooking>{
  return db().begin(async transaction=>{
    const [enquiry]=await transaction`select id::text,reference,name,email,phone,service_slug as "serviceSlug",puja_category as "pujaCategory",message,booking_id::text as "bookingId" from enquiries where id=${input.enquiryId}::bigint for update`;
    if(!enquiry)throw new Error('ENQUIRY_NOT_FOUND');
    if(enquiry.bookingId){
      const [existing]=await transaction`select b.id::text,b.reference,b.status,b.service_slug as "serviceSlug",b.provider_id as "providerId",p.name as "providerName",b.customer_email as "customerEmail",b.customer_phone as "customerPhone",b.local_date::text as "localDate",to_char(b.local_time,'HH24:MI') as "localTime",b.requested_start::text as "requestedStart",b.requested_end::text as "requestedEnd" from bookings b join providers p on p.id=b.provider_id where b.id=${enquiry.bookingId}::bigint`;
      if(!existing)throw new Error('BOOKING_NOT_FOUND');
      return {...existing,created:false} as ConvertedEnquiryBooking;
    }
    if(!enquiry.serviceSlug)throw new Error('ENQUIRY_SERVICE_REQUIRED');
    if(!enquiry.phone?.trim())throw new Error('ENQUIRY_PHONE_REQUIRED');

    await transaction`select pg_advisory_xact_lock(hashtextextended(${input.providerId},0))`;
    const [configuration]=await transaction`select p.id,p.name,p.type,p.active,p.timezone,p.created_at as "createdAt",p.updated_at as "updatedAt",ps.provider_id as "providerId",ps.service_slug as "serviceSlug",ps.duration_minutes as "durationMinutes",ps.buffer_before_minutes as "bufferBeforeMinutes",ps.buffer_after_minutes as "bufferAfterMinutes",ps.capacity,ps.booking_mode as "bookingMode",ps.allowed_location_modes as "allowedLocationModes",ps.active as "serviceActive" from providers p join provider_services ps on ps.provider_id=p.id where p.id=${input.providerId} and ps.service_slug=${enquiry.serviceSlug} and p.active and ps.active for update`;
    if(!configuration)throw new Error('PROVIDER_NOT_ELIGIBLE');
    if(!configuration.allowedLocationModes.includes(input.locationMode))throw new Error('LOCATION_NOT_ALLOWED');

    const [rules,exceptions,bookings]=await Promise.all([
      transaction<AvailabilityRule[]>`select id,provider_id as "providerId",day_of_week as "dayOfWeek",to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",timezone,capacity,active from availability_rules where provider_id=${input.providerId} and active`,
      transaction<AvailabilityException[]>`select id,provider_id as "providerId",local_date::text as "localDate",type,to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",capacity from availability_exceptions where provider_id=${input.providerId}`,
      transaction<ExistingBooking[]>`select provider_id as "providerId",requested_start::text as "requestedStart",requested_end::text as "requestedEnd",status,capacity_used as "capacityUsed",buffer_before_minutes as "bufferBeforeMinutes",buffer_after_minutes as "bufferAfterMinutes" from bookings where provider_id=${input.providerId} and status in ('REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS')`
    ]);
    const provider:Provider={id:configuration.id,name:configuration.name,type:configuration.type,active:configuration.active,timezone:configuration.timezone,createdAt:configuration.createdAt,updatedAt:configuration.updatedAt};
    const providerService:ProviderService={providerId:configuration.providerId,serviceSlug:configuration.serviceSlug,providerType:configuration.type,durationMinutes:configuration.durationMinutes,bufferBeforeMinutes:configuration.bufferBeforeMinutes,bufferAfterMinutes:configuration.bufferAfterMinutes,capacity:configuration.capacity,bookingMode:configuration.bookingMode,allowedLocationModes:configuration.allowedLocationModes,active:configuration.serviceActive};
    const slots=generateAvailableSlots({provider,service:providerService,date:input.localDate,locationMode:input.locationMode,rules,exceptions,existingBookings:bookings});
    const selectedSlot=slots.find(slot=>slot.localDate===input.localDate&&slot.localStartTime===input.localTime&&Date.parse(slot.start)>Date.now());
    if(!selectedSlot)throw new Error('SLOT_UNAVAILABLE');
    const requestedStart=new Date(selectedSlot.start);
    const requestedEnd=new Date(selectedSlot.end);

    const occupiedStart=new Date(requestedStart.getTime()-providerService.bufferBeforeMinutes*60_000).toISOString();
    const occupiedEnd=new Date(requestedEnd.getTime()+providerService.bufferAfterMinutes*60_000).toISOString();
    const [usage]=await transaction<Array<{maximum:number}>>`with overlapping_bookings as (select occupied_start,occupied_end,capacity_used from bookings where provider_id=${input.providerId} and status in ('REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS') and tstzrange(occupied_start,occupied_end,'[)') && tstzrange(${occupiedStart}::timestamptz,${occupiedEnd}::timestamptz,'[)') for update),points as (select ${occupiedStart}::timestamptz point union select occupied_start from overlapping_bookings),loads as (select point,coalesce((select sum(capacity_used) from overlapping_bookings where occupied_start<=point and occupied_end>point),0)::int used from points) select coalesce(max(used),0)::int maximum from loads`;
    if((usage?.maximum??0)+1>providerService.capacity)throw new Error('CAPACITY_UNAVAILABLE');

    for(let attempt=0;attempt<5;attempt+=1){
      const reference=generateBookingReference(),manageToken=randomBytes(32).toString('base64url'),manageTokenHash=createHash('sha256').update(manageToken).digest('hex');
      const customerMessage=[enquiry.pujaCategory?`Puja: ${enquiry.pujaCategory}`:'',enquiry.message||''].filter(Boolean).join('\n');
      const [stored]=await transaction`insert into bookings(reference,provider_id,service_slug,customer_name,customer_email,customer_phone,location_mode,venue,timezone,local_date,local_time,requested_start,requested_end,occupied_start,occupied_end,status,customer_message,capacity_used,buffer_before_minutes,buffer_after_minutes,manage_token_hash) values(${reference},${input.providerId},${enquiry.serviceSlug},${enquiry.name},${enquiry.email||null},${enquiry.phone},${input.locationMode},${input.venue||null},${selectedSlot.timezone},${input.localDate},${input.localTime},${requestedStart.toISOString()},${requestedEnd.toISOString()},${occupiedStart},${occupiedEnd},'CONFIRMED',${customerMessage||null},1,${providerService.bufferBeforeMinutes},${providerService.bufferAfterMinutes},${manageTokenHash}) on conflict do nothing returning id::text,reference,status,service_slug as "serviceSlug",provider_id as "providerId",customer_email as "customerEmail",customer_phone as "customerPhone",local_date::text as "localDate",to_char(local_time,'HH24:MI') as "localTime",requested_start::text as "requestedStart",requested_end::text as "requestedEnd"`;
      if(!stored)continue;
      await transaction`update enquiries set status='CONVERTED',booking_id=${stored.id}::bigint,updated_at=now() where id=${input.enquiryId}::bigint`;
      const eventDetails={enquiryId:input.enquiryId,enquiryReference:enquiry.reference,status:'CONFIRMED'};
      await transaction`insert into booking_events(booking_id,event_type,actor,details) values(${stored.id}::bigint,'CREATED','ADMIN',${transaction.json(eventDetails)}),(${stored.id}::bigint,'ENQUIRY_CONVERTED','ADMIN',${transaction.json(eventDetails)})`;
      return {...stored,providerName:provider.name,manageToken,created:true} as ConvertedEnquiryBooking;
    }
    throw new Error('REFERENCE_GENERATION_FAILED');
  });
}
