import postgres from 'postgres';
import {createHash,randomBytes} from 'node:crypto';
import {generateBookingReference, initialStatusForMode, type AvailabilityException, type AvailabilityRule, type BookingMode, type ExistingBooking, type LocationMode, type Provider, type ProviderService} from './scheduling';

export type AvailabilitySnapshot = {provider:Provider;providerService:ProviderService;rules:AvailabilityRule[];exceptions:AvailabilityException[];bookings:ExistingBooking[]};
export type AtomicBookingInput = {providerId:string;serviceSlug:string;locationMode:LocationMode;customerName:string;customerEmail:string;customerPhone:string;venue:string;timezone:string;localDate:string;localTime:string;requestedStart:string;requestedEnd:string;customerMessage:string};
export type StoredBooking = {reference:string;status:'REQUESTED'|'CONFIRMED';serviceSlug:string;requestedStart:string;requestedEnd:string;manageToken:string};

export interface SchedulingRepository {readonly configured:boolean;getAvailabilitySnapshots(serviceSlug:string,providerId?:string):Promise<AvailabilitySnapshot[]>;createBookingAtomically(input:AtomicBookingInput):Promise<StoredBooking>}

class UnconfiguredSchedulingRepository implements SchedulingRepository {
  readonly configured=false;
  async getAvailabilitySnapshots(){return []}
  async createBookingAtomically():Promise<StoredBooking>{throw new Error('Scheduling persistence is not configured')}
}

class PostgresSchedulingRepository implements SchedulingRepository {
  readonly configured=true;
  constructor(private readonly sql:ReturnType<typeof postgres>){}

  async getAvailabilitySnapshots(serviceSlug:string,providerId?:string){
    const mappings=await this.sql<Array<ProviderService&Provider>>`select p.id,p.name,p.type,p.active,p.timezone,p.created_at as "createdAt",p.updated_at as "updatedAt",ps.provider_id as "providerId",ps.service_slug as "serviceSlug",ps.duration_minutes as "durationMinutes",ps.buffer_before_minutes as "bufferBeforeMinutes",ps.buffer_after_minutes as "bufferAfterMinutes",ps.capacity,ps.booking_mode as "bookingMode",ps.allowed_location_modes as "allowedLocationModes",ps.active from providers p join provider_services ps on ps.provider_id=p.id where p.active and ps.active and ps.service_slug=${serviceSlug} and (${providerId??null}::text is null or p.id=${providerId??null})`;
    return Promise.all(mappings.map(async row=>{
      const [rules,exceptions,bookings]=await Promise.all([
        this.sql<AvailabilityRule[]>`select id,provider_id as "providerId",day_of_week as "dayOfWeek",to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",timezone,capacity,active from availability_rules where provider_id=${row.id} and active`,
        this.sql<AvailabilityException[]>`select id,provider_id as "providerId",local_date::text as "localDate",type,to_char(local_start_time,'HH24:MI') as "localStartTime",to_char(local_end_time,'HH24:MI') as "localEndTime",capacity from availability_exceptions where provider_id=${row.id}`,
        this.sql<ExistingBooking[]>`select provider_id as "providerId",requested_start::text as "requestedStart",requested_end::text as "requestedEnd",status,capacity_used as "capacityUsed",buffer_before_minutes as "bufferBeforeMinutes",buffer_after_minutes as "bufferAfterMinutes" from bookings where provider_id=${row.id} and status in ('REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS')`
      ]);
      const provider:Provider={id:row.id,name:row.name,type:row.type,active:row.active,timezone:row.timezone,createdAt:row.createdAt,updatedAt:row.updatedAt};
      const providerService:ProviderService={providerId:row.providerId,serviceSlug:row.serviceSlug,providerType:row.type,durationMinutes:row.durationMinutes,bufferBeforeMinutes:row.bufferBeforeMinutes,bufferAfterMinutes:row.bufferAfterMinutes,capacity:row.capacity,bookingMode:row.bookingMode,allowedLocationModes:row.allowedLocationModes,active:row.active};
      return {provider,providerService,rules,exceptions,bookings};
    }));
  }

  async createBookingAtomically(input:AtomicBookingInput){
    return this.sql.begin(async transaction=>{
      await transaction`select pg_advisory_xact_lock(hashtextextended(${input.providerId},0))`;
      const [configuration]=await transaction<Array<{bufferBeforeMinutes:number;bufferAfterMinutes:number;capacity:number;bookingMode:BookingMode;allowedLocationModes:LocationMode[]}>>`select ps.buffer_before_minutes as "bufferBeforeMinutes",ps.buffer_after_minutes as "bufferAfterMinutes",ps.capacity,ps.booking_mode as "bookingMode",ps.allowed_location_modes as "allowedLocationModes" from provider_services ps join providers p on p.id=ps.provider_id where ps.provider_id=${input.providerId} and ps.service_slug=${input.serviceSlug} and ps.active and p.active for update`;
      if(!configuration)throw new Error('PROVIDER_NOT_ELIGIBLE');
      if(!configuration.allowedLocationModes.includes(input.locationMode))throw new Error('LOCATION_NOT_ALLOWED');
      const occupiedStart=new Date(Date.parse(input.requestedStart)-configuration.bufferBeforeMinutes*60_000).toISOString();
      const occupiedEnd=new Date(Date.parse(input.requestedEnd)+configuration.bufferAfterMinutes*60_000).toISOString();
      const [usage]=await transaction<Array<{maximum:number}>>`with overlapping_bookings as (select occupied_start,occupied_end,capacity_used from bookings where provider_id=${input.providerId} and status in ('REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS') and tstzrange(occupied_start,occupied_end,'[)') && tstzrange(${occupiedStart}::timestamptz,${occupiedEnd}::timestamptz,'[)') for update),points as (select ${occupiedStart}::timestamptz point union select occupied_start from overlapping_bookings),loads as (select point,coalesce((select sum(capacity_used) from overlapping_bookings where occupied_start<=point and occupied_end>point),0)::int used from points) select coalesce(max(used),0)::int maximum from loads`;
      if((usage?.maximum??0)+1>configuration.capacity)throw new Error('CAPACITY_UNAVAILABLE');
      const status=initialStatusForMode(configuration.bookingMode);
      for(let attempt=0;attempt<5;attempt+=1){const reference=generateBookingReference(),manageToken=randomBytes(32).toString('base64url'),manageTokenHash=createHash('sha256').update(manageToken).digest('hex');try{const [stored]=await transaction<Array<Omit<StoredBooking,'manageToken'>&{id:string}>>`insert into bookings (reference,provider_id,service_slug,customer_name,customer_email,customer_phone,location_mode,venue,timezone,local_date,local_time,requested_start,requested_end,occupied_start,occupied_end,status,customer_message,capacity_used,buffer_before_minutes,buffer_after_minutes,manage_token_hash) values (${reference},${input.providerId},${input.serviceSlug},${input.customerName},${input.customerEmail},${input.customerPhone||null},${input.locationMode},${input.venue||null},${input.timezone},${input.localDate},${input.localTime},${input.requestedStart},${input.requestedEnd},${occupiedStart},${occupiedEnd},${status},${input.customerMessage||null},1,${configuration.bufferBeforeMinutes},${configuration.bufferAfterMinutes},${manageTokenHash}) returning id::text,reference,status,service_slug as "serviceSlug",requested_start::text as "requestedStart",requested_end::text as "requestedEnd"`;await transaction`insert into booking_events(booking_id,event_type,actor,details) values(${stored.id}::bigint,'CREATED','CUSTOMER',${transaction.json({status})})`;return {...stored,manageToken}}catch(error){if(!(error instanceof postgres.PostgresError)||error.code!=='23505'||attempt===4)throw error}}
      throw new Error('REFERENCE_GENERATION_FAILED');
    });
  }
}

const databaseUrl=process.env.DATABASE_URL;
export const schedulingRepository:SchedulingRepository=databaseUrl?new PostgresSchedulingRepository(postgres(databaseUrl,{max:10,idle_timeout:20,connect_timeout:10})):new UnconfiguredSchedulingRepository();
