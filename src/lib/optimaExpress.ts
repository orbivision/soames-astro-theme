// Optima Express (IDX) support — ORBI-82.
//
// Optima Express renders its "virtual pages" (listing detail, search results, market
// reports, agents, …) through Kestrel, a client-side script that routes on
// location.pathname alone: every virtual-page type has the identical body. So a static
// site needs one shell per type and a rewrite from each URL pattern to its shell, plus the
// Kestrel loader on any page that embeds an Optima Express widget.
//
// Everything comes from the Soames plugin's soames/v1/settings payload (`optimaExpress`),
// which is null unless Optima Express is active AND registered on the WordPress site — so
// for every other site this module is inert and the build output is unchanged.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface OptimaExpressRoute {
  /** Optima Express's ihf-type, e.g. "idx-detail". */
  type: string;
  /** Netlify-style path pattern, e.g. "/homes-for-sale-details/:listingAddress/:listingNumber/:boardId". */
  path: string;
}

export interface OptimaExpressSettings {
  /** Soames supports "kestrel" only; anything else builds no shells. */
  mode: 'kestrel' | 'kestrel-detail' | 'legacy' | 'unknown';
  kestrel: { activationToken: string; platform: string };
  routes: OptimaExpressRoute[];
  skippedRules: number;
  /** Soames Settings → Optima Express page: supplies the landing types' hero. null = none chosen. */
  heroPageId?: number | null;
}

/** Only Kestrel-for-every-page works statically; legacy mode needs a request-time server. */
export function isKestrel(oe: OptimaExpressSettings | null | undefined): oe is OptimaExpressSettings {
  return !!oe && oe.mode === 'kestrel';
}

/** Rendered WordPress content embeds an Optima Express widget. */
export function usesKestrel(html: string | null | undefined): boolean {
  return !!html && html.includes('ihfKestrel.render');
}

// Types whose URLs are stable and carry content worth indexing (ORBI-82 decision C): a
// listing, a saved market search, an agent. Everything else — accounts, saved-search
// management, form submissions, search forms, arbitrary result sets — ships `noindex`.
// An allowlist on purpose: a type Optima Express adds later stays out of the index until
// someone decides it belongs there.
const INDEXABLE = new Set([
  'idx-detail',
  'idx-sold-detail',
  'idx-featured-search',
  'idx-sold-featured-listing',
  'idx-pending-featured-listing',
  'idx-supplemental-listing',
  'idx-hotsheets',
  'idx-hotsheets-list',
  'idx-hotsheet-open-home-report',
  'idx-hotsheet-market-report',
  'idx-agent-detail',
  'idx-agent-list',
  'idx-office-detail',
  'idx-office-list',
  'idx-mls-portal-agent',
  'idx-mls-portal-agent-list',
  'idx-mls-portal-agent-list-last-name-starts-with',
  'idx-mls-portal-office',
  'idx-mls-portal-office-list',
  'idx-mls-portal-board-list-name-starts-with',
]);

export function isIndexable(type: string): boolean {
  return INDEXABLE.has(type);
}

/** Shell directory for a type. The type is already URL-safe ("idx-detail"). */
export const SHELL_BASE = '/_ihf';
export function shellPath(type: string): string {
  return `${SHELL_BASE}/${type}/`;
}

// Heading per page type: the hero/title-bar text and the fallback <title>. A static shell
// can't use Optima Express's own title templates — they interpolate listing data
// ({listingAddress}) that only exists at request time — so detail pages get a generic heading.
const TITLES: Record<string, string> = {
  'idx-search': 'Search Homes',
  'idx-advanced-search': 'Advanced Search',
  'idx-map-search': 'Map Search',
  'idx-results': 'Search Results',
  'idx-featured-search': 'Featured Listings',
  'idx-sold-featured-listing': 'Sold Listings',
  'idx-pending-featured-listing': 'Pending Listings',
  'idx-supplemental-listing': 'More Listings',
  'idx-open-home-search-form': 'Open Homes',
  'idx-hotsheets-list': 'Market Reports',
  'idx-hotsheets': 'Listing Report',
  'idx-hotsheet-open-home-report': 'Open Home Report',
  'idx-hotsheet-market-report': 'Market Report',
  'idx-agent-list': 'Our Agents',
  'idx-office-list': 'Our Offices',
  'idx-mls-portal-agent-list': 'Agent Directory',
  'idx-mls-portal-agent-list-last-name-starts-with': 'Agent Directory',
  'idx-mls-portal-office-list': 'Office Directory',
  'idx-mls-portal-board-list-name-starts-with': 'Office Directory',
  'idx-mls-portal-agent-search': 'Find an Agent',
  'idx-mls-portal-office-search': 'Find an Office',
  'idx-detail': 'Listing Details',
  'idx-sold-detail': 'Sold Listing',
  'idx-agent-detail': 'Agent',
  'idx-office-detail': 'Office',
  'idx-mls-portal-agent': 'Agent',
  'idx-mls-portal-office': 'Office',
  'idx-contact-form': 'Contact Us',
  'idx-valuation-form': 'Home Valuation',
  'idx-mortgage-calculator': 'Mortgage Calculator',
  'idx-property-organizer-edit-saved-search': 'Email Alerts',
};

/** Heading and fallback <title> for a shell. Unknown or account types get a readable default. */
export function shellTitle(type: string): string {
  if (TITLES[type]) return TITLES[type];
  if (type.startsWith('idx-property-organizer')) return 'Property Organizer';
  const words = type.replace(/^idx-/, '').split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Landing types get the full hero; every other type (listing and agent detail, forms, account
// pages) gets a slim title bar. A hero above a listing would push the price and photos below the
// fold, where neither visitors nor crawlers look first.
const HERO_TYPES = new Set([
  'idx-search',
  'idx-advanced-search',
  'idx-map-search',
  'idx-results',
  'idx-featured-search',
  'idx-sold-featured-listing',
  'idx-pending-featured-listing',
  'idx-supplemental-listing',
  'idx-open-home-search-form',
  'idx-hotsheets-list',
  'idx-hotsheets',
  'idx-hotsheet-open-home-report',
  'idx-hotsheet-market-report',
  'idx-agent-list',
  'idx-office-list',
  'idx-mls-portal-agent-list',
  'idx-mls-portal-agent-list-last-name-starts-with',
  'idx-mls-portal-office-list',
  'idx-mls-portal-board-list-name-starts-with',
  'idx-mls-portal-agent-search',
  'idx-mls-portal-office-search',
]);

export function isHeroType(type: string): boolean {
  return HERO_TYPES.has(type);
}

/** Unique types, in first-seen (WordPress rule) order. */
export function shellTypes(oe: OptimaExpressSettings): string[] {
  return [...new Set(oe.routes.map((r) => r.type))];
}

const BEGIN = '# BEGIN soames-astro-theme: Optima Express (generated — do not edit)';
const END = '# END soames-astro-theme: Optima Express';

/** The _redirects block: a 200 rewrite from every virtual-page pattern to its type's shell. */
export function redirectsBlock(oe: OptimaExpressSettings): string {
  const lines = oe.routes.map((r) => `${r.path}  ${shellPath(r.type)}  200`);
  return [BEGIN, ...lines, END].join('\n') + '\n';
}

/**
 * Write the rewrites into dist/_redirects, MERGING with whatever the site shipped in
 * public/_redirects (never overwriting it). Site rules come first so they keep priority;
 * Netlify matches top-down. Not forced, so a real static page at the same path wins —
 * each such collision is reported, because on WordPress Optima Express's `top` rewrite
 * rules would have won instead.
 */
export async function writeRedirects(
  distDir: string,
  oe: OptimaExpressSettings,
  logger: { info(m: string): void; warn(m: string): void },
): Promise<void> {
  const file = path.join(distDir, '_redirects');
  let existing = '';
  try {
    existing = await fs.readFile(file, 'utf8');
  } catch {
    /* no site _redirects */
  }
  const stripped = existing.replace(new RegExp(`${escape(BEGIN)}[\\s\\S]*?${escape(END)}\\n?`), '');
  const sep = stripped && !stripped.endsWith('\n') ? '\n' : '';
  await fs.writeFile(file, stripped + sep + redirectsBlock(oe));

  for (const r of oe.routes) {
    if (r.path.includes(':')) continue;
    try {
      await fs.access(path.join(distDir, r.path, 'index.html'));
      logger.warn(`Optima Express route ${r.path} is shadowed by a static page at the same path; the page wins on Netlify (on WordPress, Optima Express would).`);
    } catch {
      /* no collision */
    }
  }
  logger.info(`Optima Express: ${oe.routes.length} rewrite(s) → ${shellTypes(oe).length} shell(s) in _redirects`);
  if (oe.skippedRules > 0) {
    logger.warn(`Optima Express: ${oe.skippedRules} rewrite rule(s) weren't in a translatable shape and have no static route.`);
  }
}

/**
 * Keep the shells themselves out of search results WITHOUT a noindex. The same HTML is
 * served for every real listing URL through the rewrites, so a noindex in it would
 * deindex every listing. Disallow blocks only fetches OF /_ihf/ URLs.
 */
export async function writeRobots(distDir: string): Promise<void> {
  const file = path.join(distDir, 'robots.txt');
  let existing = '';
  try {
    existing = await fs.readFile(file, 'utf8');
  } catch {
    /* no site robots.txt */
  }
  const rule = `Disallow: ${SHELL_BASE}/`;
  if (existing.split('\n').some((l) => l.trim() === rule)) return;
  const sep = existing && !existing.endsWith('\n') ? '\n' : '';
  // Its own group, so it can't be scoped into a site's bot-specific group by accident.
  await fs.writeFile(file, `${existing}${sep}${existing ? '\n' : ''}User-agent: *\n${rule}\n`);
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
