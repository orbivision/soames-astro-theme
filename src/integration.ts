import type { AstroIntegration } from 'astro';
// Returns react() alongside the theme integration; Astro flattens integration arrays.
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { themeShadow } from './theme-shadow.js';

export interface SoamesThemeOptions {
  /** WordPress GraphQL endpoint, e.g. http://soames.orbivision.net/graphql */
  wordpressUrl?: string;
  /** Optional WordPress base URL (defaults to wordpressUrl minus /graphql). */
  wordpressBaseUrl?: string;
  /** Hostnames whose images Astro may optimize. */
  imageDomains?: string[];
}

// The Soames Astro theme integration — successor to the Gatsby theme.
// Responsibilities:
//   1) register @astrojs/react (React islands),
//   2) install the theme-shadow resolver so sites override via src/overrides/,
//   3) inject the page-template routes the theme provides,
//   4) authorize WP image domains,
//   5) expose WP config to the theme via env + make the package transpilable.
export default function soamesTheme(options: SoamesThemeOptions = {}): AstroIntegration[] {
  const themeSrc = fileURLToPath(new URL('.', import.meta.url)); // <pkg>/src/
  const wpUrl = options.wordpressUrl || process.env.WORDPRESS_GRAPHQL_URL || '';
  const wpBase =
    options.wordpressBaseUrl ||
    process.env.WORDPRESS_BASE_URL ||
    wpUrl.replace(/\/graphql\/?$/, '');
  const imageHost = (() => {
    try {
      return wpBase ? new URL(wpBase).hostname : undefined;
    } catch {
      return undefined;
    }
  })();
  const imageDomains = options.imageDomains ?? (imageHost ? [imageHost] : []);

  const theme: AstroIntegration = {
    name: 'soames-astro-theme',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, injectRoute }) => {
        const overrideDir = path.join(fileURLToPath(config.srcDir), 'overrides');

        updateConfig({
          image: { domains: imageDomains },
          vite: {
            plugins: [themeShadow({ themeDir: themeSrc, overrideDir })],
            // Ship source from this package; bundle it AND html-react-parser so
            // both are transpiled and share the deduped React (see dedupe below).
            ssr: { noExternal: ['soames-astro-theme', 'html-react-parser'] },
            // Force a single React copy — the theme ships html-react-parser, which
            // must build elements with the SAME React the renderer uses (otherwise
            // "Objects are not valid as a React child" under file:/linked installs).
            resolve: { dedupe: ['react', 'react-dom'] },
            define: {
              'import.meta.env.WORDPRESS_GRAPHQL_URL': JSON.stringify(wpUrl),
              'import.meta.env.WORDPRESS_BASE_URL': JSON.stringify(wpBase),
            },
          },
        });

        // Theme-provided routes. A site file at the same path takes precedence
        // over an injected route, so sites can still override pages directly.
        injectRoute({ pattern: '/', entrypoint: 'soames-astro-theme/routes/index.astro' });
        injectRoute({ pattern: '/[...uri]', entrypoint: 'soames-astro-theme/routes/[...uri].astro' });
        injectRoute({ pattern: '/blog/[...page]', entrypoint: 'soames-astro-theme/routes/blog/[...page].astro' });
        injectRoute({ pattern: '/blog/post/[...slug]', entrypoint: 'soames-astro-theme/routes/blog/post/[...slug].astro' });
      },
    },
  };

  // react() first so its renderer is registered; Astro flattens this array.
  return [react(), theme];
}
