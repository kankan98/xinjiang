import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/#/chapter/' + encodeURIComponent('Day5-奎屯-赛里木湖'), { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const out = await page.evaluate(() => {
  const el = document.querySelector('.day-route-map-body');
  const hits = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list, media) => {
      for (const r of list) {
        if (r.type === CSSRule.MEDIA_RULE) walk(r.cssRules, r.conditionText);
        else if (r.selectorText && el.matches(r.selectorText)) {
          if (r.style.gridTemplateColumns || r.style.display) {
            hits.push({ media: media || '(all)', sel: r.selectorText, display: r.style.display, gtc: r.style.gridTemplateColumns, prio: r.style.getPropertyPriority('display') });
          }
        }
      }
    };
    walk(rules, null);
  }
  return { computed: getComputedStyle(el).gridTemplateColumns, width: el.getBoundingClientRect().width, hits };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
