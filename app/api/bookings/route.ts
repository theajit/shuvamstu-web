import {generateAvailableSlots, isValidLocalDate, LOCATION_MODES, schedulingServiceBySlug, zonedLocalToInstant, type LocationMode} from '../../../lib/scheduling';
import {schedulingRepository} from '../../../lib/scheduling-repository';
import {sendBookingNotification} from '../../../lib/booking-notifications';
import {rateLimited,sameRequestOrigin} from '../../../lib/request-protection';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PAYLOAD_BYTES = 20_000;

function text(value: unknown, maximum: number, required = false) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if ((required && !cleaned) || cleaned.length > maximum) return null;
  return cleaned;
}

export async function POST(request: Request) {
  if(!sameRequestOrigin(request))return Response.json({message:'Invalid request origin.'},{status:403});
  if(rateLimited(request,'booking',10,60*60*1000))return Response.json({message:'Too many booking attempts. Please try again later.'},{status:429});
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return Response.json({message:'Use the supported booking form.'},{status:415});
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_PAYLOAD_BYTES) return Response.json({message:'The booking request is too large.'},{status:413});
  const raw = await request.text().catch(() => '');
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_PAYLOAD_BYTES) return Response.json({message:'The booking request is invalid or too large.'},{status:400});

  let value: unknown;
  try { value = JSON.parse(raw); } catch { return Response.json({message:'Please check the booking details.'},{status:400}); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return Response.json({message:'Please check the booking details.'},{status:400});
  const body = value as Record<string, unknown>;
  const serviceSlug = text(body.service, 80, true);
  const providerId = text(body.provider, 100);
  const locationMode = text(body.locationMode, 40, true);
  const localDate = text(body.date, 10, true);
  const localTime = text(body.time, 5, true);
  const timezone = text(body.timezone, 100, true);
  const customerName = text(body.customerName, 100, true);
  const customerEmail = text(body.customerEmail, 254)?.toLowerCase() ?? null;
  const customerPhone = text(body.customerPhone, 30);
  const venue = text(body.venue, 500);
  const customerMessage = text(body.customerMessage, 2000);
  const service = serviceSlug ? schedulingServiceBySlug(serviceSlug) : undefined;

  if (!service || !locationMode || !LOCATION_MODES.includes(locationMode as LocationMode) || !service.allowedLocationModes.includes(locationMode as LocationMode) || !localDate || !isValidLocalDate(localDate) || !localTime || !/^\d{2}:\d{2}$/.test(localTime) || !timezone || !customerName || customerEmail === null || (customerEmail && !EMAIL_PATTERN.test(customerEmail)) || !customerPhone || !/^\+?[0-9][0-9 ()-]{7,28}[0-9]$/.test(customerPhone) || venue === null || customerMessage === null) return Response.json({message:'Please check the booking details.'},{status:400});
  if (service.bookingMode === 'INSTANT' && !providerId) return Response.json({message:'Choose an available provider and time before booking.'},{status:400});

  if (!schedulingRepository.configured) return Response.json({message:'Booking is not yet available. Your request has not been stored or confirmed.',persistenceConfigured:false},{status:503,headers:{'Cache-Control':'no-store'}});
  if (!providerId) return Response.json({message:'Choose an eligible provider.'},{status:400});
  try {
    const snapshots=await schedulingRepository.getAvailabilitySnapshots(serviceSlug!,providerId);
    const snapshot=snapshots.find(item=>item.provider.id===providerId);
    if(!snapshot)return Response.json({message:'That provider is not available for this service.'},{status:400});
    const requestedStart=zonedLocalToInstant(localDate,localTime,snapshot.provider.timezone);
    const requestedEnd=new Date(requestedStart.getTime()+snapshot.providerService.durationMinutes*60_000);
    const available=generateAvailableSlots({provider:snapshot.provider,service:snapshot.providerService,date:localDate,locationMode:locationMode as LocationMode,rules:snapshot.rules,exceptions:snapshot.exceptions,existingBookings:snapshot.bookings});
    if(!available.some(slot=>slot.start===requestedStart.toISOString()&&Date.parse(slot.start)>Date.now()))return Response.json({message:'That time is no longer available. Please choose another.'},{status:409});
    const stored=await schedulingRepository.createBookingAtomically({providerId,serviceSlug:serviceSlug!,locationMode:locationMode as LocationMode,customerName:customerName!,customerEmail:customerEmail!,customerPhone:customerPhone!,venue:venue!,timezone:snapshot.provider.timezone,localDate:localDate!,localTime:localTime!,requestedStart:requestedStart.toISOString(),requestedEnd:requestedEnd.toISOString(),customerMessage:customerMessage!});
    const manageUrl=new URL('/booking/manage',process.env.PUBLIC_SITE_URL||request.url);manageUrl.searchParams.set('reference',stored.reference);manageUrl.searchParams.set('token',stored.manageToken);
    const result={reference:stored.reference,status:stored.status,service:stored.serviceSlug,requestedStart:stored.requestedStart,requestedEnd:stored.requestedEnd,manageUrl:manageUrl.toString(),customerEmail};
    await sendBookingNotification('BOOKING_CREATED',result);
    return Response.json(result,{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof Error&&error.message==='CAPACITY_UNAVAILABLE')return Response.json({message:'That time is no longer available. Please choose another.'},{status:409});
    return Response.json({message:'The booking could not be stored. Please try again later.'},{status:503});
  }
}
