export const PROVIDER_TYPES = ['PANDIT', 'ASTROLOGER', 'NUMEROLOGIST'] as const;
export const BOOKING_MODES = ['INSTANT', 'REQUEST'] as const;
export const LOCATION_MODES = ['ONLINE', 'CUSTOMER_LOCATION', 'TEMPLE', 'OFFICE'] as const;
export const BOOKING_STATUSES = ['REQUESTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'] as const;

export type ProviderType = typeof PROVIDER_TYPES[number];
export type BookingMode = typeof BOOKING_MODES[number];
export type LocationMode = typeof LOCATION_MODES[number];
export type BookingStatus = typeof BOOKING_STATUSES[number];

export type Provider = {
  id: string;
  name: string;
  type: ProviderType;
  active: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type SchedulingService = {
  serviceSlug: string;
  providerType: ProviderType;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  capacity: number;
  bookingMode: BookingMode;
  allowedLocationModes: LocationMode[];
};

export type ProviderService = SchedulingService & {providerId: string; active: boolean};
export type AvailabilityRule = {id: string; providerId: string; dayOfWeek: number; localStartTime: string; localEndTime: string; timezone: string; capacity: number; active: boolean};
export type AvailabilityException = {id: string; providerId: string; localDate: string; type: 'UNAVAILABLE' | 'CUSTOM_HOURS'; localStartTime?: string; localEndTime?: string; capacity?: number};
export type ExistingBooking = {providerId: string; requestedStart: string; requestedEnd: string; status: BookingStatus; capacityUsed?: number; bufferBeforeMinutes?: number; bufferAfterMinutes?: number};
export type Slot = {start: string; end: string; localDate: string; localStartTime: string; localEndTime: string; timezone: string; remainingCapacity: number};

export const DEFAULT_OPERATIONAL_TIMEZONE = 'Asia/Kolkata';

export const schedulingServices: readonly SchedulingService[] = [
  {serviceSlug:'astrology',providerType:'ASTROLOGER',durationMinutes:30,bufferBeforeMinutes:0,bufferAfterMinutes:10,capacity:1,bookingMode:'INSTANT',allowedLocationModes:['ONLINE','OFFICE']},
  {serviceSlug:'numerology',providerType:'NUMEROLOGIST',durationMinutes:30,bufferBeforeMinutes:0,bufferAfterMinutes:10,capacity:1,bookingMode:'REQUEST',allowedLocationModes:['ONLINE','OFFICE']},
  {serviceSlug:'online-puja',providerType:'PANDIT',durationMinutes:60,bufferBeforeMinutes:15,bufferAfterMinutes:15,capacity:1,bookingMode:'REQUEST',allowedLocationModes:['ONLINE']},
  {serviceSlug:'puja-rituals',providerType:'PANDIT',durationMinutes:120,bufferBeforeMinutes:30,bufferAfterMinutes:30,capacity:1,bookingMode:'REQUEST',allowedLocationModes:['CUSTOMER_LOCATION','TEMPLE','ONLINE']},
  {serviceSlug:'bratopanayan',providerType:'PANDIT',durationMinutes:180,bufferBeforeMinutes:30,bufferAfterMinutes:30,capacity:1,bookingMode:'REQUEST',allowedLocationModes:['CUSTOMER_LOCATION','TEMPLE']},
  {serviceSlug:'marriage',providerType:'PANDIT',durationMinutes:240,bufferBeforeMinutes:60,bufferAfterMinutes:60,capacity:1,bookingMode:'REQUEST',allowedLocationModes:['CUSTOMER_LOCATION']}
] as const;

export function schedulingServiceBySlug(slug: string) {
  return schedulingServices.find(service => service.serviceSlug === slug);
}

export function isValidLocalDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isValidLocalTime(time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

function timezoneParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)])) as Record<string, number>;
}

export function zonedLocalToInstant(localDate: string, localTime: string, timezone: string) {
  if (!isValidLocalDate(localDate) || !isValidLocalTime(localTime)) throw new Error('Invalid local date or time');
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute] = localTime.split(':').map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  let instant = desiredUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = timezoneParts(new Date(instant), timezone);
    const representedUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second || 0);
    instant += desiredUtc - representedUtc;
  }
  const check = timezoneParts(new Date(instant), timezone);
  if (check.year !== year || check.month !== month || check.day !== day || check.hour !== hour || check.minute !== minute) throw new Error('Local time does not exist in this timezone');
  return new Date(instant);
}

function localTimeAt(date: Date, timezone: string) {
  const parts = timezoneParts(date, timezone);
  return `${String(parts.hour).padStart(2,'0')}:${String(parts.minute).padStart(2,'0')}`;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

const occupyingStatuses = new Set<BookingStatus>(['REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS']);

export function providerCanPerform(provider: Provider, providerServices: ProviderService[], serviceSlug: string) {
  return provider.active && providerServices.some(mapping => mapping.active && mapping.providerId === provider.id && mapping.serviceSlug === serviceSlug && mapping.providerType === provider.type);
}

export function generateAvailableSlots(input: {
  provider: Provider;
  service: ProviderService;
  date: string;
  locationMode: LocationMode;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  existingBookings: ExistingBooking[];
}): Slot[] {
  const {provider, service, date, locationMode, rules, exceptions, existingBookings} = input;
  if (!isValidLocalDate(date)) throw new Error('Invalid date');
  if (!provider.active || !service.active || service.providerId !== provider.id || service.providerType !== provider.type) throw new Error('Provider is not eligible for this service');
  if (!service.allowedLocationModes.includes(locationMode)) throw new Error('Location mode is not allowed for this service');
  if (service.durationMinutes <= 0 || service.capacity <= 0) throw new Error('Invalid service configuration');

  const exception = exceptions.find(item => item.providerId === provider.id && item.localDate === date);
  if (exception?.type === 'UNAVAILABLE') return [];
  const [year, month, day] = date.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const windows = exception?.type === 'CUSTOM_HOURS'
    ? [{start:exception.localStartTime, end:exception.localEndTime, timezone:provider.timezone, capacity:exception.capacity ?? service.capacity}]
    : rules.filter(rule => rule.active && rule.providerId === provider.id && rule.dayOfWeek === dayOfWeek).map(rule => ({start:rule.localStartTime,end:rule.localEndTime,timezone:rule.timezone,capacity:rule.capacity}));
  const slots: Slot[] = [];

  for (const window of windows) {
    if (!window.start || !window.end) continue;
    const windowStart = zonedLocalToInstant(date, window.start, window.timezone).getTime();
    const windowEnd = zonedLocalToInstant(date, window.end, window.timezone).getTime();
    const durationMs = service.durationMinutes * 60_000;
    const beforeMs = service.bufferBeforeMinutes * 60_000;
    const afterMs = service.bufferAfterMinutes * 60_000;
    const effectiveCapacity = Math.min(service.capacity, window.capacity);

    for (let start = windowStart + beforeMs; start + durationMs + afterMs <= windowEnd; start += durationMs) {
      const end = start + durationMs;
      const candidateStart = start - beforeMs;
      const candidateEnd = end + afterMs;
      const usedCapacity = existingBookings.filter(booking => booking.providerId === provider.id && occupyingStatuses.has(booking.status)).reduce((used, booking) => {
        const bookingStart = Date.parse(booking.requestedStart) - (booking.bufferBeforeMinutes ?? 0) * 60_000;
        const bookingEnd = Date.parse(booking.requestedEnd) + (booking.bufferAfterMinutes ?? 0) * 60_000;
        return used + (overlaps(candidateStart, candidateEnd, bookingStart, bookingEnd) ? booking.capacityUsed ?? 1 : 0);
      }, 0);
      if (usedCapacity < effectiveCapacity) slots.push({start:new Date(start).toISOString(),end:new Date(end).toISOString(),localDate:date,localStartTime:localTimeAt(new Date(start),window.timezone),localEndTime:localTimeAt(new Date(end),window.timezone),timezone:window.timezone,remainingCapacity:effectiveCapacity-usedCapacity});
    }
  }
  return slots;
}

export function initialStatusForMode(mode: BookingMode): BookingStatus {
  return mode === 'INSTANT' ? 'CONFIRMED' : 'REQUESTED';
}

export function generateBookingReference(now = new Date(), randomBytes?: Uint8Array) {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(3));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let index = 0; index < 4; index += 1) suffix += alphabet[bytes[index % bytes.length] % alphabet.length];
  const stamp = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth()+1).padStart(2,'0')}${String(now.getUTCDate()).padStart(2,'0')}`;
  return `SHU-${stamp}-${suffix}`;
}
