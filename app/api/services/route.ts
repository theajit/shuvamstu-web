import { NextResponse } from 'next/server';
import { schedulingServices } from '../../../lib/scheduling';

export async function GET() {
  return NextResponse.json({ services: schedulingServices });
}
