import {NextResponse} from 'next/server';import {AUTH_COOKIE,revokeCurrentSession} from '../../../../lib/auth';
export async function POST(){await revokeCurrentSession();const response=NextResponse.json({ok:true});response.cookies.set(AUTH_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return response}
