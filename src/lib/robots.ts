// robots.txt, merged into whatever the site shipped in public/robots.txt — never overwritten, and
// never a rule the caller didn't ask for. ORBI-82 wrote it for Optima Express only; since ORBI-89
// every site with `siteUrl` gets at least its own sitemap line.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface RobotsAdditions {
  /** Paths to disallow for every user agent. */
  disallow?: string[];
  /** Absolute sitemap URLs. */
  sitemaps?: string[];
}

/**
 * Append what's missing. A site with no robots.txt and nothing to disallow gets a file holding
 * only `Sitemap:` lines, which permits everything, exactly as no file does — so adding one
 * changes no crawl rules.
 */
export async function writeRobots(distDir: string, { disallow = [], sitemaps = [] }: RobotsAdditions): Promise<void> {
  const file = path.join(distDir, 'robots.txt');
  let existing = '';
  try {
    existing = await fs.readFile(file, 'utf8');
  } catch {
    /* no site robots.txt */
  }
  const lines = existing.split('\n').map((l) => l.trim());
  let out = existing;
  const append = (text: string) => {
    const sep = out && !out.endsWith('\n') ? '\n' : '';
    out = `${out}${sep}${out ? '\n' : ''}${text}`;
  };
  // Its own group, so it can't be scoped into a site's bot-specific group by accident.
  const rules = disallow.map((p) => `Disallow: ${p}`).filter((l) => !lines.includes(l));
  if (rules.length) append(`User-agent: *\n${rules.join('\n')}\n`);
  // `Sitemap:` lines stand outside any group and must be absolute URLs (ORBI-82 Phase 4).
  const missing = sitemaps.map((u) => `Sitemap: ${u}`).filter((l) => !lines.includes(l));
  if (missing.length) append(`${missing.join('\n')}\n`);
  if (out !== existing) await fs.writeFile(file, out);
}
