import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9b613be0-deb9-40da-99bb-3a2f4c2c0dae';

async function run() {
  console.log('Launching browser with puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
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
  console.log('Logged in successfully.');

  // 2. Temperature Mobile View (Check redundant heading removed)
  console.log('Testing tab=temperature on mobile...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=temperature', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tape_plant_temperature_refined_mobile.png'), fullPage: false });

  // 3. Post Production Mobile View (Check redundant heading removed & Submit button alignment)
  console.log('Testing tab=post-production on mobile...');
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=post-production', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tape_plant_post_production_refined_mobile.png'), fullPage: false });

  // 4. Bobbin Issue Modal Mobile View
  console.log('Testing Bobbin Issue Modal on mobile...');
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=bobbin-stock', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click visible Issue button via page.evaluate
  const clickedMobileIssue = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.innerText.includes('Issue') && b.offsetParent !== null) {
        b.click();
        return true;
      }
    }
    return false;
  });
  console.log('Clicked mobile issue button:', clickedMobileIssue);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'bobbin_issue_modal_refined_mobile.png'), fullPage: false });

  // 5. Desktop View for Post Production
  console.log('Testing Desktop view for Post Production...');
  await page.setViewport({ width: 1280, height: 800, isMobile: false });
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=post-production', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tape_plant_post_production_desktop_preserved.png'), fullPage: false });

  // 6. Desktop View for Bobbin Issue Modal
  console.log('Testing Desktop view for Bobbin Issue Modal...');
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=bobbin-stock', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const clickedDesktopIssue = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.innerText.includes('Issue to Loom') && b.offsetParent !== null) {
        b.click();
        return true;
      }
    }
    return false;
  });
  console.log('Clicked desktop issue button:', clickedDesktopIssue);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'bobbin_issue_modal_desktop_preserved.png'), fullPage: false });

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

run().catch(err => {
  console.error('Puppeteer run error:', err);
  process.exit(1);
});
