import { firefox } from 'playwright';
import { fileURLToPath } from 'url';
import { CamoufoxServer } from './src/CamoufoxServer.js';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const debug = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function runExample() {
  const server = new CamoufoxServer({
    headless: false,
    humanize: true,
    debug: false,
  });

  try {
    debug('Starting server...');
    const wsEndpoint = await server.start();

    debug('Connecting to browser...');
    const browser = await firefox.connect(wsEndpoint);

    server.setBrowser(browser);

    const page = await browser.newPage();

    await page.goto('https://onlyfans.com/testingusernameonlyfans');
    debug('Page loaded');

    const displayName = await page
      .locator('.g-user-name')
      .first()
      .textContent();
    debug(`Display Name: ${displayName}`);

    const result = {
      title: await page.title(),
      displayName: displayName,
      url: page.url(),
    };

    console.log('Results:', result);

    const csvDir = path.join(__dirname, 'csv');
    console.log('__dirname:', __dirname);
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir);
    }

    const csvFilePath = path.join(csvDir, 'result.csv');
    const csvContent = `Title,DisplayName,URL\n"${result.title}","${result.displayName}","${result.url}"\n`;

    fs.writeFileSync(csvFilePath, csvContent);
    debug(`Results saved to ${csvFilePath}`);

    return result;
  } catch (error) {
    debug(`Error: ${error.message}`);
    throw error;
  } finally {
    debug('Stopping server and browser...');
    await server.stop();
    debug('Cleanup completed');
  }
}

runExample().catch(console.error);
