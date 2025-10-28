#!/usr/bin/env node

const fs = require('fs');

const directory = 'node_modules/.pnpm';
let count = 0;

if (fs.existsSync(directory)) {
  const files = fs.readdirSync(directory);
  for (const file of files) {

    if (file.includes('win32')) {
      count++;
    }
  }
}

process.stdout.write(count > 0 ? "1" : "");
