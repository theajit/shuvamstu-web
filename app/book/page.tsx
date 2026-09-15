import type {Metadata} from 'next';
import {Suspense} from 'react';
import BookingForm from './booking-form';

export const metadata: Metadata = {title:'Book a service',description:'Choose a Shuvamstu spiritual service and request or book a suitable time.'};

export default function BookPage() {
  return <Suspense fallback={null}><BookingForm/></Suspense>;
}
