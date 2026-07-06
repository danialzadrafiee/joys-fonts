#!/usr/bin/env node
/**
 * اسکن پوشه‌ی fonts/ و تولید fonts.manifest.json
 * این فایل تنها منبع حقیقت (source of truth) برای index.html هست.
 * هر فونت جدیدی که طبق قواعد .AGENTS.md اضافه بشه، خودکار شناسایی میشه.
 * 
 * اجرا: node generate-manifest.js
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
      'joys-yekan-bakh'
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
  if (skipped.length > 0) {
    console.log(`⚠️  Skipped (no CSS file found, not ready yet): ${skipped.join(', ')}`);
  }
}

main();
