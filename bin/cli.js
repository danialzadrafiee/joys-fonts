#!/usr/bin/env node
/**
 * Joys Fonts Installer CLI
 * Usage: 
 *   npx joys-fonts [command] [options]
 *   node bin/cli.js [command] [options]
 * 
 * Commands:
 *   add <font-slug>  Install a font into your project
 *   list, ls         List all available fonts
 *   help, -h, --help Show help screen
 * 
 * Options:
 *   -d, --dest <path>  Install destination directory
 *   -c, --css <path>   Global CSS file path to update
 *   -y, --yes          Auto-confirm with default options
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { manifest, installFont, detectTailwindVersion } from '../src/index.js';

// Parse command line arguments
function parseArgs(args) {
  const options = {
    command: null,
    slug: null,
    dest: null,
    css: null,
    yes: false,
    help: false
  };

  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dest' || arg === '-d') {
      options.dest = args[++i];
    } else if (arg === '--css' || arg === '-c') {
      options.css = args[++i];
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--help' || arg === '-h' || arg === 'help') {
      options.help = true;
    } else {
      positionals.push(arg);
    }
  }

  if (options.help) {
    options.command = 'help';
  } else if (positionals[0] === 'list' || positionals[0] === 'ls') {
    options.command = 'list';
  } else if (positionals[0] === 'add') {
    options.command = 'add';
    options.slug = positionals[1] || null;
  } else if (positionals[0]) {
    options.command = 'add';
    options.slug = positionals[0];
  }

  return options;
}

function printHelp() {
  console.log(`
\x1b[35m=======================================\x1b[0m
\x1b[36m\x1b[1m       Joys Fonts Installer CLI\x1b[0m
\x1b[35m=======================================\x1b[0m

Usage:
  npx joys-fonts [command] [options]

Commands:
  \x1b[32madd <font-slug>\x1b[0m  Install a specific font
  \x1b[32mlist, ls\x1b[0m         List all available fonts
  \x1b[32mhelp, -h, --help\x1b[0m Show this help screen

Options:
  \x1b[33m-d, --dest <path>\x1b[0m  Install destination directory
  \x1b[33m-c, --css <path>\x1b[0m   Global CSS file path to update
  \x1b[33m-y, --yes\x1b[0m          Auto-confirm with default options

Examples:
  npx joys-fonts add joys-iran-sans-x
  pnpm dlx joys-fonts list
  yarn dlx joys-fonts add joys-kalameh --yes
`);
}

function printList() {
  console.log('\n\x1b[36mAvailable fonts in Joys Fonts:\x1b[0m');
  console.log('\x1b[90m---------------------------------------\x1b[0m');
  manifest.forEach((f, idx) => {
    const families = f.families.map(fa => fa.family).join(', ');
    console.log(`  ${idx + 1}. \x1b[32m\x1b[1m${f.slug}\x1b[0m`);
    console.log(`     Families: \x1b[37m${families}\x1b[0m`);
    console.log(`     CSS Path: \x1b[90m${f.css}\x1b[0m`);
    console.log('\x1b[90m---------------------------------------\x1b[0m');
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'help') {
    printHelp();
    process.exit(0);
  }

  if (options.command === 'list') {
    printList();
    process.exit(0);
  }

  let slug = options.slug;
  const rl = readline.createInterface({ input, output });

  // If no slug is specified, prompt interactively
  if (!slug) {
    console.log('\n\x1b[35m=======================================\x1b[0m');
    console.log('\x1b[36m\x1b[1m       Joys Fonts Installer CLI\x1b[0m');
    console.log('\x1b[35m=======================================\x1b[0m\n');
    console.log('Available fonts:');
    manifest.forEach((f, idx) => {
      console.log(`  [${idx + 1}] \x1b[32m${f.slug}\x1b[0m (${f.families.map(fa => fa.family).join(', ')})`);
    });
    
    const choice = await rl.question('\nSelect a font number or type slug (e.g. joys-kalameh): ');
    const idxChoice = parseInt(choice, 10);
    let selected = null;
    
    if (!isNaN(idxChoice) && idxChoice >= 1 && idxChoice <= manifest.length) {
      selected = manifest[idxChoice - 1];
    } else {
      const cleanChoice = choice.trim();
      selected = manifest.find(f => f.slug === cleanChoice || f.slug === `joys-${cleanChoice}`);
    }

    if (!selected) {
      console.error('\x1b[31m❌ Invalid selection.\x1b[0m');
      rl.close();
      process.exit(1);
    }
    slug = selected.slug;
  }

  const fontEntry = manifest.find(f => f.slug === slug);
  if (!fontEntry) {
    console.error(`\x1b[31m❌ Font slug "${slug}" not found in manifest.\x1b[0m`);
    console.log(`Run \x1b[32mnpx joys-fonts list\x1b[0m to see all available fonts.`);
    rl.close();
    process.exit(1);
  }

  console.log(`\nSelected font: \x1b[36m${fontEntry.slug}\x1b[0m`);

  // Determine default destination
  let defaultDest = `./fonts/${slug}`;
  if (fs.existsSync('src') && fs.statSync('src').isDirectory()) {
    defaultDest = `./src/fonts/${slug}`;
  } else if (fs.existsSync('app') && fs.statSync('app').isDirectory()) {
    defaultDest = `./app/fonts/${slug}`;
  }

  let chosenDest = '';
  if (options.dest) {
    chosenDest = options.dest;
  } else if (options.yes) {
    chosenDest = defaultDest;
  } else {
    const destPathInput = await rl.question(`Install destination [\x1b[32m${defaultDest}\x1b[0m]: `);
    chosenDest = destPathInput.trim() || defaultDest;
  }
  const destPath = path.resolve(chosenDest);

  // Detect main CSS file
  const commonCssPaths = [
    'src/index.css',
    'src/app.css',
    'src/global.css',
    'src/main.css',
    'app/globals.css',
    'app/global.css',
    'index.css',
    'global.css'
  ];
  let defaultCss = '';
  for (const p of commonCssPaths) {
    if (fs.existsSync(p)) {
      defaultCss = p;
      break;
    }
  }

  let chosenCss = '';
  if (options.css) {
    chosenCss = options.css;
  } else if (options.yes) {
    chosenCss = defaultCss;
  } else {
    const cssPathInput = await rl.question(`Tailwind/Global CSS file path to update${defaultCss ? ` [\x1b[32m${defaultCss}\x1b[0m]` : ''} (press Enter to skip): `);
    chosenCss = cssPathInput.trim() || defaultCss;
  }

  let mainCssPath = null;
  if (chosenCss) {
    const resolvedCss = path.resolve(chosenCss);
    if (fs.existsSync(resolvedCss)) {
      mainCssPath = resolvedCss;
    } else {
      console.log(`\x1b[33m⚠️  Warning: File "${chosenCss}" does not exist. CSS/Tailwind configuration will be skipped.\x1b[0m`);
    }
  }

  rl.close();

  console.log('\nInstalling font files...');
  try {
    const tailwindVersion = detectTailwindVersion();
    
    await installFont({
      slug,
      destPath,
      cssPath: mainCssPath || undefined,
      tailwindVersion
    });

    console.log(`\x1b[32m✅ Copied font files to: ${chosenDest}\x1b[0m`);
    
    if (mainCssPath) {
      console.log(`\x1b[32m✅ Successfully updated CSS configuration in ${path.relative(process.cwd(), mainCssPath)}\x1b[0m`);
      if (tailwindVersion === 3) {
        console.log(`\x1b[32m✅ Successfully extended fontFamily in tailwind.config file\x1b[0m`);
      }
    }
    
    console.log(`\n\x1b[32m\x1b[1m🎉 Font ${slug} successfully installed! You can now use it in your project.\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m❌ Installation failed: ${err.message}\x1b[0m`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\x1b[31m❌ Unexpected error: ${err.message}\x1b[0m`);
  process.exit(1);
});
