import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1900 }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/#/chapter/' + encodeURIComponent('Day5-奎屯-赛里木湖'), { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'tools/.cache/day5-context.png' });
await browser.close();
console.log('ok');
