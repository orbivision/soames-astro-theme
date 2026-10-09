// Optima Express head oracle (ORBI-82): a Netlify Function, not an edge function, because its
// response cache is the point. The spike showed an edge function's cache is per edge node, so a
// slow WordPress render (p50 3.7 s) would be paid again on every node; a function response marked
// `durable` is cached once and shared. The edge function calls this on its own origin.
//
// GET <headPath><virtual-page path> → JSON, the allowlisted head of the WordPress-rendered page:
//   { status: 200, title, description, keywords, image, fetchedAt }  cached 1 h + 24 h stale (D3)
//   { status: 404, fetchedAt }                                      cached the same
//   { error }                                                       5xx, never cached
//
// WordPress is fetched with `X-Soames-Edge: $SOAMES_EDGE_SECRET`, which the Soames plugin
// (1.5.0+) honours by skipping its redirect to the front end. Only Optima Express virtual-page
// paths are fetched, so this can't be used to read anything else off WordPress.

import { compileRoutes, matchRoute, extractHead } from './ihfCommon.mjs';

/* global CONFIG, Netlify */
const ROUTES = compileRoutes(CONFIG.routes);
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 soames-ihf-head';

function json(body, status, cache) {
  const headers = { 'content-type': 'application/json', 'x-robots-tag': 'noindex' };
  if (cache) {
    headers['netlify-cdn-cache-control'] = 'public, s-maxage=3600, stale-while-revalidate=86400, durable';
    headers['cache-control'] = 'public, max-age=0, must-revalidate';
  } else {
    headers['cache-control'] = 'no-store';
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function secret() {
  try {
    const v = globalThis.Netlify?.env?.get('SOAMES_EDGE_SECRET');
    if (v) return v;
  } catch {
    /* not on Netlify */
  }
  return globalThis.process?.env?.SOAMES_EDGE_SECRET || '';
}

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname.slice(CONFIG.headPath.length) || '/';
  if (!matchRoute(ROUTES, path)) return json({ error: 'not an Optima Express page' }, 404, false);
  const key = secret();
  if (!key) return json({ error: 'SOAMES_EDGE_SECRET is not set' }, 503, false);

  let res;
  try {
    res = await fetch(CONFIG.wpBase + path, {
      headers: { 'x-soames-edge': key, 'user-agent': UA },
      redirect: 'manual',
      signal: AbortSignal.timeout(CONFIG.wpTimeoutMs),
    });
  } catch (e) {
    return json({ error: e && e.name === 'TimeoutError' ? 'WordPress timeout' : 'WordPress unreachable' }, 502, false);
  }
  const fetchedAt = new Date().toISOString();
  if (res.status === 200) return json({ status: 200, ...extractHead(await res.text()), fetchedAt }, 200, true);
  res.body?.cancel();
  if (res.status === 404) return json({ status: 404, fetchedAt }, 200, true);
  if (res.status >= 300 && res.status < 400) {
    // The plugin redirected: the secret doesn't match the one in Soames Settings (or the plugin
    // is older than 1.5.0).
    return json({ error: 'WordPress redirected; check the edge secret' }, 502, false);
  }
  return json({ error: `WordPress ${res.status}` }, 502, false);
}
