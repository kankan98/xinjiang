import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const base = 'http://127.0.0.1:4173';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const shots = [
  // desktop wide
  ['w-topic-driving', '/#/chapter/专题-理想L8新疆自驾指南', 1280],
  ['w-day2', '/#/chapter/Day2-布尔津-白哈巴', 1280],
  ['w-overview', '/#/chapter/00-总目录', 1280],
  ['w-home', '/', 1280],
  // ultra-wide
  ['x-topic-driving', '/#/chapter/专题-理想L8新疆自驾指南', 1600],
  ['x-day2', '/#/chapter/Day2-布尔津-白哈巴', 1600],
  ['x-home', '/', 1600],
  // mobile
  ['m-topic-driving', '/#/chapter/专题-理想L8新疆自驾指南', 390],
  ['m-home', '/', 390],
];

const browser = await chromium.launch();
for (const [name, path, width] of shots) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(root, `screenshots/${name}.png`) });
  console.log('shot', name, width);
  await ctx.close();
}
await browser.close();
