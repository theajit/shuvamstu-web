import {Resend} from 'resend';
export async function sendOperationalNotification(event:string,payload:Record<string,unknown>){
 const url=process.env.BOOKING_NOTIFICATION_WEBHOOK_URL;
 if(url){const headers:Record<string,string>={'Content-Type':'application/json'};if(process.env.BOOKING_NOTIFICATION_WEBHOOK_TOKEN)headers.Authorization=`Bearer ${process.env.BOOKING_NOTIFICATION_WEBHOOK_TOKEN}`;try{const response=await fetch(url,{method:'POST',headers,body:JSON.stringify({event,payload}),cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)console.error(`[operational-notification] Webhook returned ${response.status}.`)}catch(error){console.error('[operational-notification] Webhook delivery failed.',error)}}
 const to=process.env.NOTIFICATION_TO_EMAIL,from=process.env.RESEND_FROM_EMAIL,key=process.env.RESEND_API_KEY;
 if(to&&from&&key)try{const sent=await new Resend(key).emails.send({from,to,subject:`Shuvamstu: ${event.replaceAll('_',' ')}`,text:JSON.stringify(payload,null,2)});if(sent.error)console.error('[operational-notification] Email delivery failed.',sent.error)}catch(error){console.error('[operational-notification] Email delivery failed.',error)}
}
export async function sendBookingNotification(event:string,booking:Record<string,unknown>){return sendOperationalNotification(event,booking)}
