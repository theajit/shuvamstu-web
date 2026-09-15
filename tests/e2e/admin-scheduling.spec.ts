import {expect, test, type Page} from '@playwright/test';
import {adminDashboardFixture, authenticateAdmin} from './helpers';

async function mockAdminApi(page: Page) {
  const dashboard = adminDashboardFixture();
  const actions: Record<string, unknown>[] = [];

  await page.route('**/api/admin', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(dashboard)});
      return;
    }

    const payload = route.request().postDataJSON() as Record<string, unknown>;
    actions.push(payload);
    if (payload.action === 'enquiry-convert') {
      dashboard.enquiries[0].status = 'CONVERTED';
      dashboard.bookings.push({
        ...dashboard.bookings[0],
        id: 'booking-from-enquiry',
        reference: 'BKG-FROM-ENQUIRY',
        customerName: dashboard.enquiries[0].name,
        customerPhone: dashboard.enquiries[0].phone,
        localDate: String(payload.localDate),
        localTime: String(payload.localTime),
        status: 'REQUESTED',
      });
    }
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true})});
  });

  return {dashboard, actions};
}

test.beforeEach(async ({page}) => {
  await authenticateAdmin(page);
});

test('confirmed booking appears on the current weekly calendar', async ({page}) => {
  await mockAdminApi(page);
  await page.goto('/admin');
  await page.getByRole('button', {name: 'Calendar', exact: true}).click();

  await expect(page.getByRole('heading', {name: 'Weekly calendar'})).toBeVisible();
  await expect(page.getByText('Calendar Customer')).toBeVisible();
  await expect(page.getByText('Pandit Bharat Bhusan Rath')).toBeVisible();
  await expect(page.getByText('10:30')).toBeVisible();
});

test('admin selects a live slot and converts an enquiry into a scheduled booking', async ({page}) => {
  const {actions} = await mockAdminApi(page);
  const availabilityRequests: URL[] = [];
  await page.route('**/api/availability?*', async route => {
    availabilityRequests.push(new URL(route.request().url()));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        live: true,
        slots: [{
          start: '2026-09-20T04:00:00.000Z',
          localStartTime: '09:30',
          timezone: 'Asia/Kolkata',
          provider: {id: 'provider-pandit-1', name: 'Pandit Bharat Bhusan Rath'},
        }],
      }),
    });
  });
  await page.goto('/admin');
  await page.getByRole('button', {name: 'Enquiries', exact: true}).click();
  await expect(page.getByText('ENQ-PLAYWRIGHT-1')).toBeVisible();

  await page.getByRole('button', {name: 'Convert to booking'}).click();
  await page.getByLabel('Provider').selectOption('provider-pandit-1');
  await page.getByLabel('Date').fill('2026-09-20');
  await page.getByLabel(/Location/).selectOption('CUSTOMER_LOCATION');
  await expect(page.getByRole('status')).toContainText('1 available time found');
  await page.getByLabel('Available time').selectOption('09:30');
  await page.getByLabel(/Venue/).fill('Bhubaneswar');
  await page.getByRole('button', {name: 'Create booking'}).click();

  expect(availabilityRequests.some(url =>
    url.searchParams.get('service') === 'puja-rituals'
      && url.searchParams.get('provider') === 'provider-pandit-1'
      && url.searchParams.get('date') === '2026-09-20'
      && url.searchParams.get('locationMode') === 'CUSTOMER_LOCATION'
  )).toBe(true);
  await expect.poll(() => actions.find(action => action.action === 'enquiry-convert')).toMatchObject({
    action: 'enquiry-convert',
    enquiryId: 'enquiry-1',
    providerId: 'provider-pandit-1',
    localDate: '2026-09-20',
    localTime: '09:30',
    locationMode: 'CUSTOMER_LOCATION',
  });
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.getByRole('button', {name: 'Bookings', exact: true}).click();
  await expect(page.getByText('Enquiry Customer')).toBeVisible();
});
