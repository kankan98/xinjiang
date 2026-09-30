// 每日线路图截图核对工具
// 用法：启动本地预览后运行 node tools/screenshot-day-maps.mjs [宽度，默认 390]
// 产物：screenshots/maps/；按实际视口截图，避免放大视口掩盖溢出。
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.ROADBOOK_PREVIEW_URL || process.env.PREVIEW_URL || 'http://127.0.0.1:5173';
const width = Number(process.argv[2]) || 390;
const height = width < 768 ? 844 : 900;
const manifest = JSON.parse(readFileSync(new URL('../src/data/roadbook.manifest.json', import.meta.url), 'utf8'));
const days = manifest.documents.filter((doc) => /^Day\d-/.test(doc.file)).map((doc) => doc.file.replace(/\.md$/, ''));

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = resolve(root, 'screenshots/maps');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const captures = [];
try {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768, colorScheme: theme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    for (const day of days) {
      await page.goto(`${base}/#/chapter/${encodeURIComponent(day)}`);
      const map = page.locator('.day-route-map');
      const toggle = map.locator('.day-route-map-toggle');
      await toggle.waitFor({ state: 'visible' });
      if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      });
      await map.evaluate((el) => window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 72, behavior: 'instant' }));
      const file = `map-${day.split('-')[0]}-${theme}-${width}.png`;
      await page.screenshot({ path: resolve(output, file) });
      captures.push({ day, theme, width, height, file });
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(resolve(output, `verification-${width}.json`), JSON.stringify({ captures, errors }, null, 2) + '\n');
console.log(`${captures.length} map screenshots at ${width}px; ${errors.length} page errors.`);
if (errors.length) process.exitCode = 1;
