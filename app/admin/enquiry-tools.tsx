'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';

type Enquiry={id:string;reference:string;name:string;phone?:string;email?:string;serviceSlug?:string;pujaCategory?:string;preferredDate?:string;message?:string;status:string;createdAt:string;bookingId?:string;bookingReference?:string};
type Provider={id:string;name:string;type:string;active:boolean};
type Service={providerId:string;serviceSlug:string;active:boolean;allowedLocationModes:string[]};
type Booking={id:string;reference:string};
type Slot={localStartTime:string;provider:{id:string;name:string}};
type Mutate=(payload:Record<string,unknown>)=>Promise<void>;

const statusOptions=[
 {value:'NEW',label:'New — unreviewed'},
 {value:'CONTACTED',label:'Contacted — follow-up'},
 {value:'CLOSED',label:'Closed / lost — no booking'},
] as const;
const locationLabels:Record<string,string>={ONLINE:'Online',CUSTOMER_LOCATION:'Customer location',TEMPLE:'Temple',OFFICE:'Office'};
const providerLabels:Record<string,string>={PANDIT:'Pandit',ASTROLOGER:'Astrologer',NUMEROLOGIST:'Numerologist'};
const serviceLabels:Record<string,string>={'puja-rituals':'Puja & Rituals','online-puja':'Online Puja',astrology:'Astrology',numerology:'Numerology',marriage:'Marriage',bratopanayan:'Bratopanayan'};

export function EnquiriesManager({enquiries,bookings,providers,services,mutate}:{enquiries:Enquiry[];bookings:Booking[];providers:Provider[];services:Service[];mutate:Mutate}){
 const [filter,setFilter]=useState('OPEN');
 const visible=useMemo(()=>enquiries.filter(item=>filter==='ALL'||(filter==='OPEN'?!['CONVERTED','CLOSED'].includes(item.status):item.status===filter)),[enquiries,filter]);
 const openCount=enquiries.filter(item=>!['CONVERTED','CLOSED'].includes(item.status)).length;
 return <section className="admin-panel enquiries-panel">
  <div className="panel-title enquiry-heading"><div><h2>Enquiries</h2><p>Qualify each request, then explicitly create a scheduled booking. Closing an enquiry never creates a booking.</p></div><span className="enquiry-open-count">{openCount} need action</span></div>
  <div className="enquiry-lifecycle" role="note"><b>Enquiry lifecycle</b><span>New → Contacted → Convert to booking</span><span className="lifecycle-separator">or</span><span>Close / lost (no booking)</span></div>
  <div className="enquiry-filters"><label>Show<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="OPEN">Open enquiries</option><option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="CONVERTED">Converted</option><option value="CLOSED">Closed / lost</option><option value="ALL">All enquiries</option></select></label><b>{visible.length} results</b></div>
  {!visible.length?<p className="admin-empty">No enquiries match this filter.</p>:<div className="enquiry-list">{visible.map(item=><EnquiryCard key={item.id} enquiry={item} bookings={bookings} providers={providers} services={services} mutate={mutate}/>)}</div>}
 </section>
}

function EnquiryCard({enquiry,bookings,providers,services,mutate}:{enquiry:Enquiry;bookings:Booking[];providers:Provider[];services:Service[];mutate:Mutate}){
 const linkedReference=enquiry.bookingReference||bookings.find(booking=>booking.id===enquiry.bookingId)?.reference;
 const converted=enquiry.status==='CONVERTED'||Boolean(linkedReference);
 const closed=enquiry.status==='CLOSED';
 const eligibleServices=services.filter(service=>service.active&&(!enquiry.serviceSlug||service.serviceSlug===enquiry.serviceSlug));
 const eligibleIds=new Set(eligibleServices.map(service=>service.providerId));
 const eligibleProviders=providers.filter(provider=>provider.active&&(!enquiry.serviceSlug||eligibleIds.has(provider.id)));
 const [providerId,setProviderId]=useState('');
 const providerLocations=eligibleServices.find(service=>service.providerId===providerId)?.allowedLocationModes||[];
 const locations=providerLocations.length?providerLocations:['ONLINE','CUSTOMER_LOCATION','TEMPLE','OFFICE'];
 const [location,setLocation]=useState('ONLINE');
 const [date,setDate]=useState(enquiry.preferredDate||'');
 const [time,setTime]=useState('');
 const [slots,setSlots]=useState<Slot[]>([]);
 const [availabilityState,setAvailabilityState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [availabilityMessage,setAvailabilityMessage]=useState('');
 const [showConvert,setShowConvert]=useState(false);
 useEffect(()=>{
  setTime('');setSlots([]);
  if(!showConvert||!providerId||!date||!enquiry.serviceSlug){setAvailabilityState('idle');setAvailabilityMessage(!enquiry.serviceSlug?'A schedulable service is required before conversion.':'');return}
  const controller=new AbortController();
  setAvailabilityState('loading');setAvailabilityMessage('Checking live availability…');
  const params=new URLSearchParams({service:enquiry.serviceSlug,date,provider:providerId,locationMode:location});
  void fetch(`/api/availability?${params}`,{cache:'no-store',signal:controller.signal}).then(async response=>{const result=await response.json().catch(()=>({})) as {live?:boolean;slots?:Slot[];message?:string};if(!response.ok)throw new Error(result.message||'Availability could not be checked.');const liveSlots=(result.slots||[]).filter(slot=>slot.provider.id===providerId);setSlots(liveSlots);if(!result.live){setAvailabilityState('error');setAvailabilityMessage(result.message||'Live availability is not configured.')}else if(!liveSlots.length){setAvailabilityState('ready');setAvailabilityMessage('No available times for this practitioner, date, and location. Try another date or location.')}else{setAvailabilityState('ready');setAvailabilityMessage(`${liveSlots.length} available ${liveSlots.length===1?'time':'times'} found.`)}}).catch(error=>{if(error instanceof DOMException&&error.name==='AbortError')return;setAvailabilityState('error');setAvailabilityMessage(error instanceof Error?error.message:'Availability could not be checked.')});
  return()=>controller.abort();
 },[showConvert,providerId,date,location,enquiry.serviceSlug]);
 async function convert(event:FormEvent<HTMLFormElement>){event.preventDefault();const values=new FormData(event.currentTarget);await mutate({action:'enquiry-convert',enquiryId:enquiry.id,providerId:values.get('providerId'),localDate:values.get('localDate'),localTime:values.get('localTime'),locationMode:values.get('locationMode'),venue:values.get('venue')})}
 return <article className={`enquiry-card ${converted?'is-converted':closed?'is-closed':''}`}>
  <header className="enquiry-card-head"><div><span className="enquiry-reference">{enquiry.reference}</span><time>{new Date(enquiry.createdAt).toLocaleString()}</time></div><span className={`enquiry-status status-${enquiry.status.toLowerCase()}`}>{converted?'Converted to booking':closed?'Closed / lost':enquiry.status==='CONTACTED'?'Contacted':'New'}</span></header>
  <div className="enquiry-card-body">
   <section className="enquiry-customer"><p className="admin-label">Customer</p><h3>{enquiry.name}</h3>{enquiry.phone?<a href={`tel:${enquiry.phone}`} className="enquiry-phone">{enquiry.phone}</a>:<span className="missing-contact">Legacy enquiry: no phone</span>}{enquiry.email&&<a href={`mailto:${enquiry.email}`} className="enquiry-email">{enquiry.email}</a>}</section>
   <section><p className="admin-label">Requirement</p><h3>{serviceLabels[enquiry.serviceSlug||'']||enquiry.serviceSlug||'General enquiry'}</h3>{enquiry.pujaCategory&&<p>{enquiry.pujaCategory}</p>}{enquiry.preferredDate&&<p>Preferred date: <b>{enquiry.preferredDate}</b></p>}</section>
   <section className="enquiry-message"><p className="admin-label">Customer message</p><p>{enquiry.message||'No additional message.'}</p></section>
  </div>
  {converted?<div className="linked-booking"><div><b>Booking created</b><span>This enquiry is linked and cannot be converted again.</span></div>{linkedReference?<button type="button" onClick={()=>navigator.clipboard?.writeText(linkedReference)} title="Copy booking reference">{linkedReference}</button>:<span>Linked booking</span>}</div>:<div className="enquiry-actions">
   <label>Lifecycle status<select value={enquiry.status} onChange={event=>mutate({action:'enquiry-status',id:enquiry.id,status:event.target.value})}>{statusOptions.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
   {closed?<div className="closed-explanation"><b>No booking was created</b><span>Reopen as New or Contacted before scheduling this customer.</span></div>:<div className="conversion-workflow">{!showConvert?<div className="conversion-prompt"><div><b>Ready to schedule?</b><span>Create a booking only after confirming the requirement with the customer.</span></div><button type="button" onClick={()=>setShowConvert(true)}>Convert to booking</button></div>:<form className="conversion-form" onSubmit={convert} aria-busy={availabilityState==='loading'}><div className="conversion-form-title"><b>Convert to booking</b><span>Choose a live available time. Creating the booking reserves that slot.</span></div><label>Provider<select name="providerId" required value={providerId} onChange={event=>{const next=event.target.value;setProviderId(next);const supported=eligibleServices.find(service=>service.providerId===next)?.allowedLocationModes||[];setLocation(supported[0]||'ONLINE')}}><option value="" disabled>Select practitioner</option>{eligibleProviders.map(provider=><option value={provider.id} key={provider.id}>{provider.name} · {providerLabels[provider.type]||provider.type}</option>)}</select></label><label>Date<input name="localDate" type="date" min={new Date().toLocaleDateString('en-CA')} value={date} onChange={event=>setDate(event.target.value)} required/></label><label>Location<select name="locationMode" value={location} onChange={event=>setLocation(event.target.value)}>{locations.map(mode=><option value={mode} key={mode}>{locationLabels[mode]||mode.replaceAll('_',' ')}</option>)}</select></label><label>Available time<select name="localTime" value={time} onChange={event=>setTime(event.target.value)} required disabled={availabilityState!=='ready'||!slots.length}><option value="">{availabilityState==='loading'?'Checking…':slots.length?'Select a live time':'No times available'}</option>{slots.map(slot=><option value={slot.localStartTime} key={`${slot.provider.id}-${slot.localStartTime}`}>{slot.localStartTime}</option>)}</select></label><p className={`availability-feedback ${availabilityState}`} role={availabilityState==='error'?'alert':'status'} aria-live="polite">{availabilityMessage||'Select a provider, date, and location to see live times.'}</p><label className="conversion-venue">{location==='ONLINE'?'Meeting note (optional)':'Venue / address'}<input name="venue" required={location!=='ONLINE'} placeholder={location==='ONLINE'?'Added later if needed':'Enter the service location'}/></label><button type="submit" disabled={!eligibleProviders.length||availabilityState!=='ready'||!time}>Create booking</button>{!eligibleProviders.length&&<p className="conversion-warning">Assign an active provider to {serviceLabels[enquiry.serviceSlug||'']||'this service'} before converting.</p>}<button type="button" className="cancel-conversion" onClick={()=>setShowConvert(false)}>Cancel</button></form>}</div>}
  </div>}
 </article>
}
