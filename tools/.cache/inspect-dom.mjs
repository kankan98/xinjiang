import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/#/chapter/' + encodeURIComponent('Day5-奎屯-赛里木湖'), { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  const body = document.querySelector('.day-route-map-body');
  const section = document.querySelector('.day-route-map');
  const skeleton = (el, depth = 0) => {
    if (!el || depth > 3) return '';
    return Array.from(el.children).map((c) => '  '.repeat(depth) + c.tagName.toLowerCase() + '.' + [...c.classList].join('.') + '\n' + skeleton(c, depth + 1)).join('');
  };
  return {
    bodyExists: !!body,
    display: body ? getComputedStyle(body).display : null,
    cols: body ? getComputedStyle(body).gridTemplateColumns : null,
    parentChain: (() => { let el = section; const out = []; while (el && out.length < 5) { out.push(el.tagName.toLowerCase() + '.' + [...el.classList].join('.')); el = el.parentElement; } return out; })(),
    skeleton: skeleton(section),
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
