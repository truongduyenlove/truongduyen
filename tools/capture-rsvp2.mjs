import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'D:/truongduyen/web/reference';
const URL = 'https://chungdoi.com/i/batruong-thiduyen-cherish';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh',
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(1200);
await page.locator('text=Mở thiệp').first().click();
await page.waitForTimeout(3000);

const rsvp = page.locator('button:has-text("XÁC NHẬN THAM DỰ")').first();
await rsvp.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await rsvp.click();
await page.waitForTimeout(1000);

// find the overlay: the highest z-index fixed element that contains the heading
const overlayHtml = await page.evaluate(() => {
  const cands = [...document.querySelectorAll('body *')].filter(el => {
    const t = el.textContent || '';
    return t.includes('Xác nhận tham dự') && t.includes('Gửi xác nhận');
  });
  // pick the outermost smallest one that is not body
  let best = null;
  for (const el of cands) if (!best || el.contains(best) === false) best = el;
  // climb to a fixed-position ancestor
  let n = best;
  while (n && n !== document.body) {
    const cs = getComputedStyle(n);
    if (cs.position === 'fixed' || cs.position === 'absolute') break;
    n = n.parentElement;
  }
  return (n || best).outerHTML;
});
await fs.writeFile(path.join(OUT, 'rsvp-overlay.html'), overlayHtml, 'utf8');
console.log('overlay len', overlayHtml.length);

// click "Tôi sẽ đến" and screenshot selected state
const yes = page.locator('button:has-text("Tôi sẽ đến")').first();
if (await yes.count()) {
  await yes.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'state-04b-rsvp-selected.png') });
}
// dump after selection to see extra fields (guests count etc.)
const overlay2 = await page.evaluate(() => {
  const n = [...document.querySelectorAll('body *')].find(el => (el.textContent || '').includes('Gửi xác nhận') && getComputedStyle(el).position === 'fixed');
  return n ? n.outerHTML : '';
});
await fs.writeFile(path.join(OUT, 'rsvp-overlay-selected.html'), overlay2, 'utf8');
console.log('selected overlay len', overlay2.length);

// text of overlay after selection
const txt = await page.evaluate(() => {
  const n = [...document.querySelectorAll('body *')].find(el => (el.textContent || '').includes('Gửi xác nhận') && getComputedStyle(el).position === 'fixed');
  return n ? n.innerText : '';
});
await fs.writeFile(path.join(OUT, 'rsvp-overlay-selected.txt'), txt, 'utf8');

await browser.close();
console.log('ok');
