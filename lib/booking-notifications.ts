export async function sendBookingNotification(event:string,booking:Record<string,unknown>){
  const url=process.env.BOOKING_NOTIFICATION_WEBHOOK_URL;if(!url)return;
  const headers:Record<string,string>={'Content-Type':'application/json'};if(process.env.BOOKING_NOTIFICATION_WEBHOOK_TOKEN)headers.Authorization=`Bearer ${process.env.BOOKING_NOTIFICATION_WEBHOOK_TOKEN}`;
  try{const response=await fetch(url,{method:'POST',headers,body:JSON.stringify({event,booking}),cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)console.error(`[booking-notification] Webhook returned ${response.status}.`)}catch(error){console.error('[booking-notification] Delivery failed.',error)}
}
