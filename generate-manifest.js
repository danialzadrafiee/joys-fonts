#!/usr/bin/env node
/**
 * run: node generate-manifest.js
 */

import fs from 'fs';
import path from 'path';

const FONTS_DIR = 'fonts';
const OUTPUT_FILE = 'fonts.manifest.json';

const FONT_FACE_RE = /@font-face\s*\{([^}]+)\}/gs;
const CLASS_RE = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/gs;

function getProp(block, prop) {
  const re = new RegExp(`${prop}\\s*:\\s*([^;]+);`);
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function parseWeight(value) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 2) {
    return {
      type: 'range',
      min: parseInt(parts[0], 10),
      max: parseInt(parts[1], 10)
    };
  }
  return {
    type: 'single',
    value: parseInt(parts[0], 10)
  };
}

function parseCss(cssPath) {
  const content = fs.readFileSync(cssPath, 'utf8');
  const cssDir = path.dirname(cssPath);
  const families = {};

  const fontFaceMatches = [...content.matchAll(FONT_FACE_RE)];
  for (const match of fontFaceMatches) {
    const block = match[1];
    let family = getProp(block, 'font-family');
    if (!family) continue;
    family = family.replace(/['"]/g, '').trim();

    const weightRaw = getProp(block, 'font-weight') || '400';
    const stretchRaw = getProp(block, 'font-stretch');
    const src = getProp(block, 'src') || '';
    const urlMatch = src.match(/url\(['"]?([^'")]+)['"]?\)/);
    const url = urlMatch ? urlMatch[1] : null;

    if (!families[family]) {
      families[family] = {
        weights: [],
        weight_range: null,
        stretch_range: null,
        files: []
      };
    }
    const entry = families[family];

    const w = parseWeight(weightRaw);
    if (w.type === 'range') {
      entry.weight_range = [w.min, w.max];
    } else {
      if (!entry.weights.includes(w.value)) {
        entry.weights.push(w.value);
      }
    }

    if (stretchRaw) {
      const stretchParts = stretchRaw.trim().split(/\s+/);
      if (stretchParts.length === 2) {
        entry.stretch_range = [stretchParts[0], stretchParts[1]];
      }
    }

    if (url) {
      const resolved = path.normalize(path.join(cssDir, url)).replace(/\\/g, '/');
      entry.files.push({ weight: weightRaw, url: resolved });
    }
  }

  const cssNoFontFace = content.replace(FONT_FACE_RE, '');
  const classes = [];
  const classMatches = [...cssNoFontFace.matchAll(CLASS_RE)];
  for (const match of classMatches) {
    const name = match[1];
    const block = match[2];
    const fam = getProp(block, 'font-family');
    classes.push({
      class: name,
      font_family: fam ? fam.replace(/['"]/g, '').split(',')[0].trim() : null,
      is_base: fam !== null
    });
  }

  const resultFamilies = [];
  for (const [fam, data] of Object.entries(families)) {
    resultFamilies.push({
      family: fam,
      weights: data.weights.length ? data.weights.sort((a, b) => a - b) : null,
      weight_range: data.weight_range,
      stretch_range: data.stretch_range,
      files: data.files
    });
  }

  return [resultFamilies, classes];
}

function main() {
  if (!fs.existsSync(FONTS_DIR) || !fs.statSync(FONTS_DIR).isDirectory()) {
    console.error(`❌ Directory "${FONTS_DIR}/" not found. Run this script from the project root.`);
    process.exit(1);
  }

  const manifest = [];
  const skipped = [];

  const slugs = fs.readdirSync(FONTS_DIR).sort();
  for (const slug of slugs) {
    const fontDir = path.join(FONTS_DIR, slug);
    if (!fs.statSync(fontDir).isDirectory()) continue;

    const cssFiles = fs.readdirSync(fontDir).filter(f => f.endsWith('.css'));
    if (cssFiles.length === 0) {
      skipped.push(slug);
      continue;
    }

    const cssPath = path.join(fontDir, cssFiles[0]);
    const [families, classes] = parseCss(cssPath);

    const PERSIAN_SLUGS = [
      'joys-iran-sans-x',
      'joys-iran-yekan-x',
      'joys-kalameh',
      'joys-morabba',
      'joys-yekan-bakh',
      'joys-vazir'
    ];
    const group = PERSIAN_SLUGS.includes(slug) ? 'persian' : 'english';

    manifest.push({
      slug,
      group,
      css: cssPath.replace(/\\/g, '/'),
      families,
      classes
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✅ ${OUTPUT_FILE} generated successfully — ${manifest.length} fonts identified.`);

  // Generate llm.txt contents
  let llmText = `# Joys Fonts

Joys Fonts is a modern Persian and English web fonts repository and CLI installer specifically optimized for Tailwind CSS (targeting Tailwind CSS v4+).
Instead of manual setups or installing bloated dependencies, it offers a lightweight CLI utility and static CSS/WOFF2 font assets ready for direct consumption.

- Main Catalog: https://danialzadrafiee.github.io/joys-fonts/
- Manifest File: https://danialzadrafiee.github.io/joys-fonts/fonts.manifest.json

---

## Installation & Usage

You do not need to install this package. You can run the installer CLI in the root of your project using any JavaScript package manager:

\`\`\`bash
# Using npm
npx joys-fonts add <font-slug>

# Using pnpm
pnpm dlx joys-fonts add <font-slug>

# Using yarn
yarn dlx joys-fonts add <font-slug>

# Using bun
bunx joys-fonts add <font-slug>
\`\`\`

### CLI Options

\`\`\`bash
npx joys-fonts add <font-slug> [options]
\`\`\`

- \`-d, --dest <path>\`: Specify directory where font files should be copied (default: \`./src/fonts/<font-slug>\`).
- \`-c, --css <path>\`: Specify project's global/Tailwind CSS stylesheet to update (e.g. \`src/index.css\`).
- \`-y, --yes\`: Auto-confirm all prompts with default settings (recommended for non-interactive/AI agent use).

---

## How It Works (For AI Agents)

When you run \`npx joys-fonts add <font-slug> -y\`, the CLI:
1. Copies the WOFF2 files and its stylesheet to the target project (e.g., \`./src/fonts/<font-slug>\`).
2. Injects the stylesheet \`@import\` at the top of your global CSS:
   \`\`\`css
   @import "./fonts/<font-slug>/<font-slug>.css";
   \`\`\`
3. Updates the Tailwind CSS v4 \`@theme\` block in the global CSS to register the font family utility variables:
   \`\`\`css
   @theme {
     --font-<variable-name>: "<FontFamily>", sans-serif;
   }
   \`\`\`

---

## Direct CDN & URL Access

If you prefer to manually import the fonts or download them without using the CLI, all stylesheet files are hosted on GitHub Pages:

\`\`\`css
/* Example of direct web import */
@import url("https://danialzadrafiee.github.io/joys-fonts/fonts/<font-slug>/<font-slug>.css");
\`\`\`

`;

  llmText += `\n## Available Fonts Reference

Pass the **Slug** to the CLI:

| Slug | Group | Primary Tailwind Class | Additional Classes |
| :--- | :--- | :--- | :--- |
`;

  for (const font of manifest) {
    const primaryClass = font.classes.find(c => c.is_base)?.class || font.classes[0]?.class || '-';
    const otherClasses = font.classes
      .filter(c => c.class !== primaryClass)
      .map(c => `\`${c.class}\``)
      .join(', ') || '-';

    llmText += `| \`${font.slug}\` | \`${font.group}\` | \`${primaryClass}\` | ${otherClasses} |\n`;
  }

  llmText += `\n---\n`;

  llmText += `
## Instructions for AI Agents / LLMs

If a user asks you to install a font from Joys Fonts in their project:
1. Locate the correct font **Slug** from the list of available fonts above.
2. Identify the global CSS stylesheet of the project (usually \`src/index.css\`, \`src/app.css\`, \`app/globals.css\`, or \`styles.css\`).
3. Run the installer CLI using the appropriate package manager (preferring the one used in the project, e.g. \`pnpm\`, \`npm\`):
   \`\`\`bash
   pnpm dlx joys-fonts add <font-slug> --css <path-to-css> -y
   \`\`\`
   *(Tip: Use \`-y\` to skip interactive prompts).*
4. Once completed, use the corresponding Tailwind CSS utility class (e.g. \`font-iran-sans-x\`) in the elements/components as requested.
5. If the project does not use Tailwind CSS v4+, you can still run the CLI to download the assets, and manually add the font family to their Tailwind v3 configuration or raw CSS.
`;

  fs.writeFileSync('llm.txt', llmText, 'utf8');
  console.log('✅ llm.txt generated successfully.');

  // Update README.md font list dynamically
  const readmePath = 'README.md';
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, 'utf8');
    const startTag = '<!-- FONTS_START -->';
    const endTag = '<!-- FONTS_END -->';
    const startIndex = readme.indexOf(startTag);
    const endIndex = readme.indexOf(endTag);

    if (startIndex !== -1 && endIndex !== -1) {
      const before = readme.substring(0, startIndex + startTag.length);
      const after = readme.substring(endIndex);
      const fontListText = '\n' + manifest.map(f => `- \`${f.slug}\``).join('\n') + '\n';
      readme = before + fontListText + after;
      fs.writeFileSync(readmePath, readme, 'utf8');
      console.log('✅ README.md font list updated dynamically.');
    }
  }

  if (skipped.length > 0) {
    console.log(`⚠️  Skipped (no CSS file found, not ready yet): ${skipped.join(', ')}`);
  }
}

main();
