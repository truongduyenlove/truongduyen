import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });

for (const [label, url] of [
  ['groom', 'https://truongduyenlove.github.io/truongduyen/'],
  ['bride', 'https://truongduyenlove.github.io/truongduyen/co-dau/'],
]) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  const text = await page.evaluate(() => document.querySelector('#invite-envelope h1').innerText.replace(/\s+/g, ' ').trim());
  console.log(label, '=>', JSON.stringify(text), '| title:', await page.title());
  await page.close();
}
await browser.close();
