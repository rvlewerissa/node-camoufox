import { firefox } from 'playwright';
import { CamoufoxServer } from './src/CamoufoxServer.js';

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

        // Register browser with server for proper cleanup
        server.setBrowser(browser);

        const page = await browser.newPage();

        // Navigate to a simple test page
        await page.goto('https://example.com');
        debug('Page loaded');

        // Find and hover over a link
        const link = page.getByRole('link');
        await link.hover();
        debug('Hovered over link');

        // Get some page info
        const result = {
            title: await page.title(),
            linkText: await link.textContent(),
            url: page.url(),
        };

        console.log('Results:', result);
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

// Run example
runExample().catch(console.error);
