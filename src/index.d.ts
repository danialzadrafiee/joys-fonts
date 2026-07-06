export interface FontFile {
  weight: string;
  url: string;
}

export interface FontFamily {
  family: string;
  weights: number[] | null;
  weight_range: [number, number] | null;
  stretch_range: [string, string] | null;
  files: FontFile[];
}

export interface FontClass {
  class: string;
  font_family: string | null;
  is_base: boolean;
}

export interface FontEntry {
  slug: string;
  css: string;
  families: FontFamily[];
  classes: FontClass[];
}

export const manifest: FontEntry[];

export function detectTailwindVersion(): number;

export function patchTailwindV4(cssFilePath: string, destPath: string, fontEntry: FontEntry): void;

export function patchTailwindV3Config(configFilePath: string, fontEntry: FontEntry): void;

export interface InstallOptions {
  slug: string;
  destPath: string;
  cssPath?: string;
  tailwindVersion?: number;
}

export function installFont(options: InstallOptions): Promise<void>;
