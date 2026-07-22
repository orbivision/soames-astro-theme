import type { AstroIntegration } from 'astro';
// Returns react() alongside the theme integration; Astro flattens integration arrays.
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { themeShadow } from './theme-shadow.js';

// html-react-parser is CommonJS and pulls a CJS subtree; these must be bundled
// (noExternal) AND pre-bundled (optimizeDeps) so React dedupes to one copy and
// dev SSR doesn't choke on CJS (`exports is not defined`).
const PARSER_CJS_DEPS = [
  'html-react-parser',
  'html-dom-parser',
  'domhandler',
  'domelementtype',
  'domutils',
  'dom-serializer',
  'htmlparser2',
  'entities',
  'style-to-js',
  'style-to-object',
  'inline-style-parser',
  'react-property',
];

// Browser-ish UA — this WP install's Wordfence 403s some default UAs (see lib/wp.ts).
const WP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Resolve the blog's base slug from the WP "Posts page" (Settings → Reading) at
// config time, so the blog archive route can be injected at that slug. Falls back
// to 'blog' if unset or WP is unreachable, so builds never hang or break on it.
async function fetchPostsSlug(graphqlUrl: string): Promise<string> {
  if (!graphqlUrl) return 'blog';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': WP_UA },
      body: JSON.stringify({ query: '{ wpPages: pages(first: 100) { nodes { slug isPostsPage } } }' }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return 'blog';
    const json = (await res.json()) as {
      data?: { wpPages?: { nodes?: Array<{ slug: string; isPostsPage: boolean }> } };
    };
    const pp = (json?.data?.wpPages?.nodes ?? []).find((n) => n.isPostsPage);
    return pp?.slug || 'blog';
  } catch {
    return 'blog';
  }
}

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
      'astro:config:setup': async ({ config, updateConfig, injectRoute }) => {
        const overrideDir = path.join(fileURLToPath(config.srcDir), 'overrides');

        updateConfig({
          image: { domains: imageDomains },
          vite: {
            plugins: [themeShadow({ themeDir: themeSrc, overrideDir })],
            // Ship source from this package; bundle it AND the html-react-parser
            // subtree so everything is transpiled, shares the deduped React, and
            // the parser's CJS deps (domelementtype et al.) get proper interop
            // under SSR (otherwise "does not provide an export named 'default'").
            ssr: {
              noExternal: ['soames-astro-theme', ...PARSER_CJS_DEPS],
              // SSR dep pre-bundling — without this, dev SSR throws "exports is
              // not defined" on the CommonJS parser modules.
              optimizeDeps: { include: PARSER_CJS_DEPS },
            },
            // Client-side pre-bundle too (for the parser when used in islands).
            optimizeDeps: { include: PARSER_CJS_DEPS },
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

        // Blog base slug from the WP "Posts page" (Settings → Reading), or 'blog'.
        const postsSlug = await fetchPostsSlug(wpUrl);

        // Theme-provided routes. A site file at the same path takes precedence
        // over an injected route, so sites can still override pages directly.
        injectRoute({ pattern: '/', entrypoint: 'soames-astro-theme/routes/index.astro' });
        injectRoute({ pattern: '/[...uri]', entrypoint: 'soames-astro-theme/routes/[...uri].astro' });
        // Blog archive lives at the Posts-page slug (default /blog/). Individual
        // posts stay at /blog/post/<slug>/ regardless.
        injectRoute({ pattern: `/${postsSlug}/[...page]`, entrypoint: 'soames-astro-theme/routes/blog/[...page].astro' });
        injectRoute({ pattern: '/blog/post/[...slug]', entrypoint: 'soames-astro-theme/routes/blog/post/[...slug].astro' });
        // Documentation (weDocs). Optional — generates 0 doc pages when weDocs
        // isn't installed (getDocs() returns []); /docs/ then shows an empty state.
        injectRoute({ pattern: '/docs', entrypoint: 'soames-astro-theme/routes/docs/index.astro' });
        // ORBI-50: static search index (before the [...slug] catch-all so the
        // named endpoint wins). Feeds the client-side DocsSearch island.
        injectRoute({ pattern: '/docs/search-index.json', entrypoint: 'soames-astro-theme/routes/docs/search-index.json.ts' });
        injectRoute({ pattern: '/docs/[...slug]', entrypoint: 'soames-astro-theme/routes/docs/[...slug].astro' });

        // When the blog moved off /blog/, redirect the old base path to it.
        if (postsSlug !== 'blog') {
          updateConfig({ redirects: { '/blog': `/${postsSlug}` } });
        }
      },
    },
  };

  // react() first so its renderer is registered; Astro flattens this array.
  return [react(), theme];
}
