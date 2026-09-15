import type {Metadata} from 'next';
import {Suspense} from 'react';
import BookingForm from './booking-form';

export const metadata: Metadata = {title:'Book a Puja',description:'Choose a puja, time, verified Pujari and samagri with transparent pricing.'};

export default function BookPage() {
  return <Suspense fallback={null}><BookingForm/></Suspense>;
}
