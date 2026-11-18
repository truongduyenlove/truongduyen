import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN' });

for (const [label, url, expected] of [
  ['GROOM', 'http://localhost:4321/', 'Đỗ Trường & Nguyễn Duyên'],
  ['BRIDE', 'http://localhost:4321/co-dau/', 'Nguyễn Duyên & Đỗ Trường'],
]) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const text = await page.evaluate(() => {
    const h1 = document.querySelector('#invite-envelope h1');
    return h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : '';
  });
  console.log(label, 'envelope:', JSON.stringify(text), text.includes(expected) ? 'PASS' : 'FAIL');
  console.log(label, 'title:', await page.title());
  await page.screenshot({ path: `qa/envelope-${label.toLowerCase()}.png` });
  await page.close();
}

await browser.close();
