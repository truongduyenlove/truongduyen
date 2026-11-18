import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const fail = [];
const ok = (c, l) => { console.log((c ? 'PASS ' : 'FAIL ') + l); if (!c) fail.push(l); };

async function check(url, label, venue, qrTitle) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('#invite-envelope .relative.rounded-lg').click();
  await page.waitForTimeout(1800);
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
  });
  const broken = await page.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
  ok(broken.length === 0, `${label}: images` + (broken.length ? ' ' + broken[0] : ''));

  const fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter(f => f.status === 'loaded').length; });
  ok(fonts > 0, `${label}: fonts ${fonts}`);

  const text = await page.evaluate(() => document.querySelector('[data-landing-screenshot-id="invite-map"] div[class*="whitespace-pre-line"]').innerText.trim());
  ok(text === venue, `${label}: venue -> ${text}`);

  await page.locator('button[aria-label="Mở hộp mừng cưới"]').scrollIntoViewIfNeeded();
  await page.locator('button[aria-label="Mở hộp mừng cưới"]').click();
  await page.waitForTimeout(700);
  const titles = await page.evaluate(() => {
    const d = [...document.querySelectorAll('dialog')].find(x => x.open);
    return d ? [...d.querySelectorAll('h3')].map(h => h.innerText.trim()) : [];
  });
  ok(titles.length === 1 && titles[0].includes(qrTitle), `${label}: QR -> ${titles.join(' | ')}`);

  ok(errs.length === 0, `${label}: no 4xx` + (errs.length ? ' ' + errs[0] : ''));
  const h = await page.evaluate(() => document.body.scrollHeight);
  ok(h > 3000, `${label}: page height ${h}`);
  await ctx.close();
}

await check('https://truongduyenlove.github.io/truongduyen/', 'LIVE nhà trai', 'Xóm ngọ thôn Đại vi xã Đại Đồng thành phố Bắc Ninh', 'Chú Rể');
await check('https://truongduyenlove.github.io/truongduyen/co-dau/', 'LIVE nhà gái', 'Xóm 6 thôn Rền xã Phật Tích thành phố Bắc Ninh', 'Cô Dâu');

await browser.close();
console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS');
