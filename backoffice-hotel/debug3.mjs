import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
page.on('response', async (r) => {
  if (r.url().includes('/api/')) {
    console.log(r.status(), r.url());
  }
});
await page.goto('http://localhost:3101/login');
await page.getByLabel('Email').fill('admin@hotelcollection.test');
await page.getByLabel('Password').fill('admin123');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForTimeout(7000);
await browser.close();
