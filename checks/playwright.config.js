require('dotenv-flow').config();

module.exports = {
  use: {
    headless: true,
    viewport: { width: 1000, height: 900 },
    testDir: './tests',
  },
};
