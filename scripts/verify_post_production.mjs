import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9b613be0-deb9-40da-99bb-3a2f4c2c0dae';

async function runVerification() {
  console.log('Launching browser for Post Production verification...');
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

  // Seed sample planned recipes if none exist
  console.log('Ensuring recipe plan exists for 2026-11-12...');
  await page.evaluate(async () => {
    try {
      await fetch('/api/production/tape-plant/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2026-11-12',
          shiftId: 'ALL',
          status: 'SAVED',
          plans: [
            {
              recipeQuality: 'HDPE White Tape 850D',
              tapeType: 'HDPE',
              denier: 850,
              tapeWidth: 2.5,
              strength: 4.8,
              eloPercent: 22,
              bobbinMarking: 'BLUE-RING',
              colour: 'Milky White',
              spacerSize: '12mm',
              plannedQtyKg: 1200,
              isDayNight: true
            },
            {
              recipeQuality: 'PP Natural Fabric Tape 1000D',
              tapeType: 'PP',
              denier: 1000,
              tapeWidth: 3.0,
              strength: 5.2,
              eloPercent: 20,
              bobbinMarking: 'GREEN-DOT',
              colour: 'Natural',
              spacerSize: '14mm',
              plannedQtyKg: 1800,
              isDayNight: false
            }
          ]
        })
      });
    } catch (e) {
      console.error(e);
    }
  });

  // 2. Navigate to Post Production tab
  console.log('Navigating to Post Production section...');
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=post-production', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading Post-Production Data'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Click Sync Planning if empty
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text && (text.includes('Refresh from Planning') || text.includes('Sync Planning'))) {
      await b.click();
      await new Promise(r => setTimeout(r, 2000));
      break;
    }
  }

  // 3. Desktop Screenshot (1440x900)
  console.log('Capturing Desktop View (1440x900)...');
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 1500));
  const desktopPath = path.join(ARTIFACT_DIR, 'tape_plant_post_production_desktop_view_verified.png');
  await page.screenshot({ path: desktopPath, fullPage: false });
  console.log('Desktop view saved to:', desktopPath);

  // 4. Desktop Print Preview Modal
  console.log('Opening Print Preview Modal...');
  const printBtn = await page.$('button[title="Print Post-Production Entry Sheet"]');
  if (printBtn) {
    await printBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    const printModalPath = path.join(ARTIFACT_DIR, 'tape_plant_post_production_print_preview_verified.png');
    await page.screenshot({ path: printModalPath, fullPage: false });
    console.log('Print modal saved to:', printModalPath);

    // Close modal
    const closeBtn = await page.$('button svg.lucide-x');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 5. Mobile View (390x844 - iPhone / Smartphone)
  console.log('Capturing Mobile View (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading Post-Production Data'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  const mobileCollapsedPath = path.join(ARTIFACT_DIR, 'tape_plant_post_production_mobile_app_view_verified.png');
  await page.screenshot({ path: mobileCollapsedPath, fullPage: false });
  console.log('Mobile collapsed view saved to:', mobileCollapsedPath);

  // 6. Expand card #1 on mobile
  console.log('Expanding card #1 on mobile...');
  const cardHeaders = await page.$$('div[id^="recipe-run-card-"] > div:first-child');
  if (cardHeaders.length > 0) {
    await cardHeaders[0].click();
    await new Promise(r => setTimeout(r, 1000));
  }

  const mobileExpandedPath = path.join(ARTIFACT_DIR, 'tape_plant_post_production_mobile_expanded_verified.png');
  await page.screenshot({ path: mobileExpandedPath, fullPage: false });
  console.log('Mobile expanded view saved to:', mobileExpandedPath);

  // 7. Full page mobile screenshot
  const mobileFullPagePath = path.join(ARTIFACT_DIR, 'tape_plant_post_production_mobile_full_verified.png');
  await page.screenshot({ path: mobileFullPagePath, fullPage: true });
  console.log('Mobile full page saved to:', mobileFullPagePath);

  await browser.close();
  console.log('Post Production visual verification completed successfully!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
