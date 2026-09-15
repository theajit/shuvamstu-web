import type {Metadata} from 'next';import {Suspense} from 'react';import ConsultationBooking from './consultation-booking';
export const metadata:Metadata={title:'Book an Astrology or Numerology Consultation',description:'Choose a live available Astrologer or Numerologist and book a consultation.'};
export default function ConsultationPage(){return <Suspense fallback={null}><ConsultationBooking/></Suspense>}
