const { chromium } = require('playwright');
const { join } = require('path');

const baseUrl = process.env.ENVIRONMENT_URL || process.env.ORFARCHIV_BASE_URL || 'https://orfarchiv.news';
const screenshotsPath = process.env.SCREENSHOTS_PATH ?? '.';

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const response = await page.goto(baseUrl);

  if (response.status() > 399) {
    throw new Error(`Failed with response code ${response.status()}`);
  }

  await page.screenshot({ path: join(screenshotsPath, 'screenshot.png') });
  await page.close();
  await browser.close();
};

main().catch(console.log);
