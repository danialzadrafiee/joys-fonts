import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, '..');
const manifestPath = path.join(pkgRoot, 'fonts.manifest.json');

export const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

/**
 * Automatically detects the Tailwind CSS version of the user's project
 * @returns {number} 3 or 4
 */
export function detectTailwindVersion() {
  try {
    if (fs.existsSync('package.json')) {
      const userPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const deps = { ...userPkg.dependencies, ...userPkg.devDependencies };
      if (deps.tailwindcss) {
        const v = deps.tailwindcss.replace(/[^0-9.]/g, '');
        if (v.startsWith('4')) return 4;
        if (v.startsWith('3')) return 3;
      }
    }
  } catch (_) {}

  // Fallback check for config files (Tailwind v3 uses config files)
  const v3Configs = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs', 'tailwind.config.mjs'];
  for (const config of v3Configs) {
    if (fs.existsSync(config)) return 3;
  }

  // Default to v4
  return 4;
}

/**
 * Patches a Tailwind CSS v4 CSS file to inject imports and theme variables
 * @param {string} cssFilePath 
 * @param {string} destPath 
 * @param {object} fontEntry 
 */
export function patchTailwindV4(cssFilePath, destPath, fontEntry) {
  let cssContent = fs.readFileSync(cssFilePath, 'utf8');

  // 1. Inject @import
  const relativeCssPath = path.relative(path.dirname(cssFilePath), path.join(destPath, `${fontEntry.slug}.css`)).replace(/\\/g, '/');
  const relativeImportStr = relativeCssPath.startsWith('.') ? relativeCssPath : `./${relativeCssPath}`;
  const importStatement = `@import "${relativeImportStr}";`;

  if (!cssContent.includes(importStatement)) {
    cssContent = `${importStatement}\n${cssContent}`;
  }

  // 2. Inject @theme variables
  const varsToInject = [];
  for (const cls of fontEntry.classes) {
    if (cls.font_family && cls.class.startsWith('font-')) {
      const varName = `--font-${cls.class.substring(5)}`;
      const varValue = `"${cls.font_family}", sans-serif`;
      const varDecl = `${varName}: ${varValue};`;
      if (!cssContent.includes(varName)) {
        varsToInject.push(varDecl);
      }
    }
  }

  if (varsToInject.length > 0) {
    const themeBlockRegex = /@theme\s*\{([^}]*)\}/s;
    const themeMatch = cssContent.match(themeBlockRegex);

    if (themeMatch) {
      const fullThemeBlock = themeMatch[0];
      const innerContent = themeMatch[1];
      const newInnerContent = innerContent.trimEnd() + '\n  ' + varsToInject.join('\n  ') + '\n';
      const updatedThemeBlock = `@theme {\n  ${newInnerContent.trim()}\n}`;
      cssContent = cssContent.replace(fullThemeBlock, updatedThemeBlock);
    } else {
      cssContent = cssContent.trimEnd() + `\n\n@theme {\n  ${varsToInject.join('\n  ')}\n}\n`;
    }
  }

  fs.writeFileSync(cssFilePath, cssContent, 'utf8');
}

/**
 * Patches a Tailwind CSS v3 JS/TS configuration file
 * @param {string} configFilePath 
 * @param {object} fontEntry 
 */
export function patchTailwindV3Config(configFilePath, fontEntry) {
  let configContent = fs.readFileSync(configFilePath, 'utf8');

  const configLines = [];
  for (const cls of fontEntry.classes) {
    if (cls.font_family && cls.class.startsWith('font-')) {
      const name = cls.class.substring(5);
      const line = `'${name}': ['${cls.font_family}', 'sans-serif'],`;
      if (!configContent.includes(`'${name}':`) && !configContent.includes(`"${name}":`)) {
        configLines.push(line);
      }
    }
  }

  if (configLines.length === 0) return;

  const fontFamilyRegex = /(fontFamily\s*:\s*\{)/;
  if (fontFamilyRegex.test(configContent)) {
    configContent = configContent.replace(fontFamilyRegex, `$1\n      ${configLines.join('\n      ')}`);
  } else {
    const extendRegex = /(extend\s*:\s*\{)/;
    if (extendRegex.test(configContent)) {
      configContent = configContent.replace(extendRegex, `$1\n      fontFamily: {\n        ${configLines.join('\n        ')}\n      },`);
    } else {
      const themeRegex = /(theme\s*:\s*\{)/;
      if (themeRegex.test(configContent)) {
        configContent = configContent.replace(themeRegex, `$1\n    extend: {\n      fontFamily: {\n        ${configLines.join('\n        ')}\n      }\n    },`);
      } else {
        const exportRegex = /(module\.exports\s*=\s*\{|export\s*default\s*\{)/;
        if (exportRegex.test(configContent)) {
          configContent = configContent.replace(exportRegex, `$1\n  theme: {\n    extend: {\n      fontFamily: {\n        ${configLines.join('\n        ')}\n      }\n    }\n  },`);
        }
      }
    }
  }

  fs.writeFileSync(configFilePath, configContent, 'utf8');
}

/**
 * Installs a font into the project and patches the configuration
 * @param {object} options 
 * @param {string} options.slug - The font identifier (e.g. joys-vazir)
 * @param {string} options.destPath - Destination folder path
 * @param {string} [options.cssPath] - Main CSS stylesheet path
 * @param {number} [options.tailwindVersion] - Tailwind CSS version (auto-detected if omitted)
 */
export async function installFont(options) {
  const { slug, destPath, cssPath } = options;

  const fontEntry = manifest.find(f => f.slug === slug);
  if (!fontEntry) {
    throw new Error(`Font slug "${slug}" not found in manifest.`);
  }

  const srcDir = path.join(pkgRoot, 'fonts', slug);
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source font folder not found in package: ${srcDir}`);
  }

  // 1. Copy font assets
  fs.mkdirSync(destPath, { recursive: true });
  fs.cpSync(srcDir, destPath, { recursive: true });

  // 2. Patch Tailwind configurations
  if (cssPath && fs.existsSync(cssPath)) {
    const version = options.tailwindVersion || detectTailwindVersion();

    if (version === 4) {
      patchTailwindV4(cssPath, destPath, fontEntry);
    } else if (version === 3) {
      // Inject CSS import first
      let cssContent = fs.readFileSync(cssPath, 'utf8');
      const relativeCssPath = path.relative(path.dirname(cssPath), path.join(destPath, `${slug}.css`)).replace(/\\/g, '/');
      const relativeImportStr = relativeCssPath.startsWith('.') ? relativeCssPath : `./${relativeCssPath}`;
      const importStatement = `@import "${relativeImportStr}";`;

      if (!cssContent.includes(importStatement)) {
        cssContent = `${importStatement}\n${cssContent}`;
        fs.writeFileSync(cssPath, cssContent, 'utf8');
      }

      // Find tailwind.config file
      const configFiles = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs', 'tailwind.config.mjs'];
      let configPath = null;
      for (const config of configFiles) {
        if (fs.existsSync(config)) {
          configPath = path.resolve(config);
          break;
        }
      }

      if (configPath) {
        patchTailwindV3Config(configPath, fontEntry);
      }
    }
  }
}
