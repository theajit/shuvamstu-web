import {expect, test} from '@playwright/test';

test('customer can request a new booking time using the secure management page', async ({page}) => {
  const booking = {
    reference: 'BKG-CUSTOMER-1',
    providerName: 'Pandit Bharat Bhusan Rath',
    serviceSlug: 'puja-rituals',
    customerName: 'Customer',
    locationMode: 'ONLINE',
    localDate: '2026-09-20',
    localTime: '09:30',
    status: 'CONFIRMED',
  };
  let submitted: Record<string, unknown> | undefined;

  await page.route('**/api/booking/manage**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(booking)});
      return;
    }
    submitted = route.request().postDataJSON();
    Object.assign(booking, {localDate: '2026-09-22', localTime: '14:00', status: 'PENDING_CONFIRMATION'});
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({ok: true})});
  });

  await page.goto('/booking/manage?reference=BKG-CUSTOMER-1&token=secret-token');
  await expect(page.getByRole('heading', {name: 'BKG-CUSTOMER-1'})).toBeVisible();
  await page.getByLabel('Date').fill('2026-09-22');
  await page.getByLabel('Time').fill('14:00');
  await page.getByRole('button', {name: 'Request reschedule'}).click();

  expect(submitted).toEqual({
    reference: 'BKG-CUSTOMER-1',
    token: 'secret-token',
    action: 'reschedule',
    localDate: '2026-09-22',
    localTime: '14:00',
  });
  await expect(page.getByText('PENDING CONFIRMATION')).toBeVisible();
});

