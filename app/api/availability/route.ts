import {generateAvailableSlots, isValidLocalDate, LOCATION_MODES, schedulingServiceBySlug, type LocationMode} from '../../../lib/scheduling';
import {schedulingRepository} from '../../../lib/scheduling-repository';

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const serviceSlug = searchParams.get('service') || '';
  const date = searchParams.get('date') || '';
  const providerId = searchParams.get('provider') || undefined;
  const locationMode = searchParams.get('locationMode') || '';
  const service = schedulingServiceBySlug(serviceSlug);

  if (!service) return Response.json({message:'Unknown or non-schedulable service.'}, {status:400});
  if (!isValidLocalDate(date)) return Response.json({message:'Use a valid date in YYYY-MM-DD format.'}, {status:400});
  if (locationMode && !LOCATION_MODES.includes(locationMode as LocationMode)) return Response.json({message:'Unknown location mode.'}, {status:400});
  if (locationMode && !service.allowedLocationModes.includes(locationMode as LocationMode)) return Response.json({message:'That location mode is not available for this service.'}, {status:400});

  if (!schedulingRepository.configured) {
    return Response.json({availabilityKind:'CONFIGURATION_ONLY',live:false,slots:[],service:serviceSlug,date,message:'Live availability is not configured. No available times are being represented.'}, {headers:{'Cache-Control':'no-store'}});
  }

  const snapshots = await schedulingRepository.getAvailabilitySnapshots(serviceSlug, providerId);
  const providers = snapshots.map(snapshot => ({id:snapshot.provider.id,name:snapshot.provider.name,timezone:snapshot.provider.timezone}));
  const slots = snapshots.flatMap(snapshot => generateAvailableSlots({provider:snapshot.provider,service:snapshot.providerService,date,locationMode:(locationMode || service.allowedLocationModes[0]) as LocationMode,rules:snapshot.rules,exceptions:snapshot.exceptions,existingBookings:snapshot.bookings}).filter(slot=>Date.parse(slot.start)>Date.now()).map(slot => ({...slot,provider:{id:snapshot.provider.id,name:snapshot.provider.name}})));
  return Response.json({availabilityKind:'LIVE',live:true,providers,slots,service:serviceSlug,date}, {headers:{'Cache-Control':'no-store'}});
}
