import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/?open=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const section = page.locator('[data-landing-screenshot-id="invite-reception"]');
await section.scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
await section.screenshot({ path: 'qa/reception-updated.png' });
console.log(await page.evaluate(() => {
  const el = document.querySelector('[data-landing-screenshot-id="invite-reception"]');
  return el.innerText.replace(/\n+/g, ' | ');
}));

await browser.close();
