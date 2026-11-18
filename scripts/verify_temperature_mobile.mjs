import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9b613be0-deb9-40da-99bb-3a2f4c2c0dae';

async function runVerification() {
  console.log('Launching browser for Process Temperature Mobile & Desktop verification...');
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
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
  ]);

  await new Promise(r => setTimeout(r, 2000));

  // 2. Navigate to Process Temperature tab
  console.log('Navigating to Process Temperature section...');
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=temperature', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  // 3. Desktop Screenshot (1440x900)
  console.log('Capturing Desktop View (1440x900)...');
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 1500));
  const desktopPath = path.join(ARTIFACT_DIR, 'tape_plant_temperature_desktop_view_verified.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log('Desktop view saved to:', desktopPath);

  // 4. Mobile View (390x844 - iPhone / Smartphone)
  console.log('Capturing Mobile View (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 1500));
  const mobilePath = path.join(ARTIFACT_DIR, 'tape_plant_temperature_mobile_app_view_verified.png');
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log('Mobile view saved to:', mobilePath);

  // 5. Mobile Full-Page Screenshot showing multiple reading cards
  console.log('Capturing Mobile Full Page View...');
  const mobileFullPagePath = path.join(ARTIFACT_DIR, 'tape_plant_temperature_mobile_full_verified.png');
  await page.screenshot({ path: mobileFullPagePath, fullPage: true });
  console.log('Mobile full page saved to:', mobileFullPagePath);

  await browser.close();
  console.log('Process Temperature visual verification completed successfully!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

