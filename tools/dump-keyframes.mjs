import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('https://chungdoi.com/i/batruong-thiduyen-cherish', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);

const data = await page.evaluate(() => {
  const keyframes = [];
  const inlineStyles = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    const walk = (list) => {
      for (const rule of list) {
        if (rule.type === CSSRule.KEYFRAMES_RULE) keyframes.push(rule.cssText);
        else if (rule.cssRules) walk(rule.cssRules);
      }
    };
    walk(rules);
  }
  document.querySelectorAll('style').forEach((s, i) => inlineStyles.push({ i, text: s.textContent.slice(0, 4000) }));
  return { keyframes, inlineStyles, styleCount: document.querySelectorAll('style').length };
});

await fs.writeFile('D:/truongduyen/web/reference/keyframes.txt', data.keyframes.join('\n\n'), 'utf8');
await fs.writeFile('D:/truongduyen/web/reference/inline-styles.json', JSON.stringify(data.inlineStyles, null, 2), 'utf8');
console.log('keyframes', data.keyframes.length, 'style tags', data.styleCount);
console.log(data.keyframes.map(k => k.split('{')[0]).join('\n'));
await browser.close();
