const puppeteer = require('whatsapp-web.js/node_modules/puppeteer-core');
const fs = require('fs');

async function test() {
    console.log('Testing puppeteer launch...');
    const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    let execPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            execPath = p;
            break;
        }
    }

    console.log('Using path:', execPath);
    try {
        const browser = await puppeteer.launch({
            executablePath: execPath,
            headless: true,
            args: ['--no-sandbox']
        });
        console.log('Browser launched successfully!');
        const page = await browser.newPage();
        await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2' });
        console.log('Page loaded successfully!');
        await browser.close();
        console.log('Browser closed.');
    } catch (err) {
        console.error('Launch failed:', err);
    }
}
test();
