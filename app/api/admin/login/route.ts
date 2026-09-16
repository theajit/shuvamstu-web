import {NextRequest, NextResponse} from 'next/server';
import {ADMIN_COOKIE, adminConfigured, createAdminSession, safeEqual, sameOrigin} from '../../../../lib/admin-auth';
import {rateLimited} from '../../../../lib/request-protection';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({message:'Invalid request origin.'},{status:403});
  if(rateLimited(request,'admin-login',10,15*60*1000))return NextResponse.json({message:'Too many sign-in attempts. Try again later.'},{status:429});
  if (!adminConfigured()) return NextResponse.json({message:'Admin is not configured on this server.'},{status:503});
  const body = await request.json().catch(()=>null) as {password?:unknown}|null;
  const supplied = typeof body?.password === 'string' ? body.password : '';
  if (!safeEqual(supplied, process.env.ADMIN_PASSWORD || '')) return NextResponse.json({message:'Incorrect password.'},{status:401});
  const session = createAdminSession();
  const response = NextResponse.json({ok:true});
  response.cookies.set(ADMIN_COOKIE,session.value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:session.maxAge});
  return response;
}
