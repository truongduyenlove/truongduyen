import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

const fail = [];
const ok = (cond, label) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fail.push(label); };
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) errs.push(r.status() + ' ' + r.url()); });

const counters = {
  gallery: '.tabular-nums',
  submit: 'button[type="submit"]',
};

await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

ok(await page.evaluate(() => document.body.classList.contains('invite-locked')), 'scroll locked before opening');
ok(await page.locator('#invite-envelope').isVisible(), 'envelope visible');

await page.locator('#invite-envelope .relative.rounded-lg').click();
await page.waitForTimeout(1400);

ok(await page.evaluate(() => !document.body.classList.contains('invite-locked')), 'scroll unlocked after opening');
ok(!(await page.locator('#invite-envelope').isVisible()), 'envelope hidden after opening');

const audio = await page.evaluate(() => { const a = document.getElementById('bg-music'); return { paused: a.paused, t: a.currentTime, src: a.src }; });
ok(!audio.paused, 'music playing after open (t=' + audio.t.toFixed(1) + ')');
ok(audio.src.includes('/music/yt-158e0d9e-b3c.mp3'), 'local mp3 source');

await page.waitForTimeout(1200);
const t2 = await page.evaluate(() => document.getElementById('bg-music').currentTime);
ok(t2 > audio.t, 'music progressing');

await page.locator('button[aria-label="Tạm dừng nhạc"]').first().click();
await page.waitForTimeout(500);
ok(await page.evaluate(() => document.getElementById('bg-music').paused), 'music pause works');
ok(await page.locator('button[aria-label="Phát nhạc"]').first().count() > 0, 'music button label updates');
await page.locator('button[aria-label="Phát nhạc"]').first().click();
await page.waitForTimeout(500);
ok(!(await page.evaluate(() => document.getElementById('bg-music').paused)), 'music resume works');

const readCountdown = () => page.evaluate(() => {
  const p = [...document.querySelectorAll('p')].find(el => /ngày/.test(el.textContent));
  return p ? p.textContent.trim() : '';
});
const cd1 = await readCountdown();
await page.waitForTimeout(1500);
const cd2 = await readCountdown();
ok(/ngày/.test(cd1), 'countdown rendered: ' + cd1);
ok(cd1 !== cd2, 'countdown ticking');

await page.evaluate(() => document.querySelector('.touch-pan-y').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(600);
ok(await page.evaluate(() => [...document.querySelectorAll('.touch-pan-y div.absolute')].filter(c => c.style.zIndex === '100').length === 1), 'one centre gallery card');

const counter1 = await page.evaluate(sel => document.querySelector(sel).textContent, counters.gallery);
await page.waitForTimeout(4600);
const counter2 = await page.evaluate(sel => document.querySelector(sel).textContent, counters.gallery);
ok(counter1 !== counter2, 'gallery auto advances (' + counter1 + ' -> ' + counter2 + ')');

await page.evaluate(() => {
  const c = [...document.querySelectorAll('.touch-pan-y div.absolute')].find(x => x.style.zIndex === '100');
  c.click();
});
await page.waitForTimeout(800);
ok(await page.evaluate(() => !!document.querySelector('dialog.modal[open]')), 'lightbox opens');
await page.locator('dialog.modal[open] button[aria-label="Next image"]').click();
await page.waitForTimeout(400);
ok(true, 'lightbox next button works');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
ok(!(await page.evaluate(() => !!document.querySelector('dialog.modal[open]'))), 'lightbox closes');

const rsvpBtn = page.locator('button').filter({ hasText: 'XÁC NHẬN' }).first();
await rsvpBtn.scrollIntoViewIfNeeded();
await rsvpBtn.click();
await page.waitForTimeout(600);
ok(await page.locator('h2', { hasText: 'Xác nhận tham dự' }).count() > 0, 'rsvp overlay opens');

const rsvpInput = page.locator('body > div.fixed.inset-0 input[type="text"]').last();
await rsvpInput.fill('Người kiểm thử');
await page.locator('body > div.fixed.inset-0 label').filter({ hasText: 'Tôi sẽ đến' }).last().click();
await page.waitForTimeout(200);
const submitSelector = 'body > div.fixed.inset-0 button[type="submit"]';
ok(!(await page.locator(submitSelector).last().isDisabled()), 'rsvp submit enabled after filling');
await page.locator(submitSelector).last().click();
const rsvpDone = await page.locator('h2', { hasText: 'Cảm ơn bạn!' }).first()
  .waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
ok(rsvpDone, 'rsvp success state');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const gift = page.locator('button[aria-label="Mở hộp mừng cưới"]');
await gift.scrollIntoViewIfNeeded();
await gift.click();
await page.waitForTimeout(600);
ok(await page.evaluate(() => [...document.querySelectorAll('dialog')].some(d => d.open)), 'gift dialog opens');
const qrOk = await page.evaluate(() => {
  const d = [...document.querySelectorAll('dialog')].find(x => x.open);
  return d ? [...d.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0) : false;
});
ok(qrOk, 'qr images load');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

await page.locator('input[placeholder="Nhập tên*"]').fill('QA Auto');
await page.locator('textarea[placeholder="Nhập lời chúc*"]').fill('Lời chúc kiểm thử tự động');
await page.locator('button[type="submit"]').filter({ hasText: 'GỬI LỜI CHÚC' }).click();
await page.waitForTimeout(1200);
ok(await page.locator('p', { hasText: 'Lời chúc kiểm thử tự động' }).count() > 0, 'guestbook comment appears');

const brokenImgs = await page.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
ok(brokenImgs.length === 0, 'all images load' + (brokenImgs.length ? ': ' + brokenImgs.join(', ') : ''));

ok(errs.length === 0, 'no runtime errors' + (errs.length ? ': ' + errs.join(' | ') : ''));

await page.screenshot({ path: 'D:/truongduyen/web/qa/functional-final.png', fullPage: true });
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS');
await browser.close();
