import re

h = open('mobile-opened.html', encoding='utf-8').read()
i = h.find('<div data-invitation-page')
body = h[i:]
j = body.find('<script id="_R_"')
if j == -1:
    j = body.rfind('<script')
dom = body[:j]
open('mobile-dom.html', 'w', encoding='utf-8').write(dom)
print('dom len', len(dom))
print('inline style attrs', len(re.findall(r'style="', dom)))
print('unique jsx classes', len(set(re.findall(r'jsx-[a-z0-9]+', dom))))
print('aria-hidden', dom.count('aria-hidden'))
print('scripts inside', [m.group(0)[:60] for m in re.finditer(r'<script[^>]*>', dom)])

h2 = re.sub(r'><', '>\n<', dom)
open('mobile-dom.pretty.html', 'w', encoding='utf-8').write(h2)
print('lines', len(h2.splitlines()))

VOID = {'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'use', 'stop', 'ellipse', 'line', 'polygon', 'polyline', 'animate', 'feturbulence', 'filter', 'area', 'col', 'track', 'wbr', 'animatetransform'}
depth = 0
out = []
for m in re.finditer(r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>', dom):
    closing, tag, attrs = m.group(1) == '/', m.group(2).lower(), m.group(3)
    if closing:
        depth = max(0, depth - 1)
        continue
    if depth <= 3:
        c = re.search(r'class="([^"]*)"', attrs)
        cls = c.group(1) if c else ''
        im = re.search(r'id="([^"]*)"', attrs)
        idm = im.group(1) if im else ''
        sm = re.search(r'style="([^"]*)"', attrs)
        st = sm.group(1) if sm else ''
        if cls or idm or tag in ('section', 'header', 'footer', 'main', 'nav', 'form'):
            out.append('  ' * depth + f'<{tag}{" #"+idm if idm else ""}{"." + ".".join(cls.split()) if cls else ""}>' + (f'  [{st[:90]}]' if st else ''))
    if tag not in VOID and not attrs.rstrip().endswith('/'):
        depth += 1
open('mobile-dom.outline.txt', 'w', encoding='utf-8').write('\n'.join(out))
print('outline', len(out))
