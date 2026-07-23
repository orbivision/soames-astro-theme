// ORBI-51 — build-time localization of WordPress images (Phase 1).
//
// Pure rewrite half: maps WP-hosted image URLs to a deterministic local path
// (`/wp-media/<hash>.<ext>`) and records the mapping in a process-global registry.
// No I/O beyond hashing — safe to call from synchronous render (Shortcodes,
// HeroHeader) because the local path is deterministic and needs no file to exist
// yet. The download half (localizeDownload.ts) drains the registry in the
// integration's `astro:build:done` hook.
//
// State lives on globalThis so the module is a singleton across Astro's main
// process (integration hooks) AND the Vite SSR module graph (routes → lib/wp),
// which may otherwise instantiate the module twice.
import crypto from "node:crypto";
import path from "node:path";

const OUT_SUBDIR = "wp-media";
// Match a URL and bound it at HTML/attribute delimiters. Two wrinkles:
//   1. Block `data-items` carry JSON with every slash escaped (`https:\/\/…\/x.jpg`),
//      so a path segment is either a literal `\/` or a normal path char — the
//      alternation below matches both plain and JSON-escaped URLs.
//   2. `&` is a delimiter so entity-encoded JSON (`…&quot;https:\/\/…&quot;…`)
//      yields a clean URL token. Trade-off: a WP image URL with a multi-param
//      query string (`?a=1&b=2`) truncates at `&` and won't localize (degrades to
//      the original URL — WP core upload URLs carry no query string).
const URL_RE = /https?:(?:\\\/|[^\s"'()<>,&\\])+/gi;
const IMG_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?)$/i;

export interface LocalizeState {
  enabled: boolean;
  hosts: Set<string>;
  // remoteUrl → local path (`/wp-media/<hash>.<ext>`)
  registry: Map<string, string>;
}

function state(): LocalizeState {
  const g = globalThis as unknown as { __soamesLocalize?: LocalizeState };
  if (!g.__soamesLocalize) {
    g.__soamesLocalize = {
      enabled: false,
      hosts: new Set<string>(),
      registry: new Map<string, string>(),
    };
  }
  return g.__soamesLocalize;
}

// Called once from the integration's config:setup. Enabled only on `astro build`
// (dev passes WP URLs through so editors still see live WP edits on refresh).
export function configureLocalizer(opts: { enabled: boolean; hosts: string[] }): void {
  const s = state();
  s.enabled = opts.enabled;
  opts.hosts.forEach((h) => h && s.hosts.add(h.toLowerCase()));
}

export function getRegistry(): Map<string, string> {
  return state().registry;
}

function imageExt(pathname: string): string {
  const ext = path.extname(pathname).toLowerCase();
  return IMG_EXT_RE.test(ext) ? ext : "";
}

// Rewrite a single URL to its local path, or return it unchanged when: the
// localizer is disabled, the value isn't an absolute http(s) URL, the host isn't
// a configured WP host, or the URL has no recognizable image extension (we won't
// localize what we can't be sure to serve with the right content-type).
export function localizeUrl(url: string | null | undefined): string | null | undefined {
  const s = state();
  if (!s.enabled) return url;
  if (!url || typeof url !== "string") return url;
  if (!/^https?:\/\//i.test(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!s.hosts.has(parsed.hostname.toLowerCase())) return url;

  const ext = imageExt(parsed.pathname);
  if (!ext) return url;

  const existing = s.registry.get(url);
  if (existing) return existing;

  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  const local = `/${OUT_SUBDIR}/${hash}${ext}`;
  s.registry.set(url, local);
  return local;
}

// Rewrite every WP image URL inside a content HTML string — covers inline
// `<img src>`, every `srcset` candidate, block `data-image`/`data-images`
// (CSV)/`data-items` (JSON), and inline `style="…url(…)"`. Non-WP and non-image
// URLs (page links, third-party embeds) pass through untouched via localizeUrl.
export function localizeHtml(html: string | null | undefined): string {
  const s = state();
  if (!s.enabled || !html) return html ?? "";
  return html.replace(URL_RE, (m) => {
    // JSON-escaped URLs (`https:\/\/…`) arrive with literal `\/`. Unescape to a
    // real URL for localizeUrl, then re-escape the local path back to `\/` form so
    // the surrounding JSON stays valid. Plain URLs pass through untouched.
    const escaped = m.includes("\\/");
    const clean = escaped ? m.replace(/\\\//g, "/") : m;
    const local = localizeUrl(clean);
    if (local === clean) return m; // not a localizable WP image — keep verbatim
    return escaped ? (local as string).replace(/\//g, "\\/") : (local as string);
  });
}
