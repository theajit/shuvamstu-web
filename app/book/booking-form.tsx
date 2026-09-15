'use client';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Shell} from '../components';
import {schedulingServices,schedulingServiceBySlug} from '../../lib/scheduling';
import styles from './booking.module.css';

type Slot={start:string;localStartTime:string;timezone:string;provider:{id:string;name:string}};
type Provider={id:string;name:string;timezone:string};
type Availability={live:boolean;slots:Slot[];providers?:Provider[];message?:string};
const names:Record<string,string>={'astrology':'Astrology consultation','numerology':'Numerology consultation','online-puja':'Online Puja','puja-rituals':'Puja & Rituals','marriage':'Marriage','bratopanayan':'Bratopanayan'};
const locationNames:Record<string,string>={ONLINE:'Online',OFFICE:'Office',CUSTOMER_LOCATION:'Customer location',TEMPLE:'Temple'};

export default function BookingForm(){
  const query=useSearchParams();
  const initial=schedulingServiceBySlug(query.get('service')||'')?.serviceSlug||'astrology';
  const [serviceSlug,setServiceSlug]=useState(initial);
  const service=useMemo(()=>schedulingServiceBySlug(serviceSlug)!,[serviceSlug]);
  const [locationMode,setLocationMode]=useState<string>(service.allowedLocationModes[0]);
  const [date,setDate]=useState('');const [time,setTime]=useState('');const [provider,setProvider]=useState('');
  const [providers,setProviders]=useState<Provider[]>([]);const [slots,setSlots]=useState<Slot[]>([]);
  const [availabilityMessage,setAvailabilityMessage]=useState('');
  const [state,setState]=useState<'idle'|'checking'|'submitting'|'success'|'error'>('idle');const [message,setMessage]=useState('');const [manageUrl,setManageUrl]=useState('');
  const requestMode=service.bookingMode==='REQUEST';

  useEffect(()=>{setLocationMode(service.allowedLocationModes[0]);setTime('');setProvider('');setProviders([]);setSlots([]);setAvailabilityMessage('')},[service]);

  async function checkAvailability(){
    if(!date){setAvailabilityMessage('Choose a date first.');return}
    setState('checking');setAvailabilityMessage('Checking availability…');
    try{const params=new URLSearchParams({service:serviceSlug,date,locationMode});const response=await fetch(`/api/availability?${params}`);const result:Availability=await response.json();setSlots(result.slots||[]);setProviders(result.providers||[]);if(result.providers?.length===1)setProvider(result.providers[0].id);setAvailabilityMessage(result.live?(result.slots.length?'Choose an available provider and time.':'No available times were found for this date.'):(result.message||'Live availability is not configured.'));setState('idle')}catch{setState('error');setAvailabilityMessage('Availability could not be checked. Please try again later.')}
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(state==='submitting')return;const form=event.currentTarget;const values=new FormData(form);setState('submitting');setMessage('Submitting your booking request…');
    try{const response=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:serviceSlug,provider,locationMode,date,time,timezone:'Asia/Kolkata',customerName:values.get('customerName'),customerEmail:values.get('customerEmail'),customerPhone:values.get('customerPhone'),venue:values.get('venue'),customerMessage:values.get('customerMessage')})});const result:{message?:string;reference?:string;manageUrl?:string}=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.message||'The booking could not be submitted.');setState('success');setManageUrl(result.manageUrl||'');setMessage(`Thank you. Your booking reference is ${result.reference}. Save the management link below.`);form.reset()}catch(error){setState('error');setMessage(error instanceof Error?error.message:'The booking could not be submitted.')}
  }

  return <Shell><main><section className="plain-hero compact"><div className="wrap narrow"><span className="kicker">Scheduling</span><h1>{requestMode?'Request a preferred time.':'Book a consultation.'}</h1><p className="lead">{requestMode?'Your preferred date and time will be confirmed after availability is reviewed.':'Choose a live available time before confirming your booking.'}</p></div></section><section className="section"><form className={`wrap ${styles.form}`} onSubmit={submit}>
    <fieldset><legend>1. Choose a service</legend><label>Service<select value={serviceSlug} onChange={event=>setServiceSlug(event.target.value)}>{schedulingServices.map(item=><option key={item.serviceSlug} value={item.serviceSlug}>{names[item.serviceSlug]}</option>)}</select></label><p className={styles.mode}>{requestMode?'Request booking':'Instant booking'} · {service.durationMinutes} minute operational duration</p></fieldset>
    <fieldset><legend>2. Choose location and date</legend><label>Location<select value={locationMode} onChange={event=>setLocationMode(event.target.value)}>{service.allowedLocationModes.map(mode=><option key={mode} value={mode}>{locationNames[mode]}</option>)}</select></label><label>Preferred date (Asia/Kolkata)<input type="date" value={date} onChange={event=>{setDate(event.target.value);setSlots([])}} required/></label>{requestMode&&<label>Preferred time (Asia/Kolkata)<input type="time" value={time} onChange={event=>setTime(event.target.value)} required/></label>}<button className="btn" type="button" onClick={checkAvailability} disabled={state==='checking'}>Check availability</button>{availabilityMessage&&<p role="status" aria-live="polite">{availabilityMessage}</p>}{requestMode&&providers.length>0&&<label>Provider<select value={provider} onChange={event=>setProvider(event.target.value)} required><option value="">Choose a provider</option>{providers.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}{!requestMode&&slots.length>0&&<div className={styles.slots}>{slots.map(slot=><button type="button" key={`${slot.provider.id}-${slot.start}`} className={time===slot.localStartTime&&provider===slot.provider.id?styles.selected:''} onClick={()=>{setTime(slot.localStartTime);setProvider(slot.provider.id)}}>{slot.localStartTime} with {slot.provider.name}</button>)}</div>}</fieldset>
    <fieldset><legend>3. Your details</legend><label>Name<input name="customerName" required maxLength={100} autoComplete="name"/></label><label>Phone<input name="customerPhone" type="tel" required minLength={9} maxLength={30} autoComplete="tel" placeholder="+91 98765 43210"/></label><label>Email, optional<input name="customerEmail" type="email" maxLength={254} autoComplete="email"/></label>{locationMode!=='ONLINE'&&<label>Venue or address, optional<textarea name="venue" maxLength={500} rows={3}/></label>}<label>Anything we should know, optional<textarea name="customerMessage" maxLength={2000} rows={5}/></label></fieldset>
    <section className={styles.review} aria-label="Booking review"><h2>Review</h2><p><strong>{names[serviceSlug]}</strong><br/>{locationNames[locationMode]}<br/>{date||'Choose a date'}{time?` at ${time}`:''}</p><p>{requestMode?'This submits a request. It is not confirmed until Shuvamstu reviews availability.':'Instant booking requires a live available provider and time.'}</p></section><button className="btn" type="submit" disabled={state==='submitting'||!provider}>{state==='submitting'?'Submitting…':requestMode?'Request this date':'Confirm booking'}</button>{message&&<p role={state==='error'?'alert':'status'} aria-live="polite">{message}</p>}{manageUrl&&<a className="btn" href={manageUrl}>Manage this booking</a>}
  </form></section></main></Shell>;
}
