import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4321/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.locator('#invite-envelope .relative.rounded-lg').click();
await page.waitForTimeout(1500);

await page.locator('input[placeholder="Nhập tên*"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(3500);

const listText = await page.evaluate(() => {
  const list = document.querySelector('form.mt-6.mx-auto').parentElement.querySelector('.mt-8.w-full.space-y-3');
  return list ? list.innerText.trim() : '(no list)';
});
console.log('GUESTBOOK:');
console.log(listText.slice(0, 600));

if (listText.includes('Test hệ thống') || listText.includes('Test h')) {
  console.log('PASS: lời chúc đọc từ Google Sheet hiển thị trên web');
} else {
  console.log('FAIL: không thấy lời chúc từ Sheet');
}

await page.screenshot({ path: 'qa/sheet-read.png', fullPage: false });
console.log('errors:', errs.length ? errs.join(' | ') : 'none');
await browser.close();
