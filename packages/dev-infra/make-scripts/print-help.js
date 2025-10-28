#!/usr/bin/env node
const fs = require('fs');

const makefilePath = process.argv[2];

console.log("Helper Commands:\n");

fs.readFileSync(makefilePath, 'utf8').split(/\r?\n/)
  .filter(line => {
    const matches = /^[a-zA-Z0-9_-]+:.*?## /.test(line);
    return matches;
  })
  .map(line => line.match(/^([a-zA-Z0-9_-]+):.*?## (.*)$/))
  .filter(Boolean)
  .sort((a, b) => a[1].localeCompare(b[1]))
  .forEach(([, cmd, desc]) =>
    console.log(`    \x1b[01;32m${cmd.padEnd(20)}\x1b[0m ${desc}`)
  );

console.log("\nNOTE: dependencies between commands are not automatic. Eg, you must run 'deps' and 'build' first, and after any changes");
