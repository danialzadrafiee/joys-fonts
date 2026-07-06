#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Failed to run command: ${cmd}`);
    process.exit(1);
  }
}

function getOutput(cmd) {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch (err) {
    return '';
  }
}

// 1. Run build
console.log('🏗️  Building project...');
run('npm run build');

// 2. Check if git is dirty (meaning manifest, llm.txt, README.md, or other files changed)
const isDirty = getOutput('git status --porcelain') !== '';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const name = pkg.name;
let version = pkg.version;

if (isDirty) {
  console.log('🔄 Changes detected. Bumping version...');
  
  // Bump patch version (e.g. 0.1.0 -> 0.1.1)
  run('npm version patch --no-git-tag-version');
  
  // Read the updated version
  const updatedPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  version = updatedPkg.version;
  console.log(`📈 Version bumped to ${version}`);

  // Stage changes
  console.log('📦 Staging changes...');
  run('git add .');

  // Commit
  console.log('💾 Committing changes...');
  run(`git commit -m "chore: bump version to ${version} and update assets"`);

  // Push
  console.log('🚀 Pushing to GitHub...');
  run('git push');
} else {
  console.log('✨ No changes detected in the workspace.');
}

// 3. Check NPM registry and publish if needed
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
  run('pnpm publish --no-git-checks');
  console.log(`✅ Successfully published ${name}@${version} to NPM!`);
} catch (err) {
  console.error(`❌ Failed to publish: ${err.message}`);
  process.exit(1);
}
