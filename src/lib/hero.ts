// Hero resolvers, split out of lib/wp (ORBI-85) so the client-side preview island can use the
// SAME rules as the build: lib/wp imports node-only modules (localizeImages → node:crypto) and
// can't ship to a browser. lib/wp re-exports these, so existing imports are unchanged.

// Resolve the hero backdrop URL from a page (or posts/docs page): the dedicated
// hero background image wins, then the featured image, then null (→ HeroHeader
// applies its picsum placeholder). Single source of truth for levels 1→2 of the
// ORBI-41 fallback chain; level 3 (picsum) lives in HeroHeader.
export function resolveHeroBg(
  page:
    | { heroBackgroundImage?: string | null; featuredImage?: { sourceUrl: string } | null }
    | null
    | undefined
): string | null {
  return page?.heroBackgroundImage ?? page?.featuredImage?.sourceUrl ?? null;
}

// Resolve the hero title (ORBI-52): the dedicated hero-title setting wins, then
// the page/post title (backwards compatibility with the pre-ORBI-52 behaviour),
// then the caller's template default ("Blog", "Documentation"). The fallback lives
// here, not in the plugin resolver, so every consumer shares one rule.
export function resolveHeroTitle(
  page: { heroTitle?: string | null; title?: string | null } | null | undefined,
  fallback = ""
): string {
  return page?.heroTitle || page?.title || fallback;
}

// Resolve the hero caption (ORBI-52): the dedicated setting ONLY. Deliberately no
// excerpt fallback — an unset caption returns null and HeroHeader then omits the
// subtitle element entirely rather than rendering it empty.
export function resolveHeroCaption(
  page: { heroCaption?: string | null } | null | undefined
): string | null {
  return page?.heroCaption || null;
}
