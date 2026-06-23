import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

// Replicates Gatsby component shadowing on Astro/Vite (proven in ORBI-24 spike).
//
// An import of `@theme/<rel>` resolves to the SITE OVERRIDE (`<overrideDir>/<rel>`)
// if that file exists, otherwise the THEME default (`<themeDir>/<rel>`). Same
// import specifier → different file. Path-keyed, whole-file replacement, resolved
// at build time. This is the successor to Gatsby's `src/<theme-name>/<path>` shadowing.
const EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '.astro', '/index.tsx', '/index.ts'];

export interface ThemeShadowOptions {
  /** The theme package's source root (defaults resolved by the integration). */
  themeDir: string;
  /** The consuming site's override dir, e.g. <site>/src/overrides. */
  overrideDir: string;
  /** Import prefix to intercept. */
  prefix?: string;
}

export function themeShadow({ themeDir, overrideDir, prefix = '@theme/' }: ThemeShadowOptions): Plugin {
  return {
    name: 'soames-theme-shadow',
    enforce: 'pre',
    resolveId(source: string) {
      if (!source.startsWith(prefix)) return null;
      const rel = source.slice(prefix.length);
      // Override wins over theme — mirrors Gatsby's site-shadows-theme precedence.
      for (const base of [overrideDir, themeDir]) {
        for (const ext of EXTS) {
          const full = path.join(base, rel + ext);
          if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
        }
      }
      return null;
    },
  };
}
