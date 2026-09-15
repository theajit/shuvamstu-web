export const BOOKING_STATUSES = [
  'REQUESTED',
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'PUJARI_ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED',
] as const;

export type BookingStatus = typeof BOOKING_STATUSES[number];

const ALLOWED_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = Object.freeze({
  REQUESTED: ['AWAITING_CONFIRMATION', 'CANCELLED'],
  AWAITING_CONFIRMATION: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PUJARI_ASSIGNED', 'CANCELLED'],
  PUJARI_ASSIGNED: ['CONFIRMED', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['REFUND_PENDING'],
  CANCELLED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: [],
});

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus, adminOverrideReason?: string): void {
  if (canTransitionBooking(from, to)) return;
  if (adminOverrideReason?.trim()) return;
  throw new Error(`Invalid booking transition: ${from} -> ${to}`);
}
