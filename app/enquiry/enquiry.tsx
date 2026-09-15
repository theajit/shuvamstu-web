'use client';

import {FormEvent, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Shell} from '../components';
import {services} from '../data/services';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export default function Enquiry() {
  const searchParams = useSearchParams();
  const requestedService = searchParams.get('service') || '';
  const selectedService = services.some(({slug}) => slug === requestedService) ? requestedService : '';
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    submitting.current = true;
    setSubmissionState('submitting');
    setStatusMessage('Submitting your enquiry…');

    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: fields.get('name'),
          email: fields.get('email'),
          service: fields.get('service'),
          preferredDate: fields.get('preferredDate'),
          message: fields.get('message')
        })
      });
      const result: {message?: string} = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.message || 'We could not submit your enquiry. Please try again later.');

      form.reset();
      setSubmissionState('success');
      setStatusMessage('Thank you. Your enquiry has been received.');
    } catch (error) {
      setSubmissionState('error');
      setStatusMessage(error instanceof Error ? error.message : 'We could not submit your enquiry. Please try again later.');
    } finally {
      submitting.current = false;
    }
  }

  return <Shell><main><section className="plain-hero compact"><div className="wrap narrow"><span className="kicker">Enquiry</span><h1>Tell us about the occasion.</h1><p className="lead">Share what you know. No public phone number is required to begin.</p></div></section><section className="section"><div className="wrap form-wrap"><form className="enquiry-form" onSubmit={handleSubmit}><label htmlFor="enquiry-name">Your name<input id="enquiry-name" name="name" required maxLength={100} autoComplete="name" placeholder="Name"/></label><label htmlFor="enquiry-email">Email<input id="enquiry-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com"/></label><label htmlFor="enquiry-service">Service<select id="enquiry-service" name="service" defaultValue={selectedService}><option value="">Choose a service</option>{services.map(s=><option key={s.slug} value={s.slug}>{s.title}</option>)}</select></label><label htmlFor="enquiry-date">Preferred date<input id="enquiry-date" name="preferredDate" type="date"/></label><label className="full" htmlFor="enquiry-message">Tell us about the occasion<textarea id="enquiry-message" name="message" maxLength={2000} rows={6} placeholder="Occasion, location, family tradition or anything else that may help..."/></label><button className="btn full-button" type="submit" disabled={submissionState === 'submitting'}>{submissionState === 'submitting' ? 'Submitting…' : 'Submit enquiry'}</button>{statusMessage && <p className={`full form-status ${submissionState}`} role={submissionState === 'error' ? 'alert' : 'status'} aria-live="polite">{statusMessage}</p>}</form></div></section></main></Shell>;
}
