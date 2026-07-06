# Contributing to Joys Fonts

Thank you for contributing to Joys Fonts! To maintain high code quality and consistency (similar to the standards of projects like shadcn/ui), please follow these guidelines when adding new fonts or making modifications.

---

## Workspace Directory Structure

Every font must be stored in a dedicated folder under the `fonts/` directory:

```
fonts/
└── joys-<font-slug>/
    ├── joys-<font-slug>.css   (Stylesheet with @font-face declarations)
    └── woff2/                  (Only modern WOFF2 formats are allowed)
        └── joys-<font-slug>[-<variant>]-<weight>.woff2
```

---

## Standards and Naming Rules

### 1. Naming Conventions
- **Folder Names**: Must be in kebab-case and start with `joys-` prefix (e.g. `joys-vazir-matn`).
- **File Names**: Must match the folder slug name.
- **Variants Suffixes**:
  - Persian Numbers variant (`FaNum`): Suffix with `-fanum` (e.g., `joys-vazir-matn-fanum-400.woff2`).
  - No English letters variant (`NoEn`): Suffix with `-noen` (e.g., `joys-vazir-matn-noen-400.woff2`).

### 2. Format Optimization
- **WOFF2 Only**: Only keep `.woff2` files. Do not include outdated formats (like `ttf`, `otf`, `woff`, `eot`).
- If you only have TTF or OTF files, you can convert them to WOFF2 using standard python `fontTools` or web converters such as [Transfonter](https://transfonter.org/).

### 3. Font Weight Mapping
For static fonts, map standard weights to their exact CSS numeric values:
- `Thin` = 100
- `ExtraLight` / `UltraLight` = 200
- `Light` = 300
- `Regular` / `Book` = 400
- `Medium` = 500
- `SemiBold` / `DemiBold` = 600
- `Bold` = 700
- `ExtraBold` = 800
- `Black` / `Heavy` = 900
*If there are non-standard weights above 900 (e.g. Heavy, ExtraBlack), map them logically (e.g., 950 or 1000) and specify this clearly in the CSS.*

### 4. Variable Font (VF) Rules
- Keep range-based values for variable axes:
  - Font Weight: `font-weight: 100 900;` (specify the actual range of the font).
  - Font Stretch: `font-stretch: 75% 125%;` (if the font supports the width `wdth` axis).
- Always use standard properties (`font-weight`, `font-stretch`) for registered axes. Use `font-variation-settings` only for custom, non-standard axes.
- Verify axes using online font inspectors (like [Wakamaifondue](https://wakamaifondue.com/)) or docs before writing CSS.

---

## CSS Rules (`<slug>.css`)

Your CSS file must follow these conventions:
1. **Font Display**: Always include `font-display: swap;` in all `@font-face` blocks.
2. **Base Classes**: Define a base CSS class for each variant in the format `.font-<font-slug>[-<variant>]`. This class must declare the `font-family`, a default `font-weight: 400;`, and a default `font-stretch: 100%;` (if a width axis exists).
   ```css
   .font-vazir-matn {
     font-family: 'JoysVazirMatn', sans-serif;
     font-weight: 400;
   }
   ```
3. **OpenType Features**: If the font includes stylistic sets (like ss01, ss02) or features (like slashed zero), define clean, semantic helper classes instead of using `.ss01`:
   ```css
   .font-vazir-matn-stylistic {
     font-feature-settings: "ss01" on;
   }
   ```

---

## Step-by-Step Workflow for Adding a Font

Follow these steps to add a new font to the repository:

1. **Prepare Font Folder**: Create `fonts/joys-<name>/woff2/`. Add WOFF2 files renamed following the naming rules.
2. **Write CSS**: Add `fonts/joys-<name>/joys-<name>.css` specifying `@font-face` and base class declarations.
3. **Rebuild Manifest**: Update the repository database index. This scans all folders under `fonts/` and updates `fonts.manifest.json`.
   ```bash
   node generate-manifest.js
   ```
4. **Visual Testing**:
   Start a local web server:
   ```bash
   npx -y http-server -p 8000
   ```
   Open `http://localhost:8000` in your browser. Verify all weights, variants, axes sliders, and stylistic set checkboxes.
5. **Commit & Pull Request**: Ensure no files like `test-project/` are committed (they are ignored in `.gitignore`).

---

Thank you for keeping Joys Fonts clean and premium!
