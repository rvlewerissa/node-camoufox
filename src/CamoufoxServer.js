import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function stripAnsi(str) {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
}

function createDebugLogger(enabled = false) {
  return (msg) => {
    if (enabled) {
      console.log(`[${new Date().toISOString()}] ${msg}`);
    }
  };
}

/**
 * @typedef {Object} ProxyConfig
 * @property {string} server - The proxy server URL (e.g., 'http://proxy.example.com:8080')
 * @property {string} username - Proxy username, can include 'XXXXXXXX' for random generation
 * @property {string} password - Proxy password
 */

/**
 * @typedef {Object} ViewportConfig
 * @property {number} width - Viewport width in pixels
 * @property {number} height - Viewport height in pixels
 */

/**
 * @typedef {Object} ServerOptions
 * @property {boolean} [headless=true] - Run browser in headless mode
 * @property {boolean} [geoip=true] - Enable GeoIP support
 * @property {ProxyConfig} [proxy=null] - Proxy configuration
 * @property {boolean} [humanize=true] - Enable browser humanization
 * @property {boolean} [showcursor=true] - Show cursor in browser
 * @property {boolean} [blockImages=false] - Block image loading
 * @property {boolean} [mainWorldEval=true] - Allow main world evaluation
 * @property {boolean} [debug=false] - Enable debug mode
 * @property {number} [startTimeout=30000] - Server start timeout in milliseconds
 */

/**
 * CamoufoxServer manages a Python-based browser automation server
 * @extends EventEmitter
 */
export class CamoufoxServer extends EventEmitter {
  #process = null;
  #wsEndpoint = null;
  #startTimeout = 30000; // 30 seconds
  #options = {};
  #browser = null; // Add browser tracking
  #debug = null;

  /**
   * Creates a new CamoufoxServer instance
   * @param {ServerOptions} [options={}] - Server configuration options
   */
  constructor(options = {}) {
    super();
    this.#startTimeout = options.startTimeout || 30000;
    this.#options = {
      headless: options.headless ?? true,
      geoip: options.geoip ?? true,
      proxy: options.proxy ?? null,
      humanize: options.humanize ?? true,
      showcursor: options.showcursor ?? true,
      blockImages: options.blockImages ?? false,
      mainWorldEval: options.mainWorldEval ?? true,
      debug: options.debug ?? false,
    };
    this.#debug = createDebugLogger(options.debug ?? false);
  }

  /**
   * Get the WebSocket endpoint URL of the running server
   * @returns {string|null} WebSocket endpoint URL or null if server not running
   */
  get wsEndpoint() {
    return this.#wsEndpoint;
  }

  /**
   * Sets the browser instance for cleanup
   * @param {import('playwright').Browser} browser - Playwright browser instance
   */
  setBrowser(browser) {
    this.#browser = browser;
  }

  /**
   * Starts the automation server
   * @returns {Promise<string>} Resolves with WebSocket endpoint URL
   * @throws {Error} If server is already running or fails to start
   */
  async start() {
    if (this.#process) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      const serverPath = join(__dirname, 'server.py');
      // Properly escape and quote the JSON string
      const configArg = JSON.stringify(this.#options).replace(/"/g, '\\"');
      let timeoutId;

      try {
        this.#process = spawn(
          'python3',
          ['-X', 'utf8', serverPath, '--config', `"${configArg}"`],
          {
            cwd: __dirname,
            env: process.env,
            shell: process.platform === 'win32',
            stdio: ['pipe', 'pipe', 'pipe'],
          }
        );

        // Set a timeout in case the server never prints the endpoint
        timeoutId = setTimeout(() => {
          if (!this.#wsEndpoint) {
            this.#cleanup();
            reject(
              new Error(`Server start timeout after ${this.#startTimeout}ms`)
            );
          }
        }, this.#startTimeout);

        // Handle normal server output
        this.#process.stdout.on('data', (data) => {
          const text = stripAnsi(data.toString());
          this.#debug(`Server: ${text.trim()}`);

          // regex that looks for the endpoint anywhere in the text
          const matches = text.match(/ws:\/\/[^:\s]*:[0-9]+\/[a-zA-Z0-9]+/);

          if (matches) {
            const endpoint = matches[0];
            this.#debug(`Connected to endpoint: ${endpoint}`);
            clearTimeout(timeoutId);
            this.#wsEndpoint = endpoint;
            this.emit('ready', this.#wsEndpoint);
            resolve(this.#wsEndpoint);
          }
        });

        // Handle error output
        this.#process.stderr.on('data', (data) => {
          this.#debug(`Error: ${data.toString().trim()}`);
        });

        // Child process spawn error
        this.#process.on('error', (error) => {
          clearTimeout(timeoutId);
          this.#cleanup();
          reject(new Error(`Failed to start server: ${error.message}`));
        });

        // If process exits before giving us an endpoint
        this.#process.on('exit', (code, signal) => {
          clearTimeout(timeoutId);
          if (!this.#wsEndpoint) {
            reject(
              new Error(`Server exited with code ${code} signal ${signal}`)
            );
          }
          this.#cleanup();
          this.emit('exit', { code, signal });
        });
      } catch (error) {
        clearTimeout(timeoutId);
        this.#cleanup();
        reject(new Error(`Failed to spawn server: ${error.message}`));
      }
    });
  }

  /**
   * Stops the automation server and closes the browser
   * @returns {Promise<number>} Resolves with exit code
   */
  async stop() {
    try {
      // First close the browser if it exists
      if (this.#browser) {
        this.#debug('Closing browser...');
        await this.#browser
          .close()
          .catch((e) => this.#debug(`Browser close error: ${e.message}`));
        this.#browser = null;
      }

      // Then terminate the server process
      if (this.#process) {
        this.#debug('Stopping server process...');
        // On Windows, use taskkill to ensure process tree is terminated
        if (process.platform === 'win32') {
          await new Promise((resolve) => {
            const taskkill = spawn('taskkill', [
              '/pid',
              this.#process.pid,
              '/T',
              '/F',
            ]);
            taskkill.on('exit', resolve);
          });
        } else {
          this.#process.kill('SIGKILL');
          await new Promise((resolve) => this.#process.once('exit', resolve));
        }
      }

      this.#cleanup();
      return 0;
    } catch (error) {
      this.#debug(`Stop error: ${error.message}`);
      this.#cleanup();
      return 1;
    }
  }

  /**
   * Cleans up server resources
   * @private
   */
  #cleanup() {
    this.#process = null;
    this.#wsEndpoint = null;
    this.#browser = null;
  }

  /**
   * Restarts the automation server
   * @returns {Promise<string>} Resolves with new WebSocket endpoint URL
   */
  async restart() {
    await this.stop();
    return this.start();
  }
}

export default CamoufoxServer;
