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

## WordPress sourcing notes

- Sources via WPGraphQL (`fetch()`), with Site Assets from the Soames plugin REST
  endpoint (`/wp-json/soames/v1/settings`).
- **Wordfence gotcha:** some WP installs' WAF 403-blocks GraphQL whose first
  selection-set field is `pages`/`posts`. `lib/wp.ts` aliases the root field
  (e.g. `wpPages: pages`) to pass; the durable fix is a Wordfence allowlist rule.

## Status

Published to npm (ORBI-25). Under active migration — routing/URL parity, menu
interactivity, and remaining shortcodes are being completed phase by phase.
