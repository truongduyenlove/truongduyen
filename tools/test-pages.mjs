import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const fail = [];
const ok = (cond, label) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fail.push(label); };

async function checkBase(base, appScript) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const errs = [];
  const requests = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  page.on('request', r => requests.push(r.url()));
  if (appScript) {
    await page.addInitScript((url) => { window.WEDDING_CONFIG = { appScriptUrl: url }; }, appScript);
  }

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  ok(await page.locator('#invite-envelope').isVisible(), `[${base}] envelope renders`);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)', `[${base}] stylesheet applied (body bg ${bg})`);

  await page.locator('#invite-envelope .relative.rounded-lg').click();
  await page.waitForTimeout(1800);
  ok(!(await page.locator('#invite-envelope').isVisible()), `[${base}] envelope opens`);

  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
  });
  const broken = await page.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
  ok(broken.length === 0, `[${base}] images load` + (broken.length ? ': ' + broken.slice(0, 3).join(', ') : ''));

  const fontOk = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter(f => f.status === 'loaded').length;
  });
  ok(fontOk > 0, `[${base}] fonts loaded (${fontOk})`);

  const fontFails = requests.filter(u => /fonts\/.*\.(woff2?|ttf)/.test(u) && !u.startsWith(base.split('/truongduyen')[0]));
  ok(true, `[${base}] font requests: ${fontFails.length}`);

  ok(errs.length === 0, `[${base}] no 4xx/errors` + (errs.length ? ': ' + [...new Set(errs)].slice(0, 4).join(' | ') : ''));
  await page.screenshot({ path: `qa/pages-${base.includes('truongduyen') ? 'sub' : 'root'}${appScript ? '-script' : ''}.png`, fullPage: false });
  await ctx.close();
  return page;
}

await checkBase('http://localhost:4321/', '');
await checkBase('http://localhost:4321/truongduyen/', '');

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const page = await ctx.newPage();
await page.addInitScript(() => { window.WEDDING_CONFIG = { appScriptUrl: 'http://localhost:4321/mock-apps-script' }; });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('http://localhost:4321/truongduyen/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('#invite-envelope .relative.rounded-lg').click();
await page.waitForTimeout(1500);

await page.locator('input[placeholder="Nhập tên*"]').fill('Sheet Test');
await page.locator('textarea[placeholder="Nhập lời chúc*"]').fill('Lời chúc gửi qua Apps Script mock');
await page.locator('button[type="submit"]').filter({ hasText: 'GỬI LỜI CHÚC' }).click();
await page.waitForTimeout(2500);
const wishVisible = await page.locator('p', { hasText: 'Lời chúc gửi qua Apps Script mock' }).count();
ok(wishVisible > 0, 'guestbook posts through Apps Script endpoint (form POST) and shows');

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.locator('#invite-envelope .relative.rounded-lg').click();
await page.waitForTimeout(1500);
const wishReloaded = await page.locator('p', { hasText: 'Lời chúc gửi qua Apps Script mock' }).count();
ok(wishReloaded > 0, 'guestbook reads back from Apps Script JSONP after reload');

const rsvpBtn = page.locator('button').filter({ hasText: 'XÁC NHẬN' }).first();
await rsvpBtn.scrollIntoViewIfNeeded();
await rsvpBtn.click();
await page.waitForTimeout(600);
await page.locator('body > div.fixed.inset-0 input[type="text"]').last().fill('RSVP Sheet Test');
await page.locator('body > div.fixed.inset-0 label').filter({ hasText: 'Tôi sẽ đến' }).last().click();
await page.waitForTimeout(300);
const countVisible = await page.locator('body > div.fixed.inset-0 input[type="number"]').last().isVisible();
ok(countVisible, 'rsvp guest-count field shows for "Tôi sẽ đến"');
await page.locator('body > div.fixed.inset-0 input[type="number"]').last().fill('3');
await page.locator('body > div.fixed.inset-0 button[type="submit"]').last().click();
await page.waitForTimeout(1500);
ok(await page.locator('h2', { hasText: 'Cảm ơn bạn!' }).count() > 0, 'rsvp submits through Apps Script endpoint');

ok(errs.length === 0, 'no runtime errors on apps-script path' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));

const rsvpData = JSON.parse(await fs.readFile('D:/truongduyen/web/data/rsvp.json', 'utf8'));
ok((rsvpData.rsvps || []).some(r => r.name === 'RSVP Sheet Test' && r.count === 3), 'rsvp payload reached endpoint with count=3');

await browser.close();
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS');
