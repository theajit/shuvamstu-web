import {expect, test} from '@playwright/test';

const directories = [
  {path: '/pandits', heading: 'Find a Pandit for your sacred occasion', singular: 'Pandit', service: 'puja-rituals', excluded: ['Astrologer', 'Numerologist']},
  {path: '/astrologers', heading: 'Speak with an Astrologer', singular: 'Astrologer', service: 'astrology', excluded: ['Pandit', 'Numerologist']},
  {path: '/numerologists', heading: 'Consult a Numerologist', singular: 'Numerologist', service: 'numerology', excluded: ['Pandit', 'Astrologer']},
] as const;

for (const directory of directories) {
  test(`${directory.path} presents only its practitioner type`, async ({page}) => {
    await page.goto(directory.path);

    await expect(page.getByRole('heading', {level: 1, name: directory.heading})).toBeVisible();
    const requestLink = page.getByRole('link', {name: `Request a ${directory.singular}`}).first();
    await expect(requestLink).toHaveAttribute('href', `/enquiry?service=${directory.service}`);
    await expect(page.getByRole('heading', {name: new RegExp(`Published ${directory.singular.toLowerCase()}`)})).toBeVisible();

    for (const otherType of directory.excluded) {
      await expect(page.getByRole('link', {name: new RegExp(`Request an? ${otherType}$`)})).toHaveCount(0);
    }
  });
}

