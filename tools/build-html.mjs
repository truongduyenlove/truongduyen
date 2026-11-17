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

// ---------- envelope (closed state, from the server rendered page) ----------
const rawPage = fs.readFileSync(path.join(ROOT, 'tools/body.raw.html'), 'utf8');
const $raw = cheerio.load(rawPage);
const envelope = $raw('[data-landing-screenshot-id="invite-envelope"]').first();
envelope.attr('id', 'invite-envelope');
let envelopeHtml = rewrite($raw.html(envelope));

// ---------- opened invitation (captured after clicking "Mở thiệp") ----------
const domFragment = fs.readFileSync(path.join(ROOT, 'reference/mobile-dom.html'), 'utf8');
const $dom = cheerio.load(domFragment, null, false);
$dom('script').remove();

const invitation = $dom('[data-video-invitation]').first();
invitation.attr('id', 'invite-content');
let invitationHtml = rewrite($dom.html(invitation));

// music toggle button (already part of the captured invitation DOM; only used
// as a fallback if the capture ever stops including it)
const musicWrap = $dom('button[aria-label*="nhạc"]').first().parent();
const musicInInvitation = invitationHtml.indexOf('fixed bottom-14 right-4') !== -1;
let musicHtml = musicInInvitation ? '' : rewrite($dom.html(musicWrap));

// rsvp overlay template
const rsvp = fs.readFileSync(path.join(ROOT, 'reference/rsvp-overlay.html'), 'utf8');
const rsvpHtml = rewrite(rsvp);

const page = `<!DOCTYPE html>
<html lang="vi" dir="ltr" data-theme="halloween">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#800000">
<title>Đỗ Trường &amp; Nguyễn Duyên | Thiệp cưới</title>
<meta name="description" content="Thân mời quý khách đến dự lễ cưới của Đỗ Trường &amp; Nguyễn Duyên | Thứ Bảy, 28 tháng 11, 2026 | Xóm ngọ thôn Đại vi xã Đại Đồng thành phố Bắc Ninh">
<meta property="og:title" content="Đỗ Trường &amp; Nguyễn Duyên">
<meta property="og:description" content="Thân mời quý khách đến dự lễ cưới của Đỗ Trường &amp; Nguyễn Duyên | Thứ Bảy, 28 tháng 11, 2026">
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
<script src="/js/app.js" defer></script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'index.html'), page, 'utf8');
console.log('index.html written', page.length);
console.log('envelope', envelopeHtml.length, 'invitation', invitationHtml.length, 'music', musicHtml.length);
