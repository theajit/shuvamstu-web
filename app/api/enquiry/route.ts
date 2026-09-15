import {services} from '../../data/services';

const MAX_PAYLOAD_BYTES = 16_384;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const serviceSlugs = new Set(services.map(({slug}) => slug));

type Enquiry = {name: string; email: string; service: string; preferredDate: string; message: string};

function json(message: string, status: number) {
  return Response.json({message}, {status, headers: {'Cache-Control': 'no-store'}});
}

function cleanSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length <= maxLength ? cleaned : null;
}

function cleanMessage(value: unknown) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  return cleaned.length <= 2000 ? cleaned : null;
}

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validate(value: unknown): Enquiry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const name = cleanSingleLine(body.name, 100);
  const email = cleanSingleLine(body.email, 254)?.toLowerCase() ?? null;
  const service = cleanSingleLine(body.service, 80);
  const preferredDate = cleanSingleLine(body.preferredDate, 10);
  const message = cleanMessage(body.message);

  if (!name || !email || !EMAIL_PATTERN.test(email) || service === null || preferredDate === null || message === null) return null;
  if (service && !serviceSlugs.has(service)) return null;
  if (preferredDate && !validDate(preferredDate)) return null;
  return {name, email, service, preferredDate, message};
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json('Please submit the enquiry form using the supported format.', 415);

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_PAYLOAD_BYTES) return json('The enquiry is too large to submit.', 413);

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json('We could not read the enquiry. Please try again.', 400);
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_PAYLOAD_BYTES) return json('The enquiry is too large to submit.', 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return json('Please check the enquiry details and try again.', 400);
  }

  const enquiry = validate(parsed);
  if (!enquiry) return json('Please check the enquiry details and try again.', 400);

  const webhookUrl = process.env.ENQUIRY_WEBHOOK_URL;
  if (!webhookUrl) return json('Enquiry submission is temporarily unavailable. Please try again later.', 503);

  try {
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (process.env.ENQUIRY_WEBHOOK_TOKEN) headers.Authorization = `Bearer ${process.env.ENQUIRY_WEBHOOK_TOKEN}`;
    const response = await fetch(webhookUrl, {method: 'POST', headers, body: JSON.stringify(enquiry), cache: 'no-store', signal: AbortSignal.timeout(10_000)});
    if (!response.ok) return json('We could not submit your enquiry. Please try again later.', 502);
  } catch {
    return json('We could not submit your enquiry. Please try again later.', 502);
  }

  return json('Thank you. Your enquiry has been received.', 201);
}
