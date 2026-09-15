import {schedulingServices} from '../../../lib/scheduling';

export function GET() {
  return Response.json({services:schedulingServices,availabilityKind:'CONFIGURATION_ONLY',persistenceConfigured:false}, {headers:{'Cache-Control':'no-store'}});
}
