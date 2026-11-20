import fs from 'node:fs';
import * as cheerio from 'cheerio';

const sites = [
  ['GROOM', 'index.html'],
  ['BRIDE', 'co-dau/index.html'],
  ['NO-QR', 'khong-qr/index.html'],
];

for (const [label, file] of sites) {
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  const giftButton = $('button[aria-label="Mở hộp mừng cưới"]').first();
  const giftDialog = giftButton.parent().find('dialog').first();
  console.log('\n==', label, file, '==');
  console.log('base:', $('base').attr('href') || '(none)');
  console.log('family addresses:', $('[class*="grid-cols-[1fr_auto_1fr]"] div[class*="whitespace-pre-line"]').length);
  console.log('venue:', $('[data-landing-screenshot-id="invite-map"] div[class*="whitespace-pre-line"] span[dir="auto"]').first().text());
  console.log('gift button:', giftButton.length ? 'present' : 'absent');
  console.log('gift titles:', giftDialog.find('h3').map((i, el) => $(el).text().trim()).get().join(' | ') || '(none)');
  console.log('qr imgs:', giftDialog.find('img').length);
  console.log('h2 headings:', $('h2').map((i, el) => $(el).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean).join(' / '));
  console.log('envelope:', $('#invite-envelope h1').text().replace(/\s+/g, ' ').trim());
}
