import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const page = await ctx.newPage();
await page.goto('http://localhost:4321/?open=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const section = page.locator('.grid.grid-cols-\\[1fr_auto_1fr\\]').first();
await section.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.locator('[data-landing-screenshot-id="invite-content"], #invite-content').screenshot({ path: 'qa/family-section-full.png' }).catch(() => {});
const box = await section.boundingBox();
await page.screenshot({ path: 'qa/family-section.png', clip: { x: 0, y: Math.max(0, box.y - 60), width: 390, height: Math.min(400, box.height + 120) } });
console.log('family box', JSON.stringify(box));
await browser.close();
