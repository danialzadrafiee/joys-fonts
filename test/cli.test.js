import fs from 'fs';
import path from 'path';
import { installFont } from '../src/index.js';

const TEST_DIR = path.resolve('test-temp');

function setupTestDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function cleanTestDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function testTailwindV4() {
  console.log('🧪 Testing Tailwind CSS v4 integration...');
  const projectDir = path.join(TEST_DIR, 'v4-project');
  setupTestDir(projectDir);

  const srcDir = path.join(projectDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const cssPath = path.join(srcDir, 'app.css');
  const initialCss = `@import "tailwindcss";\n\n@theme {\n  --font-sans: "Inter", sans-serif;\n}\n`;
  fs.writeFileSync(cssPath, initialCss, 'utf8');

  const destPath = path.join(srcDir, 'fonts', 'joys-iran-sans-x');

  // Install
  await installFont({
    slug: 'joys-iran-sans-x',
    destPath,
    cssPath,
    tailwindVersion: 4
  });

  // Verify font files copied
  const woff2Dir = path.join(destPath, 'woff2');
  if (!fs.existsSync(woff2Dir) || !fs.readdirSync(woff2Dir).length) {
    throw new Error('WOFF2 files were not copied to target directory.');
  }

  // Verify CSS updated
  const updatedCss = fs.readFileSync(cssPath, 'utf8');
  if (!updatedCss.includes('@import "./fonts/joys-iran-sans-x/joys-iran-sans-x.css";')) {
    throw new Error('CSS @import was not injected.');
  }
  if (!updatedCss.includes('--font-iran-sans-x: "JoysIranSansX", sans-serif;')) {
    throw new Error('Tailwind v4 theme variables were not injected.');
  }

  console.log('✅ Tailwind CSS v4 test passed.');
  cleanTestDir(projectDir);
}

async function testTailwindV3() {
  console.log('🧪 Testing Tailwind CSS v3 integration...');
  const projectDir = path.join(TEST_DIR, 'v3-project');
  setupTestDir(projectDir);

  const srcDir = path.join(projectDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const cssPath = path.join(srcDir, 'index.css');
  const initialCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
  fs.writeFileSync(cssPath, initialCss, 'utf8');

  const configPath = path.join(projectDir, 'tailwind.config.js');
  const initialConfig = `module.exports = {\n  content: ["./src/**/*.{html,js}"],\n  theme: {\n    extend: {}\n  },\n  plugins: []\n};\n`;
  fs.writeFileSync(configPath, initialConfig, 'utf8');

  // Temporarily change directory to simulate project context for finding tailwind.config.js
  const originalCwd = process.cwd();
  process.chdir(projectDir);

  const destPath = path.join(srcDir, 'fonts', 'joys-iran-sans-x');

  try {
    // Install
    await installFont({
      slug: 'joys-iran-sans-x',
      destPath,
      cssPath,
      tailwindVersion: 3
    });

    // Verify font files copied
    const woff2Dir = path.join(destPath, 'woff2');
    if (!fs.existsSync(woff2Dir) || !fs.readdirSync(woff2Dir).length) {
      throw new Error('WOFF2 files were not copied to target directory.');
    }

    // Verify CSS updated
    const updatedCss = fs.readFileSync(cssPath, 'utf8');
    if (!updatedCss.includes('@import "./fonts/joys-iran-sans-x/joys-iran-sans-x.css";')) {
      throw new Error('CSS @import was not injected in v3 stylesheet.');
    }

    // Verify Config updated
    const updatedConfig = fs.readFileSync(configPath, 'utf8');
    if (!updatedConfig.includes("'iran-sans-x': ['JoysIranSansX', 'sans-serif'],")) {
      throw new Error('Tailwind v3 config was not extended.');
    }

    console.log('✅ Tailwind CSS v3 test passed.');
  } finally {
    process.chdir(originalCwd);
    cleanTestDir(projectDir);
  }
}

async function runTests() {
  console.log('🚀 Running Joys Fonts integration tests...\n');
  try {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    await testTailwindV4();
    await testTailwindV3();
    console.log('\n🎉 All tests passed successfully!');
    cleanTestDir(TEST_DIR);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Test suite failed: ${err.message}`);
    if (err.stack) console.error(err.stack);
    cleanTestDir(TEST_DIR);
    process.exit(1);
  }
}

runTests();
