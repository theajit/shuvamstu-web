import nextEnv from '@next/env';
import postgres from 'postgres';
nextEnv.loadEnvConfig(process.cwd());
const failures=[];
const required=(name,min=1)=>{const value=process.env[name]||'';if(value.length<min||/replace-with|example\.com|user:password/i.test(value))failures.push(`${name} is missing or still a placeholder.`)};
required('DATABASE_URL');required('PUBLIC_SITE_URL');required('ADMIN_PASSWORD',16);required('ADMIN_SESSION_SECRET',32);
if(!process.env.BOOKING_NOTIFICATION_WEBHOOK_URL&&!process.env.ENQUIRY_WEBHOOK_URL&&!(process.env.NOTIFICATION_TO_EMAIL&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL))failures.push('Configure an operational webhook or Resend notification email.');
if(process.env.PUBLIC_SITE_URL&&!/^https:\/\//i.test(process.env.PUBLIC_SITE_URL))failures.push('PUBLIC_SITE_URL must use HTTPS.');
if(process.env.ADMIN_ALLOWED_ORIGIN!==process.env.PUBLIC_SITE_URL)failures.push('ADMIN_ALLOWED_ORIGIN must match PUBLIC_SITE_URL.');
if(process.env.DATABASE_URL){const sql=postgres(process.env.DATABASE_URL,{max:1,idle_timeout:2,connect_timeout:5});try{const[row]=await sql`select (select count(*)::int from providers where active and type='PANDIT') as pandits,(select count(*)::int from provider_services where active and service_slug='puja-rituals') as assignments,(select count(*)::int from availability_rules where active) as rules`;if(!row.pandits)failures.push('No active Pujari is configured.');if(!row.assignments)failures.push('No active puja-rituals service assignment exists.');if(!row.rules)failures.push('No active availability rule exists.')}catch(error){failures.push(`Database readiness query failed: ${error instanceof Error?error.message:String(error)}`)}finally{await sql.end({timeout:2})}}
if(failures.length){console.error('NOT READY FOR LIVE\n- '+failures.join('\n- '));process.exitCode=1}else console.log('READY: configuration, Pujari assignments, and availability gates passed.');
