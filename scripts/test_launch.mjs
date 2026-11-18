import puppeteer from 'puppeteer-core';

async function testLaunch() {
  console.log('Testing chrome launch...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });
  console.log('Browser launched successfully!');
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
  console.log('Title:', await page.title());
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  console.log('Test complete.');
}

testLaunch().catch(err => {
  console.error('Launch failed:', err);
  process.exit(1);
});
