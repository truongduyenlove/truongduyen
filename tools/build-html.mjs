import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ROOT = 'D:/truongduyen/web';

const qrMap = {
  '00020101021238540010A00000072701240006970407011063236888880208QRIBFTTA53037045802VN63049097': '/api/qr/36888880208QRIBFTTA53037045802VN63049097.png',
  '00020101021238540010A00000072701240006970436011010419917990208QRIBFTTA53037045802VN6304DCD4': '/api/qr/19917990208QRIBFTTA53037045802VN6304DCD4.png',
};

function rewrite(html) {
  let out = html;
  out = out.replace(/https:\/\/cdn\.chungdoi\.com\/uploads\//g, '/uploads/');
  out = out.replace(/https:\/\/cdn\.chungdoi\.com\/music\/[^"]+/g, '/music/yt-158e0d9e-b3c.mp3');
  out = out.replace(/src="\/api\/qr-png\?d=([^"]+?)"/g, (m, raw) => {
    const d = raw.replace(/&amp;/g, '&');
    const key = d.split('&')[0];
    return `src="${qrMap[key] || raw}"`;
  });
  out = out.replace(/&amp;/g, '&').replace(/&amp;/g, '&');
  out = out.replace(/src="https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?[^"]*"/g,
    'src="https://maps.google.com/maps?q=21.087579,105.997287&z=16&hl=vi&output=embed"');
  return out;
}

const FONT_STACK = 'Baskerville, &quot;Times New Roman&quot;, ChungDoiIndic, serif';

function customizeInvitation(html, opts) {
  const $ = cheerio.load(html, null, false);

  const rec = $('[data-landing-screenshot-id="invite-reception"]').first();
  const hasText = (el, re) => re.test($(el).text());
  const divs = () => rec.find('div');
  const leafDivWithText = (re) => divs().filter((i, el) => hasText(el, re) && $(el).children().length === 0).first();

  leafDivWithText(/^06:00$/).text('16:00');
  rec.find('span').filter((i, el) => $(el).text().trim() === 'THỨ BẢY').first().text('THỨ SÁU');
  rec.find('span')
    .filter((i, el) => $(el).text().trim() === '28' && ($(el).attr('class') || '').includes('text-[32px]'))
    .first().text('27');

  const receptionGuests = divs().filter((i, el) => hasText(el, /Đón khách/i)).first();
  if (receptionGuests.length) receptionGuests.remove();

  const lunarNote = leafDivWithText(/Tức ngày/);
  if (lunarNote.length) lunarNote.remove();

  const countdown = divs().filter((i, el) => hasText(el, /Cùng\s+đếm\s+ngược/i)).first();

  const ceremonyBlock = `
  <div class="w-full flex flex-col items-center mt-7">
    <div class="w-[68%] h-px mb-6" style="background:linear-gradient(to right,transparent,rgba(128,0,0,0.28),transparent)"></div>
    <h3 class="text-[16px] md:text-[20px] text-center uppercase flex flex-col items-center" style="color: rgb(128, 0, 0); font-family: ${FONT_STACK};">
      <span dir="auto">Lễ thành hôn diễn ra vào&nbsp;lúc:</span>
    </h3>
    <div class="text-[20px] md:text-[24px] font-semibold mt-2 text-center" style="color: rgb(128, 0, 0); font-family: ${FONT_STACK};">06:00</div>
    <div class="flex items-center justify-center mt-5" style="color: rgb(102, 102, 102); font-family: ${FONT_STACK};">
      <span class="text-[14px] md:text-[15px] w-[70px] md:w-[85px] uppercase whitespace-nowrap" style="color: rgb(102, 102, 102); font-family: ${FONT_STACK}; text-align: right;">THỨ BẢY</span>
      <span class="w-[1px] h-[25px] self-center opacity-50 mx-3 md:mx-4" style="background-color: rgb(102, 102, 102);"></span>
      <span class="text-[32px] md:text-[38px]" style="color: rgb(128, 0, 0); font-family: ${FONT_STACK};">28</span>
      <span class="w-[1px] h-[25px] self-center opacity-50 mx-3 md:mx-4" style="background-color: rgb(102, 102, 102);"></span>
      <span class="text-[14px] md:text-[15px] w-[70px] md:w-[85px] uppercase whitespace-nowrap" style="color: rgb(102, 102, 102); font-family: ${FONT_STACK}; text-align: left;">THÁNG 11</span>
    </div>
    <div class="text-[20px] md:text-[22px] mt-2 text-center" style="color: rgb(102, 102, 102); font-family: ${FONT_STACK};">2026</div>
    <div class="text-[13px] md:text-[14px] text-center mt-2" style="color: rgb(102, 102, 102); font-family: ${FONT_STACK};">(Tức ngày 20 tháng 10 năm Bính&nbsp;Ngọ)</div>
  </div>`;

  if (countdown.length) countdown.before(ceremonyBlock);

  const heartDate = rec.find('span')
    .filter((i, el) => $(el).text().trim() === '28' && ($(el).attr('class') || '').includes('font-bold'))
    .first();
  if (heartDate.length) {
    const heartCell = heartDate.parent().parent();
    const day27 = divs()
      .filter((i, el) => $(el).children().length === 1 && $(el).children().first().is('span') && $(el).text().trim() === '27')
      .first();
    if (day27.length) {
      const clone = heartCell.clone();
      clone.find('span').last().text('27');
      day27.html(clone.html());
    }
  }

  const addToCalendar = rec.find('a').filter((i, el) => hasText(el, /Thêm vào lịch/)).first();
  if (addToCalendar.length) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Tiệc cưới Đỗ Bá Trường & Nguyễn Thị Duyên',
      dates: '20261127T090000Z/20261127T130000Z',
      ctz: 'Asia/Bangkok',
      details: 'Tiệc cưới của Đỗ Bá Trường & Nguyễn Thị Duyên tại Xóm ngọ thôn Đại vi xã Đại Đồng thành phố Bắc Ninh',
      location: 'Xóm ngọ thôn Đại vi xã Đại Đồng thành phố Bắc Ninh',
    });
    addToCalendar.attr('href', 'https://www.google.com/calendar/render?' + params.toString());
  }

  $('[class*="grid-cols-[1fr_auto_1fr]"]')
    .find('div[class*="whitespace-pre-line"]')
    .remove();

  const giftDialog = $('button[aria-label="Mở hộp mừng cưới"]').first().parent().find('dialog').first();
  giftDialog.find('h3').each((i, el) => {
    const isBride = /^Cô Dâu/i.test($(el).text().trim());
    if ((opts.side === 'groom' && isBride) || (opts.side === 'bride' && !isBride)) {
      $(el).parent().remove();
    }
  });

  const mapSection = $('[data-landing-screenshot-id="invite-map"]').first();
  mapSection.find('div[class*="whitespace-pre-line"] span[dir="auto"]').first().text(opts.venue);
  mapSection.find('iframe').attr('src', opts.mapSrc);
  mapSection.find('a[href*="maps/dir"]').attr('href', opts.directionsHref);

  return $.html();
}

// ---------- envelope (closed state, from the server rendered page) ----------
const rawPage = fs.readFileSync(path.join(ROOT, 'tools/body.raw.html'), 'utf8');
const $raw = cheerio.load(rawPage);
const envelope = $raw('[data-landing-screenshot-id="invite-envelope"]').first();
envelope.attr('id', 'invite-envelope');
const envelopeBase = rewrite($raw.html(envelope));

function envelopeFor(side) {
  if (side !== 'bride') return envelopeBase;
  const $e = cheerio.load(envelopeBase, null, false);
  const h1 = $e('h1').first();
  const nameSpans = h1.children('span').filter((i, el) => {
    const text = $e(el).text().trim();
    return text === 'Đỗ Trường' || text === 'Nguyễn Duyên';
  });
  const first = nameSpans.first();
  const last = nameSpans.last();
  const firstText = first.text();
  first.text(last.text());
  last.text(firstText);
  return $e.html();
}

// ---------- opened invitation (captured after clicking "Mở thiệp") ----------
const domFragment = fs.readFileSync(path.join(ROOT, 'reference/mobile-dom.html'), 'utf8');
const $dom = cheerio.load(domFragment, null, false);
$dom('script').remove();

const invitation = $dom('[data-video-invitation]').first();
invitation.attr('id', 'invite-content');
const baseInvitationHtml = rewrite($dom.html(invitation));

// music toggle button (already part of the captured invitation DOM; only used
// as a fallback if the capture ever stops including it)
const musicWrap = $dom('button[aria-label*="nhạc"]').first().parent();
const musicInInvitation = baseInvitationHtml.indexOf('fixed bottom-14 right-4') !== -1;
let musicHtml = musicInInvitation ? '' : rewrite($dom.html(musicWrap));

// rsvp overlay template
const rsvp = fs.readFileSync(path.join(ROOT, 'reference/rsvp-overlay.html'), 'utf8');
const rsvpHtml = rewrite(rsvp);

const SITES = [
  {
    side: 'groom',
    outFile: 'index.html',
    baseHref: '',
    venue: 'Xóm ngọ thôn Đại vi xã Đại Đồng thành phố Bắc Ninh',
    mapSrc: 'https://maps.google.com/maps?q=21.087579,105.997287&z=16&hl=vi&output=embed',
    directionsHref: 'https://www.google.com/maps/dir/?api=1&destination=21.087579,105.997287',
  },
  {
    side: 'bride',
    outFile: 'co-dau/index.html',
    baseHref: '../',
    venue: 'Xóm 6 thôn Rền xã Phật Tích thành phố Bắc Ninh',
    mapSrc: 'https://maps.google.com/maps?q=21.07691,106.03352&z=16&hl=vi&output=embed',
    directionsHref: 'https://www.google.com/maps/dir/?api=1&destination=21.07691,106.03352',
  },
];

function renderPage(invitationHtml, opts) {
  const baseTag = opts.baseHref ? `<base href="${opts.baseHref}">\n` : '';
  const envelopeHtml = envelopeFor(opts.side);
  const coupleTitle = opts.side === 'bride' ? 'Nguyễn Duyên &amp; Đỗ Trường' : 'Đỗ Trường &amp; Nguyễn Duyên';
  const description = `Thân mời quý khách đến dự lễ cưới của Đỗ Trường &amp; Nguyễn Duyên | Tiệc cưới 16:00 thứ Sáu 27/11/2026, Lễ thành hôn 06:00 thứ Bảy 28/11/2026 | ${opts.venue}`;
  return `<!DOCTYPE html>
<html lang="vi" dir="ltr" data-theme="halloween">
<head>
<meta charset="utf-8">
${baseTag}<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#800000">
<title>${coupleTitle} | Thiệp cưới</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${coupleTitle}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:image" content="/images/themes/song-hy-red/chu-hy.webp">
<link rel="preload" href="/fonts/PlayfairDisplay-Variable.ttf" as="font" crossorigin type="font/ttf">
<link rel="preload" href="/fonts/Lora-Regular.ttf" as="font" crossorigin type="font/ttf">
<link rel="preload" as="image" href="/images/themes/song-hy-red/chu-hy.webp">
<link rel="stylesheet" href="/_next/static/css/6688992a3254798a.css">
<link rel="stylesheet" href="/_next/static/css/08fc569d88870472.css">
<link rel="stylesheet" href="/css/local.css">
<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon-v2.png">
<style>html,body{margin:0;padding:0}</style>
</head>
<body class="font-sans invite-locked">
<div data-invitation-page="true" class="contents">

${envelopeHtml}

<audio id="bg-music" style="display:none" data-music-track-id="yt-158e0d9e-b3c" data-music-start="31" data-music-end="341" preload="auto" loop src="/music/yt-158e0d9e-b3c.mp3"></audio>

${invitationHtml}

${musicHtml}

</div>
<template id="rsvp-template">${rsvpHtml}</template>
<script src="/js/config.js"></script>
<script src="/js/app.js" defer></script>
</body>
</html>
`;
}

function relativize(html) {
  return html
    .replace(/((?:href|src|content)=")\/(?!\/)/g, '$1')
    .replace(/url\((['"]?)\/(?!\/)/g, 'url($1');
}

for (const site of SITES) {
  const invitationHtml = customizeInvitation(baseInvitationHtml, site);
  const html = relativize(renderPage(invitationHtml, site));
  const out = path.join(ROOT, site.outFile);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
  console.log('written', site.outFile, html.length);
}
console.log('envelope', envelopeBase.length, 'music', musicHtml.length);
