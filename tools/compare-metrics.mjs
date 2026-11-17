import { chromium } from 'playwright';

const LAUNCH = { channel: 'chrome', headless: true };

async function measure(url, clickOpen) {
  const browser = await chromium.launch(LAUNCH);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'vi-VN' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  if (clickOpen) {
    await page.locator('text=Mở thiệp').first().click();
    await page.waitForTimeout(2500);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const out = { sections: [], texts: {} };
    const root = document.querySelector('[data-showcase-root]') || document.querySelector('[data-invitation-page]');
    if (root) {
      let node = root;
      while (node && node.children.length === 1 && node.children[0].tagName === 'DIV') node = node.children[0];
      out.sections = [...node.children].map(c => ({ tag: c.tagName, h: Math.round(c.getBoundingClientRect().height) }));
    }
    const grab = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: Math.round(r.width), h: Math.round(r.height), font: cs.fontFamily.slice(0, 60), size: cs.fontSize };
    };
    out.texts.headerName = grab('header p.whitespace-nowrap');
    out.texts.groomName = (() => {
      const el = [...document.querySelectorAll('h3')].find(h => /Trường/.test(h.textContent));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), font: getComputedStyle(el).fontFamily.slice(0, 60), size: getComputedStyle(el).fontSize };
    })();
    out.texts.intro = grab('header p.relative.z-10');
    out.bodyFont = getComputedStyle(document.body).fontFamily.slice(0, 80);
    out.total = Math.round(document.body.scrollHeight);
    return out;
  });
  await browser.close();
  return data;
}

const live = await measure('https://chungdoi.com/i/batruong-thiduyen-cherish', true);
const local = await measure('http://localhost:4321/', true);

console.log('LIVE ', JSON.stringify(live, null, 1));
console.log('LOCAL', JSON.stringify(local, null, 1));
console.log('\nsection count', live.sections.length, local.sections.length);
for (let i = 0; i < Math.max(live.sections.length, local.sections.length); i++) {
  const a = live.sections[i], b = local.sections[i];
  const same = a && b && a.tag === b.tag && Math.abs(a.h - b.h) <= 1;
  console.log(`${same ? 'SAME' : 'DIFF'} #${i} live=${a && a.tag}:${a && a.h} local=${b && b.tag}:${b && b.h}`);
}
