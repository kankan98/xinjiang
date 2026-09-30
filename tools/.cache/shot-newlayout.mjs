import { chromium } from 'playwright';
const browser = await chromium.launch();
// 桌面展开态：章节顶部整屏
const dctx = await browser.newContext({ viewport: { width: 1280, height: 1800 }, deviceScaleFactor: 1.5 });
const dpage = await dctx.newPage();
await dpage.goto('http://localhost:4173/#/chapter/' + encodeURIComponent('Day5-奎屯-赛里木湖'), { waitUntil: 'networkidle' });
await dpage.waitForTimeout(800);
await dpage.screenshot({ path: 'tools/.cache/new-desktop-day5.png' });
await dpage.goto('http://localhost:4173/#/chapter/' + encodeURIComponent('Day2-布尔津-白哈巴'), { waitUntil: 'networkidle' });
await dpage.waitForTimeout(800);
await dpage.screenshot({ path: 'tools/.cache/new-desktop-day2.png' });
await dctx.close();
// 移动端：收起默认 + 点开展开
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mpage = await mctx.newPage();
await mpage.goto('http://localhost:4173/#/chapter/' + encodeURIComponent('Day2-布尔津-白哈巴'), { waitUntil: 'networkidle' });
await mpage.waitForTimeout(600);
await mpage.locator('.day-route-map').first().scrollIntoViewIfNeeded();
await mpage.waitForTimeout(300);
await mpage.screenshot({ path: 'tools/.cache/new-mobile-collapsed.png' });
await mpage.locator('.day-route-map-toggle').first().click();
await mpage.waitForTimeout(400);
await mpage.locator('.day-route-map').first().screenshot({ path: 'tools/.cache/new-mobile-expanded.png' });
await mctx.close();
await browser.close();
console.log('ok');
