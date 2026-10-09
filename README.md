<p align="center">
  <a href="https://soames.app">
    <img alt="Soames" src="https://raw.githubusercontent.com/orbivision/soames-astro-theme/main/assets/soames-mark.svg" width="60" />
  </a>
</p>
<h1 align="center">
  Soames Astro Theme
</h1>

[![npm version](https://img.shields.io/npm/v/soames-astro-theme.svg?style=flat-square)](https://www.npmjs.com/package/soames-astro-theme)
[![license](https://img.shields.io/npm/l/soames-astro-theme.svg?style=flat-square)](./LICENSE)

Shared **Astro** theme for the Soames ecosystem — WordPress as a headless CMS,
static output, React islands. Successor to `soames-gatsby-theme` (see ORBI-23/24/25).

## Quick start

Starting a new site? Don't wire this up by hand — use
**[`soames-astro-starter`](https://github.com/orbivision/soames-astro-starter)** and click
*Use this template*. It's this theme already configured, and nothing else.

The instructions below are for adding the theme to an Astro project you already have.

## Install

```
npm install soames-astro-theme
```

## Usage

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import soamesTheme from 'soames-astro-theme';

export default defineConfig({
  output: 'static',
  integrations: [
    soamesTheme({ wordpressUrl: process.env.WORDPRESS_GRAPHQL_URL }),
  ],
});
```

The integration registers `@astrojs/react`, sources content from WordPress at
build time, injects the page routes (front page, WP pages, blog archive,
blog posts), authorizes WP image domains, and installs the **theme-shadow**
resolver.

## Component overrides (the shadowing successor)

Astro has no built-in component shadowing. This theme provides it via a Vite
resolver: theme files are imported as `@theme/<path>`, and a site overrides any
of them by creating a file at the matching path under `src/overrides/`.

```
src/overrides/components/Footer.tsx   → replaces the theme's components/Footer.tsx
src/overrides/layouts/Base.astro      → replaces the theme's layouts/Base.astro
```

Whole-file replacement, resolved at build time, zero changes at the import site —
the direct successor to Gatsby component shadowing.

## Optima Express (IDX)

When the WordPress site has the Optima Express plugin active, registered and in Kestrel mode
(the Soames plugin reports this in `soames/v1/settings`), the build adds one static shell per
IDX page type and merges a rewrite for every IDX URL pattern into `dist/_redirects`. Sites
without it build exactly as before.

Two options improve what search engines see:

```js
soamesTheme({
  wordpressUrl,
  // Self-referencing canonicals on every page. Also used as the IDX pages' canonical origin.
  siteUrl: 'https://example.com',
  optimaExpress: {
    // Netlify only. Serves each indexable IDX page with its own title, description and
    // canonical, real 404s for listings that don't exist, and a 301 for a wrong address slug.
    edge: true,
  },
}),
```

`edge` needs Soames plugin **1.5.0+** with an **Edge secret** set (Soames → Settings), and the
same value as the `SOAMES_EDGE_SECRET` environment variable on the Netlify site. It generates a
Netlify edge function and a cached function into `.netlify/v1/` at build time, with no
`netlify.toml` entry needed. Add `.netlify/` to `.gitignore`. Each response carries an
`X-Soames-IHF` header that says what the edge did. It also serves `/sitemap-idx.xml`, listed in `robots.txt`, with the
pages Optima Express's own sitemap lists (saved-search reports and agents; it lists no listings).
That needs Soames plugin **1.6.0+**.

`edge` also takes an object:
- `split: true` serves odd-numbered listings with the browser-side head only, for comparing the
  two approaches;
- `displayability: { url, headers }` is an optional status check per listing, where a 404 makes
  the page a real 404. `{listingNumber}`, `{boardId}` and `{activationToken}` are filled in;
- `headTimeoutMs` sets how long the edge waits for WordPress (default 8000).

Without `edge`, a small script in each shell fills in the title, description and canonical in
the browser once the listing has rendered.

## WordPress sourcing notes

- Sources via WPGraphQL (`fetch()`), with Site Assets from the Soames plugin REST
  endpoint (`/wp-json/soames/v1/settings`).
- **Wordfence gotcha:** some WP installs' WAF 403-blocks GraphQL whose first
  selection-set field is `pages`/`posts`. `lib/wp.ts` aliases the root field
  (e.g. `wpPages: pages`) to pass; the durable fix is a Wordfence allowlist rule.

## Status

Published to npm (ORBI-25). Under active migration — routing/URL parity, menu
interactivity, and remaining shortcodes are being completed phase by phase.
