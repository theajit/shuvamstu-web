import {NextRequest,NextResponse} from 'next/server';
import {authorizedRequest,sameOrigin} from '../../../lib/admin-auth';
import {deleteException,deleteRule,getAdminDashboard,saveException,saveProvider,saveProviderService,saveRule,updateBookingStatus} from '../../../lib/admin-repository';

const statuses=['REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','REJECTED'];
const services=['astrology','numerology','online-puja','puja-rituals','bratopanayan','marriage'];
const locations=['ONLINE','CUSTOMER_LOCATION','TEMPLE','OFFICE'];
const time=/^([01]\d|2[0-3]):[0-5]\d$/; const date=/^\d{4}-\d{2}-\d{2}$/;
const text=(v:unknown,max=100)=>typeof v==='string'&&v.trim()&&v.trim().length<=max?v.trim():null;
const integer=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&Number(v)>=min&&Number(v)<=max?Number(v):null;
function timezone(value:unknown){const v=text(value,80);if(!v)return null;try{new Intl.DateTimeFormat('en',{timeZone:v}).format();return v}catch{return null}}
function unauthorized(){return NextResponse.json({message:'Sign in required.'},{status:401})}

export async function GET(request:NextRequest){if(!authorizedRequest(request))return unauthorized();try{return NextResponse.json(await getAdminDashboard(),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({message:'Admin database is unavailable. Check DATABASE_URL and apply the scheduling migration.'},{status:503})}}

export async function POST(request:NextRequest){
  if(!authorizedRequest(request))return unauthorized();
  if(!sameOrigin(request))return NextResponse.json({message:'Invalid request origin.'},{status:403});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||typeof body.action!=='string')return NextResponse.json({message:'Invalid admin action.'},{status:400});
  try{
    if(body.action==='booking-status'){const id=text(body.id,30);const status=text(body.status,30);if(!id||!status||!/^\d+$/.test(id)||!statuses.includes(status))throw new Error('VALIDATION');await updateBookingStatus(id,status)}
    else if(body.action==='provider-save'){const id=body.id?text(body.id,100):undefined;const name=text(body.name,100);const type=body.type;const zone=timezone(body.timezone);const slug=body.slug?text(body.slug,80):'';const bio=body.bio?text(body.bio,3000):'';const city=body.city?text(body.city,100):'';const qualifications=body.qualifications?text(body.qualifications,500):'';const photoUrl=body.photoUrl?text(body.photoUrl,500):'';const experienceYears=body.experienceYears===''||body.experienceYears===null?null:integer(body.experienceYears,0,100);const languages=Array.isArray(body.languages)?body.languages.filter(v=>typeof v==='string'&&v.trim()).map(v=>String(v).trim()).slice(0,20):[];const specialties=Array.isArray(body.specialties)?body.specialties.filter(v=>typeof v==='string'&&v.trim()).map(v=>String(v).trim()).slice(0,30):[];if(!name||!zone||(type!=='PANDIT'&&type!=='ASTROLOGER'&&type!=='NUMEROLOGIST')||(slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))||(body.experienceYears!==''&&body.experienceYears!==null&&experienceYears===null)||(photoUrl&&!/^https:\/\//i.test(photoUrl))||(body.published===true&&(!slug||!bio)))throw new Error('VALIDATION');await saveProvider({id:id||undefined,name,type,timezone:zone,active:body.active!==false,slug:slug||'',bio:bio||'',experienceYears,city:city||'',languages,specialties,qualifications:qualifications||'',photoUrl:photoUrl||'',published:body.published===true})}
    else if(body.action==='service-save'){const providerId=text(body.providerId,100),serviceSlug=text(body.serviceSlug,100),duration=integer(body.durationMinutes,5,1440),before=integer(body.bufferBeforeMinutes,0,480),after=integer(body.bufferAfterMinutes,0,480),capacity=integer(body.capacity,1,100),mode=body.bookingMode;const allowed=Array.isArray(body.allowedLocationModes)?body.allowedLocationModes.filter(v=>typeof v==='string'&&locations.includes(v)):[];if(!providerId||!serviceSlug||!services.includes(serviceSlug)||!duration||before===null||after===null||!capacity||(mode!=='INSTANT'&&mode!=='REQUEST')||!allowed.length)throw new Error('VALIDATION');await saveProviderService({providerId,serviceSlug,durationMinutes:duration,bufferBeforeMinutes:before,bufferAfterMinutes:after,capacity,bookingMode:mode,allowedLocationModes:allowed,active:body.active!==false})}
    else if(body.action==='rule-save'){const id=body.id?text(body.id,100):undefined,providerId=text(body.providerId,100),day=integer(body.dayOfWeek,0,6),start=text(body.localStartTime,5),end=text(body.localEndTime,5),zone=timezone(body.timezone),capacity=integer(body.capacity,1,100);if(!providerId||day===null||!start||!end||!time.test(start)||!time.test(end)||start>=end||!zone||!capacity)throw new Error('VALIDATION');await saveRule({id:id||undefined,providerId,dayOfWeek:day,localStartTime:start,localEndTime:end,timezone:zone,capacity,active:body.active!==false})}
    else if(body.action==='rule-delete'){const id=text(body.id,100);if(!id)throw new Error('VALIDATION');await deleteRule(id)}
    else if(body.action==='exception-save'){const providerId=text(body.providerId,100),localDate=text(body.localDate,10),type=body.type,start=text(body.localStartTime,5)||undefined,end=text(body.localEndTime,5)||undefined,capacity=body.capacity?integer(body.capacity,1,100)||undefined:undefined;if(!providerId||!localDate||!date.test(localDate)||(type!=='UNAVAILABLE'&&type!=='CUSTOM_HOURS')||(type==='CUSTOM_HOURS'&&(!start||!end||!time.test(start)||!time.test(end)||start>=end)))throw new Error('VALIDATION');await saveException({providerId,localDate,type,localStartTime:type==='CUSTOM_HOURS'?start:undefined,localEndTime:type==='CUSTOM_HOURS'?end:undefined,capacity:type==='CUSTOM_HOURS'?capacity:undefined})}
    else if(body.action==='exception-delete'){const id=text(body.id,100);if(!id)throw new Error('VALIDATION');await deleteException(id)}
    else return NextResponse.json({message:'Unknown admin action.'},{status:400});
    return NextResponse.json({ok:true});
  }catch(error){const message=error instanceof Error&&error.message==='VALIDATION'?'Please check the submitted values.':'The change could not be saved.';return NextResponse.json({message},{status:400})}
}
