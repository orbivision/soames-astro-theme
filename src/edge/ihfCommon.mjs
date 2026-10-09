// Optima Express edge — logic shared by the edge function and the head function (ORBI-82).
//
// Plain JS with no imports, because the build copies it verbatim into the generated Netlify
// functions (src/lib/ihfEdge.ts); it must run unchanged in Deno (edge), Node (function) and
// Node (local checks). Every function here is pure.

/** Where the edge splices head tags into a shell. Emitted by routes/ihf/[type].astro. */
export const HEAD_MARKER = '<!--soames:ihf-head-->';

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** One decoding pass: numeric, hex and the common named entities. */
export function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, e) => NAMED[e]);
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * WordPress's document title minus its " – Site Name" suffix. Matched against the KNOWN site
 * name, never "the last dash": wptexturize emits an in-address hyphen as the same &#8211; as the
 * separator (2600 GATTIS SCHOOL – A ROAD), and a site name may itself contain one.
 */
export function stripSiteName(title, siteName) {
  const t = decodeEntities(title || '').replace(/\s+/g, ' ').trim();
  const n = decodeEntities(siteName || '').replace(/\s+/g, ' ').trim();
  let out = t;
  if (n) {
    for (const sep of [' – ', ' — ', ' - ', ' | ']) {
      if (t.endsWith(sep + n)) {
        out = t.slice(0, -(sep + n).length);
        break;
      }
    }
  }
  // Optima Express title templates leave a dangling separator when a field is empty: the agent
  // template gave "Sally McSeller,  – Site" for an agent with no office (ORBI-82, 2026-10-09).
  return out.replace(/[\s,;:|–—-]+$/, '').trim();
}

/**
 * Optima Express's URL slug for an address. Verified 369/369 against live listing URLs
 * (ORBI-82 Phase 3 spike): non-alphanumeric runs → "-", trimmed, uppercased.
 */
export function addressSlug(address) {
  return String(address).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase();
}

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3]);
  }
  return out;
}

/**
 * The allowlisted head of a WordPress-rendered virtual page: title, description, keywords,
 * og:image. Nothing else crosses over — not robots, not JSON-LD (Kestrel writes its own; two
 * would conflict), not WordPress's own og:url.
 */
export function extractHead(html) {
  const head = (String(html).match(/<head[\s\S]*?<\/head>/i) || [String(html)])[0];
  const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const pick = (key, value) => metas.filter((a) => a[key] === value && a.content).map((a) => a.content.trim());
  return {
    title: title ? decodeEntities(title).trim() : null,
    description: pick('name', 'description')[0] || null,
    keywords: pick('name', 'keywords')[0] || null,
    // WordPress emits duplicates (seen ×3); one is all a head needs.
    image: pick('property', 'og:image')[0] || null,
  };
}

/** The JSON config every indexable shell carries (routes/ihf/[type].astro). */
export function readShellConfig(html) {
  const m = String(html).match(/<script type="application\/json" id="soames-ihf-config">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/**
 * Write a page's own head into a shell. Replaces the shell's generic title/description (and their
 * og:/twitter: twins) in place and adds the rest at the marker. Returns null when the shell has
 * no marker — the caller then serves it untouched.
 *
 * @param {string} html
 * @param {{ fullTitle?: string, title?: string, description?: string, keywords?: string,
 *           image?: string, canonical?: string, robots?: string }} h
 */
export function spliceHead(html, h) {
  if (!html.includes(HEAD_MARKER)) return null;
  let out = html;
  const setContent = (re, value) => {
    out = out.replace(re, (tag) => tag.replace(/content="[^"]*"/, `content="${escapeHtml(value)}"`));
  };
  if (h.fullTitle) out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(h.fullTitle)}</title>`);
  if (h.title) {
    setContent(/<meta property="og:title"[^>]*>/, h.title);
    setContent(/<meta name="twitter:title"[^>]*>/, h.title);
  }
  if (h.description) {
    setContent(/<meta name="description"[^>]*>/, h.description);
    setContent(/<meta property="og:description"[^>]*>/, h.description);
    setContent(/<meta name="twitter:description"[^>]*>/, h.description);
  }
  const add = [];
  if (h.robots) add.push(`<meta name="robots" content="${escapeHtml(h.robots)}">`);
  if (h.canonical) {
    add.push(`<link rel="canonical" href="${escapeHtml(h.canonical)}">`);
    add.push(`<meta property="og:url" content="${escapeHtml(h.canonical)}">`);
  }
  if (h.keywords) add.push(`<meta name="keywords" content="${escapeHtml(h.keywords)}">`);
  if (h.image) add.push(`<meta property="og:image" content="${escapeHtml(h.image)}">`);
  return out.replace(HEAD_MARKER, HEAD_MARKER + add.join(''));
}

/**
 * Compile the route table the build inlines: [{ type, pattern, keys, path }] where `pattern` is a
 * regex source with one group per key.
 */
export function compileRoutes(routes) {
  return routes.map((r) => ({ ...r, re: new RegExp(r.pattern) }));
}

export function matchRoute(compiled, pathname) {
  for (const r of compiled) {
    const m = pathname.match(r.re);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => {
      try {
        params[k] = decodeURIComponent(m[i + 1]);
      } catch {
        params[k] = m[i + 1];
      }
    });
    return { route: r, params };
  }
  return null;
}

/** A route's path with params filled in, always with the trailing slash Optima Express uses. */
export function buildPath(route, params) {
  const p = route.path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_, k) => encodeURIComponent(params[k] ?? ''));
  return p.endsWith('/') ? p : `${p}/`;
}

/** Fill `{name}` placeholders from `values`; unknown names become empty. */
export function fillTemplate(template, values) {
  return String(template).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, k) => encodeURIComponent(values[k] ?? ''));
}

/**
 * Experiment group (ORBI-82 D4). Listing URLs split by listing-number parity — even → B (edge
 * head), odd → A (client head writer only) — so the split is stable per listing and
 * reproducible from the URL alone. Everything without a listing number is B.
 */
export function groupFor(params, split) {
  if (!split) return 'B';
  const n = params.listingNumber;
  if (!n || !/\d$/.test(n)) return 'B';
  return Number(n.slice(-1)) % 2 === 0 ? 'B' : 'A';
}
