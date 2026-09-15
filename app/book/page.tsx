import { schedulingServices } from '../../lib/scheduling';

export const metadata={title:'Book a Service | Shuvamstu',description:'Choose a Shuvamstu spiritual service and share your preferred date and mode.'};

export default function BookPage({searchParams}:{searchParams?:{service?:string}}){
  const selected=searchParams?.service||'';
  return <main className="section"><div className="wrap"><p className="eyebrow">Booking request</p><h1>Plan your spiritual service</h1><p className="muted left">Choose the service and tell us your preferred date. Exact confirmation depends on provider availability and, where relevant, the ceremony or muhurta requirements.</p><form className="booking-form" action="/contact" method="get"><label>Service<select name="service" defaultValue={selected}><option value="">Choose a service</option>{schedulingServices.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label><label>Preferred date<input name="date" type="date" required/></label><label>Your name<input name="name" required autoComplete="name"/></label><label>Email<input name="email" type="email" required autoComplete="email"/></label><label className="wide">Notes<textarea name="notes" rows={5} placeholder="Location, ceremony context, preferred time or anything we should know"/></label><button className="btn" type="submit">Continue enquiry</button></form><p className="booking-note">Astrology can support fixed-duration scheduling. Longer ceremonies are treated as booking requests until the provider and ritual timing are confirmed.</p></div></main>;
}
