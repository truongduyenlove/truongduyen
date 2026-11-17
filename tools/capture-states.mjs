import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'D:/truongduyen/web/reference';
const URL = 'https://chungdoi.com/i/batruong-thiduyen-cherish';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
});
const page = await ctx.newPage();
const logs = [];
page.on('console', m => logs.push(`console.${m.type()}: ${m.text()}`));
page.on('pageerror', e => logs.push(`pageerror: ${e}`));

await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);

// capture envelope transition frames
await page.screenshot({ path: path.join(OUT, 'state-00-envelope.png') });
const openBtn = page.locator('text=Mở thiệp').first();
await openBtn.click();
for (let i = 1; i <= 6; i++) {
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(OUT, `state-01-open-${i}.png`) });
}
await page.waitForTimeout(2500);

// scroll to load everything
await page.evaluate(async () => {
  const h = document.body.scrollHeight;
  for (let y = 0; y < h; y += 400) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(2000);
// force all lazy images
await page.evaluate(async () => {
  document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
  await Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
});
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, 'state-02-loaded-full.png'), fullPage: true });

// section element screenshots
const secIds = await page.evaluate(() =>
  [...document.querySelectorAll('[data-landing-screenshot-id]')].map(e => e.getAttribute('data-landing-screenshot-id'))
);
console.log('sections:', secIds.join(', '));
for (const id of secIds) {
  const el = page.locator(`[data-landing-screenshot-id="${id}"]`).first();
  if (await el.count()) {
    try { await el.screenshot({ path: path.join(OUT, `sec-${id}.png`) }); } catch (e) { console.log('shot fail', id, e.message.slice(0, 80)); }
  }
}

// gallery click -> lightbox
const galleryImg = page.locator('.touch-pan-y img').first();
if (await galleryImg.count()) {
  await galleryImg.click({ force: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'state-03-lightbox.png') });
  await fs.writeFile(path.join(OUT, 'state-03-lightbox.html'), await page.evaluate(() => document.body.innerHTML), 'utf8');
  await page.keyboard.press('Escape').catch(() => {});
  await page.mouse.click(10, 10).catch(() => {});
  await page.waitForTimeout(800);
}

// RSVP
const rsvp = page.locator('button:has-text("XÁC NHẬN THAM DỰ")').first();
if (await rsvp.count()) {
  await rsvp.click({ force: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'state-04-rsvp.png') });
  await fs.writeFile(path.join(OUT, 'state-04-rsvp.html'), await page.evaluate(() => document.body.innerHTML), 'utf8');
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(600);
}

// gift envelope
const gift = page.locator('button[aria-label="Mở hộp mừng cưới"]').first();
if (await gift.count()) {
  await gift.scrollIntoViewIfNeeded();
  await gift.click({ force: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'state-05-gift.png') });
  await fs.writeFile(path.join(OUT, 'state-05-gift.html'), await page.evaluate(() => document.body.innerHTML), 'utf8');
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
}

// guestbook form state + focus
const nameInput = page.locator('input[placeholder="Nhập tên*"]').first();
if (await nameInput.count()) {
  await nameInput.scrollIntoViewIfNeeded();
  await nameInput.fill('Khách thử');
  await page.locator('textarea[placeholder="Nhập lời chúc*"]').first().fill('Chúc mừng hạnh phúc!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'state-06-guestbook-filled.png') });
}

// music button state
const musicBtn = page.locator('button[aria-label*="nhạc"]').first();
if (await musicBtn.count()) {
  const aria = await musicBtn.getAttribute('aria-label');
  console.log('music aria before:', aria);
  await musicBtn.click({ force: true });
  await page.waitForTimeout(800);
  console.log('music aria after:', await musicBtn.getAttribute('aria-label'));
}

// dump final full dom
await fs.writeFile(path.join(OUT, 'state-final.html'), await page.evaluate(() => document.documentElement.outerHTML), 'utf8');
await fs.writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
await browser.close();
console.log('done');
