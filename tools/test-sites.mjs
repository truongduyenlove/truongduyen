import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const fail = [];
const ok = (cond, label) => { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fail.push(label); };

async function check(url, label, expectVenue, shot) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) errs.push(r.status() + ' ' + r.url()); });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  ok(await page.locator('#invite-envelope').isVisible(), `${label}: envelope`);
  await page.locator('#invite-envelope .relative.rounded-lg').click();
  await page.waitForTimeout(1800);

  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
  });
  const broken = await page.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
  ok(broken.length === 0, `${label}: images` + (broken.length ? ' ' + broken[0] : ''));

  const fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').length; });
  ok(fonts > 0, `${label}: fonts (${fonts})`);

  const venue = await page.evaluate(() => document.querySelector('[data-landing-screenshot-id="invite-map"] div[class*="whitespace-pre-line"]').innerText.trim());
  ok(venue === expectVenue, `${label}: venue = ${venue}`);
  const mapSrc = await page.getAttribute('[data-landing-screenshot-id="invite-map"] iframe', 'src');
  ok(/maps\.google\.com/.test(mapSrc || ''), `${label}: map iframe ${mapSrc}`);

  const familyAddr = await page.locator('[class*="grid-cols-[1fr_auto_1fr]"] div[class*="whitespace-pre-line"]').count();
  ok(familyAddr === 0, `${label}: family addresses removed`);

  await page.locator('button[aria-label="Mở hộp mừng cưới"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.locator('button[aria-label="Mở hộp mừng cưới"]').click();
  await page.waitForTimeout(800);
  const giftTitles = await page.evaluate(() => {
    const d = [...document.querySelectorAll('dialog')].find(x => x.open);
    return d ? [...d.querySelectorAll('h3')].map(h => h.innerText.trim()) : [];
  });
  ok(giftTitles.length === 1, `${label}: one QR block -> ${giftTitles.join(' | ')}`);
  await shot(page);
  await page.keyboard.press('Escape');

  ok(errs.length === 0, `${label}: no errors` + (errs.length ? ' ' + errs[0] : ''));
  await ctx.close();
}

await check('http://localhost:4321/', 'GROOM /', 'Xóm ngọ thôn Đại vi xã Đại Đồng thành phố Bắc Ninh', async (page) => {
  await page.screenshot({ path: 'qa/gift-groom.png' });
});
await check('http://localhost:4321/co-dau/', 'BRIDE /co-dau/', 'Xóm 6 thôn Rền xã Phật Tích thành phố Bắc Ninh', async (page) => {
  await page.screenshot({ path: 'qa/gift-bride.png' });
});
await check('http://localhost:4321/truongduyen/co-dau/', 'BRIDE subpath', 'Xóm 6 thôn Rền xã Phật Tích thành phố Bắc Ninh', async (page) => {
  await page.locator('[data-landing-screenshot-id="invite-map"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await page.locator('[data-landing-screenshot-id="invite-map"]').screenshot({ path: 'qa/bride-map.png' });
});

await browser.close();
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS');
