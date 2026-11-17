import fs from 'node:fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('reference/mobile-opened.html', 'utf8');
const $ = cheerio.load(html);
$('script').remove();

const root = $('div[data-invitation-page]');
console.log('root found:', root.length);

function label(el) {
  const $el = $(el);
  const t = el.tagName;
  const id = $el.attr('id') ? '#' + $el.attr('id') : '';
  const cls = $el.attr('class') ? '.' + $el.attr('class').trim().split(/\s+/).join('.') : '';
  const st = $el.attr('style') ? ' [' + $el.attr('style').slice(0, 70) + ']' : '';
  return `<${t}${id}${cls}>${st}`;
}

const lines = [];
function walk(el, depth) {
  if (depth > 5) return;
  for (const child of el.children || []) {
    if (child.type !== 'tag') continue;
    lines.push('  '.repeat(depth) + label(child));
    walk(child, depth + 1);
  }
}
walk(root[0], 0);
fs.writeFileSync('reference/tree.txt', lines.join('\n'), 'utf8');
console.log('lines', lines.length);

// body text top-level ordering of headings
const heads = [];
$('div[data-invitation-page]').find('h1,h2,h3,section,footer,header').each((i, el) => {
  heads.push(`${el.tagName} ${$(el).attr('class') || ''} :: ${$(el).text().trim().slice(0, 60).replace(/\s+/g, ' ')}`);
});
fs.writeFileSync('reference/headings.txt', heads.join('\n'), 'utf8');
console.log(heads.length);
