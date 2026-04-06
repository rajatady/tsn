
import { chromium } from 'playwright';
const [,, htmlFile, vpWidth, vpHeight, ...ids] = process.argv;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: +vpWidth, height: +vpHeight } });
await page.goto('file://' + htmlFile);
await page.waitForLoadState('networkidle');
const results = {};
for (const id of ids) {
  const el = await page.$('[data-testid="' + id + '"]');
  if (el) {
    const box = await el.boundingBox();
    if (box) results[id] = { x: box.x, y: box.y, width: box.width, height: box.height };
  }
}
console.log(JSON.stringify(results));
await browser.close();
