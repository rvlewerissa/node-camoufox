# node-camoufox

A proof-of-concept implementation showing how to use the [Camoufox](https://camoufox.com/) automation framework with Node.js. This repository serves as an example of integrating Camoufox's Python-based automation capabilities into Node.js applications.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Powered by Camoufox](https://img.shields.io/badge/Powered%20by-Camoufox-orange)](https://camoufox.com/)

## Important Notes

- This is **not** an NPM package - it's an example implementation
- For the latest features and options, always refer to the [official Camoufox documentation](https://camoufox.com/)
- This implementation can be freely used as a starting point for your own projects

## Prerequisites

1. Python 3.8 or higher
2. Node.js 16.0 or higher
3. Camoufox Python package with GeoIP support (recommended):

```bash
pip install -U camoufox[geoip]
```

4. Camoufox browser:

```bash
camoufox fetch
```

## Quick Start

```bash
# Clone this example
git clone https://github.com/DemonMartin/node-camoufox.git
cd node-camoufox

# Install Playwright
npm install
```

## Basic Usage

```javascript
import { firefox } from 'playwright';
import { CamoufoxServer } from './src/CamoufoxServer.js';

async function example() {
    const server = new CamoufoxServer({
        headless: false,
        humanize: true,
        debug: true
    });

    try {
        const wsEndpoint = await server.start();
        const browser = await firefox.connect(wsEndpoint);
        server.setBrowser(browser);

        const page = await browser.newPage();
        await page.goto('https://example.com');
        
        // Your automation code here...
        
    } finally {
        await server.stop();
    }
}
```

## Basic Configuration

```javascript
const server = new CamoufoxServer({
    headless: true,    // Run in headless mode
    humanize: true,    // Enable humanization
    debug: false,      // Debug logging
    proxy: {          // Optional proxy
        server: 'http://proxy.example.com:8080',
        username: 'user',
        password: 'pass'
    }
});
```

## Extended Configuration

For additional configuration options and features, please check:

- [Camoufox Documentation](https://camoufox.com/)
- [Camoufox Python Interface](https://camoufox.com/usage/)
- [Advanced Configuration](https://camoufox.com/config/)

This implementation doesnt support all Camoufox options - you can extend the configuration based on the official documentation by yourself.
You need to update and edit `CamoufoxServer.js` and `server.py` yourself.

## Debugging

Enable debug logging to see detailed operation information:

```javascript
const server = new CamoufoxServer({
    debug: true,
    // other options...
});
```

Debug messages follow this format:

```text
[2025-01-28T20:29:17.445Z] Starting server...
[2025-01-28T20:29:21.078Z] Connecting to browser...
[2025-01-28T20:29:24.049Z] Page loaded
```

## Contributing

Feel free to:

- Fork and modify for your needs
- Open issues for bugs
- Suggest improvements
- Share your use cases
- Open pull requests

## License

[MIT](https://choosealicense.com/licenses/mit/) - Feel free to use and modify

## Credits

- [Camoufox](https://camoufox.com/) - The core automation framework
- [daijro](https://github.com/daijro) - Creator of Camoufox
- [DemonMartin](https://github.com/DemonMartin) - This Node.js implementation

## Disclaimer

This is a community example showing how to use Camoufox with Node.js. It is not an official package or module. For production use, ensure you understand the Camoufox framework and adapt this implementation to your needs.
