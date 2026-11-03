// Sitemap of the site's own pages — ORBI-89.
//
// Built from the pages Astro actually rendered (the `astro:build:done` hook's list), not from
// WordPress: listing URLs from WP data would duplicate the routing rules in the route files
// (front page, Posts page, posts at /blog/post/<slug>/ whatever their permalink), and the day one
// of them changed the sitemap would list 404s. WordPress is consulted only for <lastmod>, and a
// miss there just means no <lastmod>.
//
// Only for a site that passed `siteUrl`: sitemap URLs must be absolute, and guessing the origin is
// how the netlify.app host would leak in. Without it the build output is unchanged.

import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Where the sitemap is served. The name crawlers and tools probe first. */
export const SITEMAP_PATH = '/sitemap.xml';

// The sitemaps.org limit per file. No Soames site is anywhere near it; past it, a sitemap index
// would be needed, so stop and say so rather than write an invalid file.
const MAX_URLS = 50000;

/**
 * Paths never listed, whatever their HTML says:
 *  - /preview/: the WordPress Preview landing page (ORBI-85), empty without a token.
 *  - /_ihf/…: Optima Express shells (ORBI-82); robots.txt disallows them.
 *  - /404/: the not-found page.
 * Blog pagination is excluded separately (it depends on the Posts-page slug), because every post
 * is already listed in its own right.
 */
export const EXCLUDED = [/^\/preview\/$/, /^\/_ihf\//, /^\/404\/$/];

export interface SitemapLastmod {
  /** Site path (leading and trailing slash) → ISO 8601 UTC. */
  [path: string]: string;
}

interface Logger {
  info(m: string): void;
  warn(m: string): void;
}

/** `about/team` / `about/team/` / `` → `/about/team/` / `/`. */
function toPath(pathname: string): string {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** The built HTML for a path, or null for a non-HTML endpoint (e.g. /docs/search-index.json). */
async function readHtml(distDir: string, pathname: string): Promise<string | null> {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  for (const file of [path.join(distDir, trimmed, 'index.html'), path.join(distDir, `${trimmed}.html`)]) {
    try {
      return await fs.readFile(file, 'utf8');
    } catch {
      /* try the next build format */
    }
  }
  return null;
}

/**
 * Whether a rendered page belongs in the sitemap: not a redirect stub (Astro renders config
 * `redirects` as meta-refresh pages), not noindex, and not canonicalised to another URL. Reading
 * the HTML keeps this honest about what the page itself tells a crawler.
 */
function indexable(html: string, loc: string): boolean {
  if (/<meta\s+http-equiv=["']?refresh/i.test(html)) return false;
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
  if (robots && /noindex/i.test(robots[1])) return false;
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
  if (canonical && canonical[1] !== loc) return false;
  return true;
}

/** Write dist/sitemap.xml. Returns its absolute URL, or null when nothing was written. */
export async function writeSitemap(
  distDir: string,
  pages: Array<{ pathname: string }>,
  site: { siteUrl: string; postsSlug: string; lastmod: SitemapLastmod },
  logger: Logger,
): Promise<string | null> {
  const pagination = new RegExp(`^/${site.postsSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\d+/$`);
  const seen = new Set<string>();
  const entries: string[] = [];
  let skipped = 0;

  for (const { pathname } of pages) {
    const p = toPath(pathname);
    if (seen.has(p) || EXCLUDED.some((re) => re.test(p)) || pagination.test(p)) continue;
    seen.add(p);
    const html = await readHtml(distDir, pathname);
    if (html === null) continue; // an endpoint, not a page
    const loc = new URL(p, site.siteUrl).href;
    if (!indexable(html, loc)) {
      skipped++;
      continue;
    }
    const mod = site.lastmod[p];
    entries.push(`<url><loc>${xmlEscape(loc)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`);
  }

  if (entries.length > MAX_URLS) {
    logger.warn(`Sitemap: ${entries.length} URLs is over the ${MAX_URLS} limit for one file — not written. This site needs a sitemap index.`);
    return null;
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') +
    '\n</urlset>\n';
  await fs.writeFile(path.join(distDir, SITEMAP_PATH.slice(1)), xml);
  const dated = entries.filter((e) => e.includes('<lastmod>')).length;
  logger.info(`Sitemap: ${entries.length} URL(s) in ${SITEMAP_PATH} (${dated} with lastmod${skipped ? `, ${skipped} skipped as redirect/noindex/canonicalised` : ''})`);
  return `${site.siteUrl}${SITEMAP_PATH}`;
}

/** WPGraphQL's `modifiedGmt` has no zone ("2026-09-06T20:16:51"); it is UTC. */
function isoUtc(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Path → last-modified, for <lastmod>. Each content type is its own query so a site without the
 * docs CPT still dates its pages and posts; any failure just means fewer dates, never a failed
 * build. Aliased root fields, because Wordfence 403s a body that leads with `pages`/`posts`.
 * Posts are keyed by slug at /blog/post/<slug>/, matching routes/blog/post/[...slug].astro.
 */
export async function fetchLastmod(graphqlUrl: string, userAgent: string): Promise<SitemapLastmod> {
  const out: SitemapLastmod = {};
  if (!graphqlUrl) return out;
  const query = async (q: string) => {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent },
      body: JSON.stringify({ query: q }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`WPGraphQL ${res.status}`);
    const json = (await res.json()) as { data?: Record<string, { nodes?: any[] }>; errors?: unknown };
    if (json.errors) throw new Error('WPGraphQL errors');
    return json.data ?? {};
  };
  const [pages, posts, docs] = await Promise.allSettled([
    query('{ wpPages: pages(first: 100) { nodes { uri modifiedGmt } } }'),
    query('{ wpPosts: posts(first: 100) { nodes { slug modifiedGmt } } }'),
    query('{ wpDocs: documents(first: 200) { nodes { uri modifiedGmt } } }'),
  ]);
  const set = (p: string | null | undefined, v: unknown) => {
    const iso = isoUtc(v);
    if (p && iso) out[toPath(p)] = iso;
  };
  if (pages.status === 'fulfilled') for (const n of pages.value.wpPages?.nodes ?? []) set(n.uri, n.modifiedGmt);
  if (posts.status === 'fulfilled') for (const n of posts.value.wpPosts?.nodes ?? []) set(n.slug && `/blog/post/${n.slug}/`, n.modifiedGmt);
  if (docs.status === 'fulfilled') for (const n of docs.value.wpDocs?.nodes ?? []) set(n.uri, n.modifiedGmt);
  return out;
}
