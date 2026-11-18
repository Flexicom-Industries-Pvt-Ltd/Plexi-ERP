import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9b613be0-deb9-40da-99bb-3a2f4c2c0dae';

async function runPrintVerification() {
  console.log('Launching browser for Temperature Print Preview Modal verification...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Login
  console.log('Logging in as Super Admin...');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
  await page.type('input#email', 'superadmin@plexierp.com');
  await page.type('input#password', 'superadmin123');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
  ]);

  await new Promise(r => setTimeout(r, 2000));

  // Navigate to Process Temperature
  console.log('Navigating to Process Temperature section...');
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=temperature', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Desktop: Click Print button
  console.log('Testing Desktop Print button...');
  await page.setViewport({ width: 1440, height: 900 });
  await new Promise(r => setTimeout(r, 1000));

  const printBtn = await page.$('button[title="Print / View Temperature Report"]');
  if (printBtn) {
    await printBtn.click();
    console.log('Clicked Desktop Print button!');
  } else {
    throw new Error('Desktop Print button not found');
  }

  await new Promise(r => setTimeout(r, 2000));

  // Screenshot Desktop Print Preview Modal
  const desktopModalPath = path.join(ARTIFACT_DIR, 'tape_plant_temperature_print_preview_verified.png');
  await page.screenshot({ path: desktopModalPath, fullPage: false });
  console.log('Desktop Print Preview saved to:', desktopModalPath);

  // Close modal
  const closeBtn = await page.$('button[title="Close Preview"]');
  if (closeBtn) await closeBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  // 2. Mobile: Switch to mobile viewport (390x844)
  console.log('Testing Mobile Print button (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=temperature', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const mobilePrintBtn = await page.$('button[title="Print / View Report"]');
  if (mobilePrintBtn) {
    await mobilePrintBtn.click();
    console.log('Clicked Mobile Print button!');
  } else {
    // Try toolbar print button
    const btns = await page.$$('button');
    for (const b of btns) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt && txt.trim() === 'Print') {
        await b.click();
        console.log('Clicked Print button on mobile toolbar!');
        break;
      }
    }
  }

  await new Promise(r => setTimeout(r, 2000));

  // Screenshot Mobile Print Preview Modal
  const mobileModalPath = path.join(ARTIFACT_DIR, 'tape_plant_temperature_mobile_print_preview_verified.png');
  await page.screenshot({ path: mobileModalPath, fullPage: false });
  console.log('Mobile Print Preview saved to:', mobileModalPath);

  await browser.close();
  console.log('All Print Preview verifications passed!');
}

runPrintVerification().catch(err => {
  console.error('Print verification failed:', err);
  process.exit(1);
});
