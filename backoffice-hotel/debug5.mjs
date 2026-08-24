import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
page.on('pageerror', (e) => {
  console.log('PAGE-ERR:', e.message);
  const stack = e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : '';
  console.log(stack);
});
await page.goto('http://localhost:3101/login');
await page.getByLabel('Email').fill('admin@hotelcollection.test');
await page.getByLabel('Password').fill('admin123');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL(/\/dashboard$/);
await page.waitForTimeout(2500);
await page.goto('http://localhost:3101/hotels');
await page.waitForTimeout(4000);
await browser.close();
