import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
for (const day of ['Day2-布尔津-白哈巴', 'Day5-奎屯-赛里木湖']) {
  await page.goto(`http://localhost:4173/#/chapter/${encodeURIComponent(day)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const map = page.locator('.day-route-map').first();
  await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await map.screenshot({ path: `tools/.cache/mobile-${day.split('-')[0]}.png` });
  console.log('shot', day);
}
await browser.close();
