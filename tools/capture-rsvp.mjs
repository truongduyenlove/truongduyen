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
const net = [];
page.on('request', r => { if (r.url().includes('chungdoi.com/api')) net.push(`${r.method()} ${r.url()}`); });
page.on('response', async r => {
  if (r.url().includes('/api/invite/') || r.url().includes('/api/music')) {
    try { const t = await r.text(); net.push(`RESP ${r.status()} ${r.url()} :: ${t.slice(0, 500)}`); } catch {}
  }
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(1500);
await page.locator('text=Mở thiệp').first().click();
await page.waitForTimeout(3000);

const rsvp = page.locator('button:has-text("XÁC NHẬN THAM DỰ")').first();
await rsvp.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await rsvp.click();
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, 'state-04-rsvp.png'), fullPage: false });
const dialogs = await page.evaluate(() =>
  [...document.querySelectorAll('dialog')].map(d => ({ open: d.open, cls: d.className, html: d.outerHTML }))
);
await fs.writeFile(path.join(OUT, 'state-04-rsvp-dialogs.json'), JSON.stringify(dialogs, null, 2), 'utf8');
console.log('dialogs:', dialogs.map(d => `${d.cls} open=${d.open} len=${d.html.length}`).join(' | '));

// fill RSVP form to discover options
const bodyText = await page.evaluate(() => {
  const d = [...document.querySelectorAll('dialog')].find(x => x.open);
  return d ? d.innerText : '';
});
await fs.writeFile(path.join(OUT, 'state-04-rsvp-text.txt'), bodyText, 'utf8');
console.log('---RSVP TEXT---\n' + bodyText);

// music audio element info
const audio = await page.evaluate(() => {
  const a = document.querySelector('audio');
  return a ? { src: a.src, paused: a.paused, currentTime: a.currentTime, duration: a.duration, vol: a.volume, muted: a.muted } : null;
});
console.log('audio', JSON.stringify(audio));
await fs.writeFile(path.join(OUT, 'net.log'), net.join('\n'), 'utf8');
console.log(net.filter(l => l.startsWith('RESP')).join('\n'));
await browser.close();
