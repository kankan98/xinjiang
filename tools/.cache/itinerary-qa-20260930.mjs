import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({channel:'chrome',headless:true});
const errors=[];const checks=[];
for(const width of [390,1280]) {
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [day,slug] of [['D7','Day7-伊宁-那拉提-唐布拉-尼勒克'],['D8','Day8-尼勒克-乌鲁木齐']]) {
  await page.goto('http://127.0.0.1:4175/#/chapter/'+encodeURIComponent(slug));
  await page.locator('.chapter-content').waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`screenshots/itinerary-20260930/${day}-${width}-opening.png`});
  const map=page.locator('.day-route-map');await map.locator('button.day-route-map-toggle').click();
  await map.screenshot({path:`screenshots/itinerary-20260930/${day}-${width}-map.png`});
  checks.push({day,width,title:await page.locator('#readerTitle').innerText(),overflow:await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)});
 }
 await context.close();
}
await browser.close();writeFileSync('screenshots/itinerary-20260930/verification.json',JSON.stringify({checks,errors},null,2)+'\n');
console.log(JSON.stringify({checks,errors}));if(errors.length||checks.some(x=>x.overflow>1))process.exitCode=1;
