// Optima Express listing sitemaps (ORBI-82 Phase 4): a Netlify Function, generated alongside the
// edge function when a site enables `optimaExpress.edge` (src/lib/ihfEdge.ts).
//
// Optima Express publishes no sitemap a static site can serve; the Soames plugin (1.6.0+) exposes
// its listing URLs at soames/v1/optima-express/sitemap. This serves them on the site's own origin,
// at request time — listings change daily, and a file written at build would only refresh when
// WordPress content is published — durably cached like the head.
//
// With the A/B split on, one file per group, split by the same groupFor() the edge uses, so Search
// Console reports indexing per group. Only URLs matching an indexable route are listed, each moved
// onto the site's origin.

import { compileRoutes, matchRoute, groupFor, escapeHtml } from './ihfCommon.mjs';

/* global CONFIG */
const ROUTES = compileRoutes(CONFIG.routes);
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 soames-ihf-sitemap';

function fail(message) {
  return new Response(message, {
    status: 502,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** W3C datetime, or null for anything a sitemap consumer could reject. */
function lastmod(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default async function handler(request) {
  const url = new URL(request.url);
  const group = CONFIG.files[url.pathname];
  if (!group) return new Response('Not found', { status: 404 });

  let body;
  try {
    const r = await fetch(`${CONFIG.wpBase}/wp-json/soames/v1/optima-express/sitemap`, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(CONFIG.wpTimeoutMs),
    });
    if (!r.ok) return fail(`WordPress ${r.status}`);
    body = await r.json();
  } catch (e) {
    return fail(e && e.name === 'TimeoutError' ? 'WordPress timeout' : 'WordPress unreachable');
  }
  if (!body || !Array.isArray(body.urls)) return fail('Unexpected sitemap response');

  const origin = CONFIG.siteUrl || url.origin;
  const seen = new Set();
  const entries = [];
  for (const u of body.urls) {
    let path;
    try {
      path = new URL(u.loc).pathname;
    } catch {
      continue;
    }
    const match = matchRoute(ROUTES, path);
    if (!match) continue;
    if (group !== 'all' && groupFor(match.params, CONFIG.split) !== group) continue;
    const loc = new URL(path, origin).href;
    if (seen.has(loc)) continue;
    seen.add(loc);
    const mod = lastmod(u.lastmod);
    entries.push(`<url><loc>${escapeHtml(loc)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}</url>`);
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') +
    '\n</urlset>\n';
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'netlify-cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400, durable',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-soames-ihf-count': String(entries.length),
    },
  });
}
