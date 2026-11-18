import fs from 'node:fs';

const bad = ['Ã', 'á»', 'áº', 'Ä‘', 'Æ°', 'â€', '\uFFFD'];
for (const file of ['index.html', 'co-dau/index.html', 'js/app.js', 'js/config.js', 'tools/build-html.mjs', 'server.mjs', 'README.md', 'google-apps-script/Code.gs']) {
  const text = fs.readFileSync(file, 'utf8');
  const hits = bad.filter((b) => text.includes(b));
  console.log(file, hits.length ? 'SUSPECT ' + hits.join(' ') : 'clean');
}
