import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const base = 'http://localhost:4173';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const shots = [
  ['home', '/'],
  ['overview-00', '/#/chapter/00-总目录'],
  ['overview-01', '/#/chapter/01-研究底稿'],
  ['day2', `/#/chapter/${encodeURIComponent('Day2-布尔津-白哈巴')}`],
  ['day6', '/#/chapter/Day6-赛里木湖-伊宁'],
  ['topic-driving', '/#/chapter/专题-理想L8新疆自驾指南'],
  ['topic-food', '/#/chapter/专题-美食指南'],
  ['topic-log', '/#/chapter/04-来源与复核日志'],
  ['topic-emergency', '/#/chapter/专题-新疆旅行应急宝典'],
  ['topic-scenic', '/#/chapter/专题-景区百科'],
  ['topic-drone', '/#/chapter/专题-无人机飞行规范'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const [name, path] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(root, `screenshots/${name}.png`), fullPage: true });
  console.log('shot', name);
}
await browser.close();
