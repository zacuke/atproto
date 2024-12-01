/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Sync',
  transform: { '^.+\\.ts$': '@swc/jest' },
  testTimeout: 120000,
  setupFiles: ['<rootDir>/../../jest.setup.ts'],
}
