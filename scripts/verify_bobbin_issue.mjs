import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9b613be0-deb9-40da-99bb-3a2f4c2c0dae';

async function runVerification() {
  console.log('Launching browser for Bobbin Issue verification...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Login
  console.log('Logging in as Super Admin...');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
  await page.type('input#email', 'superadmin@plexierp.com');
  await page.type('input#password', 'superadmin123');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {})
  ]);

  await new Promise(r => setTimeout(r, 1500));

  // 2. Navigate to Bobbin Issue tab
  console.log('Navigating to Bobbin Issue section...');
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=bobbin-issue', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading issue records'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // 3. Desktop Screenshot (1440x900)
  console.log('Capturing Desktop View (1440x900)...');
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 1500));
  const desktopPath = path.join(ARTIFACT_DIR, 'tape_plant_bobbin_issue_desktop_view_verified.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log('Desktop view saved to:', desktopPath);

  // 4. Mobile View (390x844 - iPhone / Smartphone)
  console.log('Capturing Mobile View (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading issue records'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  const mobileCollapsedPath = path.join(ARTIFACT_DIR, 'tape_plant_bobbin_issue_mobile_app_view_verified.png');
  await page.screenshot({ path: mobileCollapsedPath, fullPage: false });
  console.log('Mobile collapsed view saved to:', mobileCollapsedPath);

  // 5. Expand card #0 on mobile
  console.log('Expanding card #0 on mobile...');
  const cardHeaders = await page.$$('div[id^="bobbin-issue-card-"] > div:first-child');
  if (cardHeaders.length > 0) {
    await cardHeaders[0].click();
    await new Promise(r => setTimeout(r, 1000));
  }

  const mobileExpandedPath = path.join(ARTIFACT_DIR, 'tape_plant_bobbin_issue_mobile_expanded_verified.png');
  await page.screenshot({ path: mobileExpandedPath, fullPage: false });
  console.log('Mobile expanded view saved to:', mobileExpandedPath);

  // 6. Full page mobile screenshot
  const mobileFullPagePath = path.join(ARTIFACT_DIR, 'tape_plant_bobbin_issue_mobile_full_verified.png');
  await page.screenshot({ path: mobileFullPagePath, fullPage: true });
  console.log('Mobile full page saved to:', mobileFullPagePath);

  await browser.close();
  console.log('Bobbin Issue visual verification completed successfully!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

