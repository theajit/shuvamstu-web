export type BookingMode='instant'|'request'; export type LocationMode='online'|'customer_location'|'temple'|'office';
export type SpiritualService={id:string;slug:string;name:string;durationMinutes:number;bufferBeforeMinutes:number;bufferAfterMinutes:number;capacity:number;bookingMode:BookingMode;locationModes:LocationMode[]};
export const schedulingServices:SpiritualService[]=[
{id:'astrology',slug:'astrology',name:'Astrology Consultation',durationMinutes:30,bufferBeforeMinutes:0,bufferAfterMinutes:10,capacity:1,bookingMode:'instant',locationModes:['online','office']},
{id:'online-puja',slug:'online-puja',name:'Online Puja',durationMinutes:60,bufferBeforeMinutes:15,bufferAfterMinutes:15,capacity:8,bookingMode:'request',locationModes:['online']},
{id:'bratopanayan',slug:'bratopanayan',name:'Bratopanayan',durationMinutes:180,bufferBeforeMinutes:30,bufferAfterMinutes:30,capacity:1,bookingMode:'request',locationModes:['customer_location','temple']},
{id:'marriage',slug:'marriage',name:'Marriage Ceremony',durationMinutes:240,bufferBeforeMinutes:60,bufferAfterMinutes:60,capacity:1,bookingMode:'request',locationModes:['customer_location']},
{id:'puja-rituals',slug:'puja-rituals',name:'Puja & Rituals',durationMinutes:120,bufferBeforeMinutes:30,bufferAfterMinutes:30,capacity:1,bookingMode:'request',locationModes:['customer_location','temple','online']}];
export const serviceBySlug=(slug:string)=>schedulingServices.find(s=>s.slug===slug);