import {expect,test} from '@playwright/test';
test('customer books a puja using live availability and receives a management link',async({page})=>{
 let submitted:Record<string,unknown>|undefined;
 await page.route('**/api/availability**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({live:true,providers:[{id:'pandit-1',name:'Pandit One',timezone:'Asia/Kolkata'}],slots:[{start:'2026-10-01T03:30:00.000Z',localStartTime:'09:00',provider:{id:'pandit-1',name:'Pandit One',timezone:'Asia/Kolkata'}}]})}));
 await page.route('**/api/bookings',async route=>{submitted=route.request().postDataJSON();await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({reference:'SHU-261001-TEST',manageUrl:'http://127.0.0.1:3100/booking/manage?reference=SHU-261001-TEST&token=secure'})})});
 await page.goto('/book?puja=ganapati-puja');
 await page.getByLabel('Preferred date').fill('2026-10-01');
 await page.getByRole('button',{name:'Check live availability'}).click();
 await page.getByRole('button',{name:/09:00.*Pandit One/}).click();
 await page.getByLabel('Full name').fill('MVP Customer');
 await page.getByLabel('Phone / WhatsApp').fill('+91 98765 43210');
 await page.getByLabel('Service address or temple details').fill('Bhubaneswar');
 await page.getByRole('button',{name:'Request booking'}).click();
 await expect(page.getByRole('status')).toContainText('SHU-261001-TEST');
 await expect(page.getByRole('link',{name:/Manage this booking/})).toHaveAttribute('href',/SHU-261001-TEST/);
 expect(submitted).toMatchObject({service:'puja-rituals',provider:'pandit-1',locationMode:'CUSTOMER_LOCATION',date:'2026-10-01',time:'09:00',customerName:'MVP Customer'});
});
