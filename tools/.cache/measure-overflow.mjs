import { chromium } from 'playwright';
const days = ['Day0-香港-乌鲁木齐','Day1-乌鲁木齐-布尔津','Day2-布尔津-白哈巴','Day3-白哈巴-喀纳斯全天','Day4-白哈巴-克拉玛依-奎屯','Day5-奎屯-赛里木湖','Day6-赛里木湖-伊宁','Day7-伊宁-那拉提-唐布拉-尼勒克','Day8-尼勒克-乌鲁木齐','Day9-乌鲁木齐-香港'];
const browser = await chromium.launch();
for (const width of [360, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  console.log(`===== viewport ${width} =====`);
  for (const day of days) {
    await page.goto(`http://localhost:4173/#/chapter/${encodeURIComponent(day)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth - doc.clientWidth;
      const wide = [];
      if (overflowX > 0) {
        for (const el of document.querySelectorAll('*')) {
          const b = el.getBoundingClientRect();
          if (b.right > doc.clientWidth + 1 && b.width > 8) {
            wide.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')}: right=${Math.round(b.right)} w=${Math.round(b.width)}`);
            if (wide.length >= 8) break;
          }
        }
      }
      const card = document.querySelector('.day-route-map');
      const cardB = card ? card.getBoundingClientRect() : null;
      const scroll = document.querySelector('.day-route-map-scroll');
      const svg = document.querySelector('.day-route-map-scroll svg');
      return {
        overflowX,
        cardW: cardB ? Math.round(cardB.width) : null,
        scrollW: scroll ? Math.round(scroll.getBoundingClientRect().width) : null,
        scrollClientW: scroll ? scroll.clientWidth : null,
        svgW: svg ? Math.round(svg.getBoundingClientRect().width) : null,
        wide,
      };
    });
    console.log(day.split('-')[0], JSON.stringify(r));
  }
  await ctx.close();
}
await browser.close();
