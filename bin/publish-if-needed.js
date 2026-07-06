#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const name = pkg.name;
const version = pkg.version;

console.log(`🔍 Checking if version ${version} of ${name} is already published...`);

let versionExists = false;
try {
  const stdout = execSync(`npm view ${name}@${version} version --json`, {
    stdio: ['pipe', 'pipe', 'ignore'],
    timeout: 5000
  }).toString().trim();

  if (stdout) {
    const parsed = JSON.parse(stdout);
    if (parsed === version || (Array.isArray(parsed) && parsed.includes(version))) {
      versionExists = true;
    }
  }
} catch (err) {
  versionExists = false;
}

if (versionExists) {
  console.log(`⚠️  Version ${version} is already published on NPM. Skipping publish.`);
  process.exit(0);
}

console.log(`ℹ️  Version ${version} is not published yet. Publishing to NPM...`);
try {
  execSync('pnpm publish --no-git-checks', { stdio: 'inherit' });
  console.log(`✅ Successfully published ${name}@${version} to NPM!`);
} catch (err) {
  console.error(`❌ Failed to publish: ${err.message}`);
  process.exit(1);
}
