import { chromium } from 'playwright';
const days = ['Day0-香港-乌鲁木齐','Day1-乌鲁木齐-布尔津','Day2-布尔津-白哈巴','Day3-白哈巴-喀纳斯全天','Day4-白哈巴-克拉玛依-奎屯','Day5-奎屯-赛里木湖','Day6-赛里木湖-伊宁','Day7-伊宁-那拉提-唐布拉-尼勒克','Day8-尼勒克-乌鲁木齐','Day9-乌鲁木齐-香港'];
const browser = await chromium.launch();
for (const [width, height, mobile] of [[320, 568, true], [768, 1024, true], [1024, 800, false]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  let bad = 0;
  for (const day of days) {
    await page.goto(`http://localhost:4173/#/chapter/${encodeURIComponent(day)}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const doc = document.documentElement;
      const svg = document.querySelector('.day-route-map-scroll svg');
      return { overflowX: doc.scrollWidth - doc.clientWidth, svgW: svg ? Math.round(svg.getBoundingClientRect().width) : null };
    });
    if (r.overflowX > 0) { bad++; console.log(`  OVERFLOW ${width}: ${day}`, JSON.stringify(r)); }
  }
  console.log(`viewport ${width} (mobile=${mobile}): days with page overflow = ${bad}`);
  await ctx.close();
}
await browser.close();
