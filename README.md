# Joys Fonts

Joys Fonts is a modern platform and CLI utility designed to package and install Persian web fonts into Tailwind CSS projects (specifically targeting **Tailwind CSS v4+**). 

Instead of manual setup or adding the entire font collection as a dependency, the Joys Fonts CLI allows you to download and configure only the specific fonts you need.

---

## Features

- **Tailwind CSS v4+ Native**: Automatically updates your main CSS file, injecting `@import` statements and registering theme variables inside the Tailwind `@theme` block.
- **Zero-Dependency CLI**: Written in native Node.js ES Modules. Extremely fast and lightweight.
- **WOFF2 Optimized**: Only keeps modern, optimized WOFF2 font assets for maximum web performance.
- **Supports Static & Variable Fonts**: Installs and maps font weights (including custom axes) appropriately.

---

## Installation & Usage

You don't need to install this package. You can run the installer CLI in the root of your project using your preferred package manager:

### npm
```bash
npx joys-fonts add <font-slug>
```

### pnpm
```bash
pnpm dlx joys-fonts add <font-slug>
```

### yarn
```bash
yarn dlx joys-fonts add <font-slug>
```

### bun
```bash
bunx joys-fonts add <font-slug>
```

For example, to install the `joys-iran-sans-x` font using pnpm:

```bash
pnpm dlx joys-fonts add joys-iran-sans-x
```

### Options

The CLI can be run non-interactively using options for automation and CI/CD:

```bash
npx joys-fonts add <font-slug> [options]
```

- `-d, --dest <path>`: Specify the directory where the font files should be copied.
- `-c, --css <path>`: Specify your project's global/Tailwind CSS stylesheet to update.
- `-y, --yes`: Auto-confirm all prompts with default settings.

---

## How It Works

When you run `npx joys-fonts add joys-iran-sans-x`, the CLI will:
1. Copy the font's WOFF2 files and its stylesheet (`joys-iran-sans-x.css`) to your project (e.g., `./src/fonts/joys-iran-sans-x`).
2. Inject the stylesheet `@import` at the top of your global CSS:
   ```css
   @import "./fonts/joys-iran-sans-x/joys-iran-sans-x.css";
   ```
3. Update your Tailwind CSS v4 `@theme` block to declare the corresponding CSS font-family variables:
   ```css
   @theme {
     --font-iran-sans-x: "JoysIranSansX", sans-serif;
     --font-iran-sans-x-fanum: "JoysIranSansXFaNum", sans-serif;
     --font-iran-sans-x-noen: "JoysIranSansXNoEn", sans-serif;
   }
   ```
4. Now, you can use standard Tailwind classes anywhere in your HTML or React code:
   - `font-iran-sans-x` (Default Regular weight)
   - `font-iran-sans-x-fanum` (Persian numbers version)
   - `font-iran-sans-x-noen` (No English letters version)

---

## Available Fonts

The following fonts are packaged and available for installation:

- `joys-iran-sans-x`
- `joys-iran-yekan-x`
- `joys-kalameh`
- `joys-morabba`
- `joys-yekan-bakh`

---

## Contributing & Adding Fonts

If you want to contribute, add new Persian fonts, or edit existing ones, please follow our step-by-step guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md) to keep the repository clean and standardized.

---

## License

MIT
