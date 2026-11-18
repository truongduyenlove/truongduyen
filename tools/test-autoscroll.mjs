import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));

const y = () => page.evaluate(() => Math.round(window.scrollY));
const hold = () => page.evaluate(() => window.dispatchEvent(new Event('touchstart', { bubbles: true })));
const release = () => page.evaluate(() => window.dispatchEvent(new Event('touchend', { bubbles: true })));
const fail = [];
const ok = (c, l) => { console.log((c ? 'PASS ' : 'FAIL ') + l); if (!c) fail.push(l); };

await page.goto('http://localhost:4321/?open=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const a = await y();
await page.waitForTimeout(2500);
const b = await y();
ok(b - a > 60, `auto scroll moves (${a} -> ${b}, +${b - a} in 2.5s)`);

await hold();
await page.waitForTimeout(300);
const c = await y();
await page.waitForTimeout(1500);
const d = await y();
ok(Math.abs(d - c) <= 3, `paused while touching (${c} -> ${d})`);

await release();
await page.waitForTimeout(2600);
const e = await y();
ok(e - d > 40, `resumes after release (${d} -> ${e})`);

await hold();
await page.evaluate(() => document.querySelector('.touch-pan-y').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(500);

const td = await page.evaluate(() => getComputedStyle(document.querySelector('.touch-pan-y div.absolute')).transitionDuration);
ok(/0\.7s/.test(td), `gallery transition ${td}`);

const counterBefore = await page.evaluate(() => document.querySelector('.tabular-nums').textContent);
await page.waitForTimeout(3200);
const counterAfter = await page.evaluate(() => document.querySelector('.tabular-nums').textContent);
ok(counterBefore !== counterAfter, `gallery advances faster (${counterBefore} -> ${counterAfter})`);

await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.touch-pan-y div.absolute')].filter(c => c.querySelector('img'));
  const center = cards.find(c => c.style.zIndex === '100');
  center.click();
});
await page.waitForTimeout(500);
const f = await y();
await page.waitForTimeout(1500);
const g = await y();
ok(Math.abs(g - f) <= 3, `paused while lightbox open (${f} -> ${g})`);

await page.keyboard.press('Escape');
await release();
await page.waitForTimeout(2600);
const h = await y();
ok(h - g > 30, `resumes after closing lightbox (${g} -> ${h})`);

await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2200);
const i = await y();
await page.waitForTimeout(1500);
const j = await y();
ok(i === j, `stops at bottom (${i} == ${j})`);

ok(errs.length === 0, 'no runtime errors' + (errs.length ? ': ' + errs[0] : ''));
await browser.close();
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS');
