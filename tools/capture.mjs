import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'D:/truongduyen/web/reference';
await fs.mkdir(OUT, { recursive: true });

const URL = 'https://chungdoi.com/i/batruong-thiduyen-cherish';

const requests = [];

async function run(name, viewport, isMobile) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile,
    hasTouch: isMobile,
    userAgent: isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
  });
  const page = await ctx.newPage();
  page.on('request', r => requests.push({ vp: name, method: r.method(), url: r.url(), type: r.resourceType() }));
  page.on('console', m => { if (m.type() === 'error') console.log(`[console:${name}]`, m.text().slice(0, 200)); });
  page.on('pageerror', e => console.log(`[pageerror:${name}]`, String(e).slice(0, 300)));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `${name}-01-envelope.png`) });

  // click open
  const btn = page.locator('text=Mở thiệp').first();
  if (await btn.count()) {
    await btn.click();
    console.log(`[${name}] clicked open`);
  } else {
    console.log(`[${name}] open button not found`);
  }
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(OUT, `${name}-02-opened.png`) });

  // scroll through page to trigger reveal animations
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log(`[${name}] scrollHeight=${h}`);
  for (let y = 0; y < h; y += Math.round(viewport.height * 0.6)) {
    await page.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `${name}-03-full.png`), fullPage: true });

  const html = await page.evaluate(() => document.documentElement.outerHTML);
  await fs.writeFile(path.join(OUT, `${name}-opened.html`), html, 'utf8');

  const text = await page.evaluate(() => document.body.innerText);
  await fs.writeFile(path.join(OUT, `${name}-opened.txt`), text, 'utf8');

  const dims = await page.evaluate(() => ({
    scrollHeight: document.body.scrollHeight,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
  }));
  console.log(`[${name}] dims`, JSON.stringify(dims));

  await browser.close();
}

await run('mobile', { width: 390, height: 844 }, true);
await run('desktop', { width: 1440, height: 900 }, false);

await fs.writeFile(path.join(OUT, 'requests.json'), JSON.stringify(requests, null, 2), 'utf8');
console.log('requests:', requests.length);
