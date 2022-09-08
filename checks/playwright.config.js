require('dotenv-flow').config({ silent: true });

module.exports = {
  timeout: 10000,
  globalTimeout: 600000,
  retries: 2,
  use: {
    headless: true,
    browserName: 'chromium',
    viewport: { width: 1000, height: 900 },
    testDir: './tests',
  },
};
