#!/usr/bin/env node
const { execSync } = require('child_process');

// When jest releases breaking changes (or you just want to)
// Set to true and run make test repeatedly to get new snapshots
const updateSnapshot = true;

for (let i = 1; i <= 8; i++) {
  const cmd = `pnpm test:withFlags ` +
    `${updateSnapshot ? '--updateSnapshot' : ''} ` +
    `--passWithNoTests ` +
    `--maxWorkers=4 ` +
    `--detectOpenHandles ` +
    `--shard ${i}/8 `;

  execSync(cmd, { stdio: 'inherit' });
}
