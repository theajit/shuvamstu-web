import {createHmac} from 'node:crypto';
import type {Page} from '@playwright/test';

const adminSecret = 'playwright-only-secret-with-at-least-32-characters';

export async function authenticateAdmin(page: Page) {
  const expires = String(Math.floor(Date.now() / 1000) + 60 * 60);
  const signature = createHmac('sha256', adminSecret).update(`admin:${expires}`).digest('hex');
  await page.context().addCookies([{
    name: 'shuvamstu_admin',
    value: `${expires}.${signature}`,
    url: 'http://127.0.0.1:3100',
    httpOnly: true,
    sameSite: 'Strict',
  }]);
}

export function kolkataDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function adminDashboardFixture(localDate = kolkataDate()) {
  return {
    providers: [{
      id: 'provider-pandit-1',
      name: 'Pandit Bharat Bhusan Rath',
      type: 'PANDIT',
      active: true,
      timezone: 'Asia/Kolkata',
      slug: 'bharat-bhusan-rath',
      experienceYears: 18,
      languages: ['Odia', 'Hindi'],
      specialties: ['Ganapati Puja'],
      published: true,
    }],
    services: [{
      providerId: 'provider-pandit-1',
      serviceSlug: 'puja-rituals',
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      capacity: 1,
      bookingMode: 'REQUEST',
      allowedLocationModes: ['CUSTOMER_LOCATION'],
      active: true,
    }],
    rules: [],
    exceptions: [],
    bookings: [{
      id: 'booking-1',
      reference: 'BKG-PLAYWRIGHT-1',
      providerId: 'provider-pandit-1',
      providerName: 'Pandit Bharat Bhusan Rath',
      serviceSlug: 'puja-rituals',
      customerName: 'Calendar Customer',
      customerEmail: 'calendar@example.com',
      customerPhone: '+91 98765 43210',
      locationMode: 'CUSTOMER_LOCATION',
      venue: 'Bhubaneswar',
      localDate,
      localTime: '10:30',
      requestedStart: `${localDate}T05:00:00.000Z`,
      requestedEnd: `${localDate}T06:00:00.000Z`,
      status: 'CONFIRMED',
      createdAt: '2026-09-16T00:00:00.000Z',
      events: [],
    }],
    enquiries: [{
      id: 'enquiry-1',
      reference: 'ENQ-PLAYWRIGHT-1',
      name: 'Enquiry Customer',
      phone: '+91 99999 00000',
      email: '',
      serviceSlug: 'puja-rituals',
      pujaCategory: 'Ganapati Puja',
      preferredDate: localDate,
      message: 'Please arrange the puja.',
      status: 'CONTACTED',
      createdAt: '2026-09-16T00:00:00.000Z',
    }],
  };
}

