import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    await page.goto('https://nexgenautotransport-crm.vercel.app', { waitUntil: 'networkidle0' });
    console.log('Page loaded completely');
  } catch (err) {
    console.error('Error navigating:', err);
  }

  await browser.close();
})();
