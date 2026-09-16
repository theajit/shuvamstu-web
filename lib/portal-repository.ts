import 'server-only';
import postgres from 'postgres';
const sql=process.env.DATABASE_URL?postgres(process.env.DATABASE_URL,{max:3,idle_timeout:20,connect_timeout:10}):null;
export type PortalBooking={reference:string;serviceSlug:string;providerName:string;localDate:string;localTime:string;locationMode:string;status:string;venue:string|null;meetingUrl:string|null;customerName:string};
const fields=sql?.unsafe(`b.reference,b.service_slug as "serviceSlug",p.name as "providerName",b.local_date::text as "localDate",to_char(b.local_time,'HH24:MI') as "localTime",b.location_mode as "locationMode",b.status,b.venue,b.meeting_url as "meetingUrl",b.customer_name as "customerName"`);
export async function customerBookings(email:string){if(!sql||!fields)return[];return sql<PortalBooking[]>`select ${fields} from bookings b join providers p on p.id=b.provider_id where lower(b.customer_email)=lower(${email}) order by b.requested_start desc limit 100`}
export async function customerBooking(email:string,reference:string){if(!sql||!fields)return null;const[row]=await sql<PortalBooking[]>`select ${fields} from bookings b join providers p on p.id=b.provider_id where lower(b.customer_email)=lower(${email}) and b.reference=${reference} limit 1`;return row||null}
export async function pujariBookings(providerId:string){if(!sql||!fields)return[];return sql<PortalBooking[]>`select ${fields} from bookings b join providers p on p.id=b.provider_id where b.provider_id=${providerId} and b.local_date>=current_date-interval '30 days' order by b.requested_start limit 200`}
