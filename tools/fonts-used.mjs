import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const page = await ctx.newPage();
const fonts = new Set();
page.on('response', r => {
  const u = r.url();
  if (/\.(woff2?|ttf|otf)(\?|$)/.test(u)) fonts.add(decodeURIComponent(new URL(u).pathname));
});
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.locator('#invite-envelope .relative.rounded-lg').click();
await page.waitForTimeout(1500);
const h = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 500) {
  await page.evaluate(v => window.scrollTo(0, v), y);
  await page.waitForTimeout(250);
}
await page.waitForTimeout(1500);
await page.evaluate(() => document.fonts.ready);
const list = [...fonts].sort();
await fs.writeFile('D:/truongduyen/web/reference/fonts-used.txt', list.join('\n'), 'utf8');
console.log(list.length, 'font files used');
console.log(list.join('\n'));
await browser.close();
