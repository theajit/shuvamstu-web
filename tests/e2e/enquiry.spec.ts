import {expect, test} from '@playwright/test';

test('Puja enquiry requires a subcategory and phone while email remains optional', async ({page}) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/enquiry', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({status: 201, contentType: 'application/json', body: JSON.stringify({ok: true, reference: 'ENQ-E2E-1'})});
  });

  await page.goto('/enquiry?service=puja-rituals&puja=Ganapati%20Puja');

  await expect(page.getByLabel('Service')).toHaveValue('puja-rituals');
  await expect(page.getByLabel('Puja category')).toHaveValue('Ganapati Puja');
  await expect(page.getByLabel(/Phone/)).toHaveAttribute('required', '');
  await expect(page.getByLabel('Email')).not.toHaveAttribute('required', '');

  await page.getByLabel('Your name').fill('Ajit');
  await page.getByLabel(/Phone/).fill('+91 98765 43210');
  await page.getByLabel('Tell us about the occasion').fill('Morning Ganapati Puja at home.');
  await page.getByRole('button', {name: 'Submit enquiry'}).click();

  await expect(page.getByRole('status')).toContainText('Thank you');
  expect(submitted).toMatchObject({
    name: 'Ajit',
    phone: '+91 98765 43210',
    email: '',
    service: 'puja-rituals',
    pujaCategory: 'Ganapati Puja',
  });
});

test('Puja category is hidden for non-Puja services', async ({page}) => {
  await page.goto('/enquiry?service=puja-rituals');
  await expect(page.getByLabel('Puja category')).toBeVisible();
  await page.getByLabel('Service').selectOption('astrology');
  await expect(page.getByLabel('Puja category')).toHaveCount(0);
});

