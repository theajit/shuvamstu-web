import {NextRequest, NextResponse} from 'next/server';
import {ADMIN_COOKIE, sameOrigin} from '../../../../lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({message:'Invalid request origin.'},{status:403});
  const response=NextResponse.json({ok:true});
  response.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
  return response;
}
