import fs from 'node:fs';
import * as cheerio from 'cheerio';

for (const [label, file] of [['GROOM', 'index.html'], ['BRIDE', 'co-dau/index.html']]) {
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  console.log('\n==', label, file, '==');
  console.log('base:', $('base').attr('href') || '(none)');
  console.log('family addresses:', $('[class*="grid-cols-[1fr_auto_1fr]"] div[class*="whitespace-pre-line"]').length);
  console.log('map addr:', $('[data-landing-screenshot-id="invite-map"] div[class*="whitespace-pre-line"] span[dir="auto"]').first().text());
  console.log('iframe:', $('[data-landing-screenshot-id="invite-map"] iframe').attr('src'));
  console.log('directions:', $('[data-landing-screenshot-id="invite-map"] a[href*="maps/dir"]').attr('href'));
  const gift = $('button[aria-label="Mở hộp mừng cưới"]').first().parent().find('dialog').first();
  console.log('gift titles:', gift.find('h3').map((i, el) => $(el).text().trim()).get().join(' | '));
  console.log('qr imgs:', gift.find('img').length);
  console.log('relative asset sample:', $('link[rel="stylesheet"]').first().attr('href'));
}
