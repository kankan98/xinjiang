import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const base = 'http://127.0.0.1:4173';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Focused viewport screenshots of sections using new alert-banner / callout patterns
const shots = [
  ['day2-top', '/#/chapter/Day2-布尔津-白哈巴', 0, 900],
  ['topic-driving-top', '/#/chapter/专题-理想L8新疆自驾指南', 0, 900],
  ['topic-scenic-top', '/#/chapter/专题-景区百科', 0, 900],
  ['overview-00-top', '/#/chapter/00-总目录', 0, 900],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const [name, path, scrollY, height] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(root, `screenshots/${name}.png`), clip: { x: 0, y: scrollY, width: 1280, height } });
  console.log('shot', name);
}
await browser.close();
