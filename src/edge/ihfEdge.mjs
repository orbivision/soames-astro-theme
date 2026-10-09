// Optima Express edge function (ORBI-82, architecture B). The build copies this, with the shared
// helpers and an inline CONFIG, into .netlify/v1/edge-functions/ (src/lib/ihfEdge.ts). It runs on
// the indexable virtual-page URLs only, and on any doubt serves the static shell untouched — the
// client head writer in the shell then does what it can (architecture A).
//
// Per request, in order:
//   1. group: listing URLs split A/B by listing number when the experiment is on; A passes through;
//   2. displayability check (optional, site-configured URL template): 404 → a real 404;
//   3. head oracle: the durably cached head function (WordPress, fetched with the edge secret);
//      WordPress 404 → a real 404;
//   4. wrong address slug → 301 to the canonical one;
//   5. the page's own title, description, canonical… spliced into the shell.
// Every response carries `X-Soames-IHF: <outcome>`; off the primary host also `X-Robots-Tag: noindex`.

import {
  compileRoutes,
  matchRoute,
  groupFor,
  fillTemplate,
  readShellConfig,
  spliceHead,
  stripSiteName,
  addressSlug,
  buildPath,
} from './ihfCommon.mjs';

/* global CONFIG */
const ROUTES = compileRoutes(CONFIG.routes);

async function checkDisplayable(params) {
  const c = CONFIG.displayability;
  const values = { ...params, activationToken: CONFIG.activationToken };
  const headers = {};
  for (const [k, v] of Object.entries(c.headers || {})) headers[k] = fillTemplate(v, values);
  try {
    const r = await fetch(fillTemplate(c.url, values), {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(CONFIG.checkTimeoutMs),
    });
    // Status only: the body is never read.
    r.body?.cancel();
    return r.status === 404 ? 404 : r.status === 200 ? 200 : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function fetchHead(url) {
  try {
    const r = await fetch(new URL(CONFIG.headPath + url.pathname, url), {
      signal: AbortSignal.timeout(CONFIG.headTimeoutMs),
    });
    const body = await r.json();
    return r.ok ? body : { error: body.error || `head ${r.status}` };
  } catch (e) {
    return { error: e && e.name === 'TimeoutError' ? 'head timeout' : 'head unreachable' };
  }
}

export default async function handler(request, context) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  const url = new URL(request.url);
  const match = matchRoute(ROUTES, url.pathname);
  if (!match) return;
  const { route, params } = match;

  const origin = CONFIG.siteUrl || url.origin;
  const offPrimary = url.host !== new URL(origin).host;
  const finish = (res, outcome, detail) => {
    const r = new Response(res.body, res);
    r.headers.set('x-soames-ihf', outcome);
    if (detail) r.headers.set('x-soames-ihf-detail', detail);
    // Deploy previews and *.netlify.app copies stay out of the index; the canonical still names
    // the primary host.
    if (offPrimary) r.headers.set('x-robots-tag', 'noindex');
    return r;
  };

  if (groupFor(params, CONFIG.split) === 'A') return finish(await context.next(), 'A');

  const display = CONFIG.displayability && params.listingNumber ? await checkDisplayable(params) : 'unchecked';
  const head = display === 404 ? null : await fetchHead(url);

  const shellRes = await context.next();
  const type = shellRes.headers.get('content-type') || '';
  if (!shellRes.ok || !type.includes('text/html') || request.method === 'HEAD') {
    return finish(shellRes, 'B-passthrough');
  }
  const shell = await shellRes.text();
  const cfg = readShellConfig(shell) || {};
  const siteTitle = cfg.siteTitle || '';
  const headers = new Headers(shellRes.headers);
  headers.delete('content-length');
  headers.delete('etag');
  const respond = (html, status, outcome, detail) =>
    finish(new Response(html, { status, headers }), outcome, detail);

  if (display === 404 || (head && head.status === 404)) {
    const label = params.listingNumber ? 'Listing Not Found' : 'Not Found';
    const html = spliceHead(shell, { fullTitle: siteTitle ? `${label} | ${siteTitle}` : label, title: label, robots: 'noindex' });
    return respond(html ?? shell, 404, display === 404 ? 'B-404-check' : 'B-404-wp');
  }
  if (!head || head.status !== 200) return respond(shell, shellRes.status, 'B-open', head && head.error);

  const name = stripSiteName(head.title || '', siteTitle);
  let path = url.pathname;
  if (route.keys.includes('listingAddress') && name) {
    const want = addressSlug(name);
    if (want && want !== params.listingAddress) {
      const to = new URL(buildPath(route, { ...params, listingAddress: want }), url);
      to.search = url.search;
      return finish(new Response(null, { status: 301, headers: { location: to.href } }), 'B-301');
    }
    path = buildPath(route, params);
  }

  const html = spliceHead(shell, {
    fullTitle: name ? (siteTitle ? `${name} | ${siteTitle}` : name) : undefined,
    title: name || undefined,
    description: head.description || undefined,
    keywords: head.keywords || undefined,
    image: head.image || undefined,
    canonical: new URL(path, origin).href,
  });
  if (!html) return respond(shell, shellRes.status, 'B-open', 'no head marker');
  return respond(html, 200, 'B', display === 200 ? 'displayable' : undefined);
}
