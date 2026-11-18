import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\9b613be0-deb9-40da-99bb-3a2f4c2c0dae';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
  await page.type('input#email', 'superadmin@plexierp.com');
  await page.type('input#password', 'superadmin123');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
  ]);

  await new Promise(r => setTimeout(r, 1000));
  await page.goto('http://localhost:3000/dashboard/production/tape-plant?tab=raw-material', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading Raw Material Movement Log'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Print button via selector...');
  await page.click('button[title="Print / View Raw Material Report"]');
  await new Promise(r => setTimeout(r, 2000));

  const printModalPath = path.join(ARTIFACT_DIR, 'tape_plant_raw_material_print_preview_verified.png');
  await page.screenshot({ path: printModalPath, fullPage: false });
  console.log('Print modal saved to:', printModalPath);

  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

