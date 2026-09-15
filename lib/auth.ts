import 'server-only';
import {createHash,createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import postgres from 'postgres';
import {Resend} from 'resend';

export const AUTH_COOKIE='shuvamstu_session';
export type AppRole='CUSTOMER'|'PUJARI'|'ADMIN';
export type Principal={userId:string;email:string;displayName:string;role:AppRole;providerId:string|null};
const connection=process.env.DATABASE_URL;
const sql=connection?postgres(connection,{max:5,idle_timeout:20,connect_timeout:10}):null;
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
const otpHash=(email:string,otp:string)=>createHmac('sha256',process.env.AUTH_OTP_SECRET||'').update(`${email}:${otp}`).digest('hex');
const equal=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const normalize=(email:string)=>email.trim().toLowerCase();

export async function requestLoginOtp(rawEmail:string){
 if(!sql)throw new Error('AUTH_NOT_CONFIGURED');const email=normalize(rawEmail);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('INVALID_EMAIL');
 if(!(process.env.AUTH_OTP_SECRET||'').length||!process.env.RESEND_API_KEY||!process.env.RESEND_FROM_EMAIL)throw new Error('AUTH_NOT_CONFIGURED');
 const recent=await sql`select count(*)::int count from auth_otp_challenges where lower(email)=${email} and created_at>now()-interval '10 minutes'`;
 if(recent[0].count>=3)throw new Error('RATE_LIMITED');
 const otp=String(randomInt(100000,1000000));
 const [challenge]=await sql`insert into auth_otp_challenges(email,purpose,otp_hash,role_hint,expires_at) values(${email},'LOGIN',${otpHash(email,otp)},'CUSTOMER',now()+interval '10 minutes') returning id::text`;
 const resend=new Resend(process.env.RESEND_API_KEY);const sent=await resend.emails.send({from:process.env.RESEND_FROM_EMAIL,to:email,subject:'Your Shuvamstu login code',text:`Your Shuvamstu verification code is ${otp}. It expires in 10 minutes. Do not share this code.`,headers:{'X-Entity-Ref-ID':challenge.id}});
 if(sent.error){await sql`delete from auth_otp_challenges where id=${challenge.id}::uuid`;throw new Error('DELIVERY_FAILED')}
 return {challengeId:challenge.id};
}

export async function verifyLoginOtp(challengeId:string,rawEmail:string,otp:string){
 if(!sql)throw new Error('AUTH_NOT_CONFIGURED');const email=normalize(rawEmail);
 return sql.begin(async tx=>{const [challenge]=await tx`select id::text,email,otp_hash as "otpHash",attempts,expires_at as "expiresAt",consumed_at as "consumedAt" from auth_otp_challenges where id=${challengeId}::uuid for update`;
  if(!challenge||challenge.consumedAt||new Date(challenge.expiresAt)<=new Date()||challenge.attempts>=5)throw new Error('OTP_EXPIRED');
  await tx`update auth_otp_challenges set attempts=attempts+1 where id=${challengeId}::uuid`;
  if(normalize(challenge.email)!==email||!/^[0-9]{6}$/.test(otp)||!equal(challenge.otpHash,otpHash(email,otp)))throw new Error('OTP_INVALID');
  await tx`update auth_otp_challenges set consumed_at=now() where id=${challengeId}::uuid`;
  let [user]=await tx`select id::text,role,status from app_users where lower(email)=${email} and deleted_at is null for update`;
  if(!user){[user]=await tx`insert into app_users(email,role,status,display_name,email_verified_at) values(${email},'CUSTOMER','ACTIVE',${email.split('@')[0]},now()) returning id::text,role,status`}
  if(user.status!=='ACTIVE')throw new Error('ACCOUNT_DISABLED');
  const token=randomBytes(32).toString('base64url');await tx`insert into app_sessions(user_id,token_hash,expires_at) values(${user.id}::uuid,${sha(token)},now()+interval '30 days')`;
  await tx`update app_users set email_verified_at=coalesce(email_verified_at,now()),last_login_at=now(),updated_at=now() where id=${user.id}::uuid`;
  return {token,role:user.role as AppRole};
 });
}

export async function getPrincipal():Promise<Principal|null>{
 if(!sql)return null;const token=(await cookies()).get(AUTH_COOKIE)?.value;if(!token)return null;
 const rows=await sql<Principal[]>`select u.id::text as "userId",u.email,u.display_name as "displayName",u.role,p.provider_id as "providerId" from app_sessions s join app_users u on u.id=s.user_id left join pujari_user_profiles p on p.user_id=u.id where s.token_hash=${sha(token)} and s.revoked_at is null and s.expires_at>now() and u.status='ACTIVE' and u.deleted_at is null limit 1`;
 return rows[0]||null;
}
export async function requireRole(...roles:AppRole[]){const principal=await getPrincipal();if(!principal)redirect(`/login?returnTo=${encodeURIComponent(roles.includes('PUJARI')?'/pujari':roles.includes('ADMIN')?'/admin':'/account')}`);if(!roles.includes(principal.role))redirect('/');return principal}
export async function revokeCurrentSession(){if(!sql)return;const token=(await cookies()).get(AUTH_COOKIE)?.value;if(token)await sql`update app_sessions set revoked_at=now() where token_hash=${sha(token)}`}
