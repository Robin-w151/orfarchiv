import { defineConfig } from 'checkly';

const config = defineConfig({
  projectName: 'ORF Archiv Checks',
  logicalId: 'orfarchiv',
  checks: {
    frequency: 1440,
    locations: ['eu-central-1', 'eu-west-3'],
    tags: ['mac'],
    runtimeId: '2023.02',
    checkMatch: '**/tests/**/*.check.ts',
    browserChecks: {
      testMatch: '**/tests/**/*.spec.{js,ts}',
    },
  },
  cli: {
    runLocation: 'eu-central-1',
    reporters: ['list'],
  },
});

export default config;
