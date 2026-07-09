// ORBI-24 spike — WordPress sourcing layer for Astro (replaces gatsby-source-wordpress).
//
// Finding: this WP install's Wordfence WAF 403-blocks GraphQL POST bodies whose
// FIRST selection-set field is `posts`/`pages` (the literal `{ posts`/`{ pages`).
// Aliasing the root field (e.g. `wpPages: pages`) dodges the rule. GET also works.
// This is a server-config quirk that affects ANY client (incl. Gatsby) equally.

const GRAPHQL_URL =
  import.meta.env.WORDPRESS_GRAPHQL_URL || "http://soames.orbivision.net/graphql";
const BASE_URL =
  import.meta.env.WORDPRESS_BASE_URL || "http://soames.orbivision.net";

// A browser-ish UA — Wordfence also 403s some default UAs.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function wpQuery<T>(query: string): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`WPGraphQL ${res.status} for query: ${query.slice(0, 60)}…`);
  }
  const json = (await res.json()) as { data: T; errors?: unknown };
  if (json.errors) throw new Error(`WPGraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

export interface WpImage {
  sourceUrl: string;
  altText: string;
  width?: number;
  height?: number;
}
export interface WpPage {
  databaseId: number;
  title: string;
  // null for the assigned "Posts page" (WP serves the blog at its URL, so
  // WPGraphQL returns no page uri) — callers must guard before using it.
  uri: string | null;
  slug: string;
  isPostsPage: boolean;
  isFrontPage: boolean;
  content: string;
  excerpt: string;
  overlayOpacity: number | null;
  featuredImage: WpImage | null;
}
export interface WpAuthor {
  firstName: string | null;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
}
export interface WpPost {
  databaseId: number;
  title: string;
  slug: string;
  uri: string;
  date: string;
  excerpt: string;
  content: string;
  featuredImage: WpImage | null;
  author: WpAuthor | null;
}

// weDocs documentation custom post type, exposed to WPGraphQL by the Soames WP
// plugin (Document/Documents). weDocs is OPTIONAL — see getDocs().
export interface WpDoc {
  databaseId: number;
  title: string;
  slug: string;
  uri: string;
  content: string;
  excerpt: string;
  menuOrder: number;
  parentDatabaseId: number; // 0 when top-level
  featuredImage: WpImage | null;
}
export interface DocTreeNode extends WpDoc {
  children: DocTreeNode[];
}

const IMAGE_FRAGMENT = `featuredImage { node { sourceUrl altText mediaDetails { width height } } }`;

// overlayOpacity arrives from WPGraphQL as a String ("0.4") or, defensively, a
// number. Coerce to a finite number; null when missing/unparseable so callers
// fall back to the HeroHeader default (0.6).
function parseOverlayOpacity(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function normalizeImage(node: any): WpImage | null {
  const n = node?.featuredImage?.node;
  if (!n?.sourceUrl) return null;
  return {
    sourceUrl: n.sourceUrl,
    altText: n.altText ?? "",
    width: n.mediaDetails?.width,
    height: n.mediaDetails?.height,
  };
}

export async function getPages(): Promise<WpPage[]> {
  // NOTE the alias `wpPages:` — required to pass Wordfence.
  const data = await wpQuery<{ wpPages: { nodes: any[] } }>(
    `{ wpPages: pages(first: 100) { nodes { databaseId title uri slug isPostsPage isFrontPage content excerpt overlayOpacity ${IMAGE_FRAGMENT} } } }`
  );
  return data.wpPages.nodes.map((n) => ({
    databaseId: n.databaseId,
    title: n.title,
    uri: n.uri ?? null,
    slug: n.slug ?? "",
    isPostsPage: !!n.isPostsPage,
    isFrontPage: !!n.isFrontPage,
    content: n.content ?? "",
    excerpt: n.excerpt ?? "",
    // The plugin's WPGraphQL `overlayOpacity` field is typed String (e.g. "0.4"),
    // so parse it to a number; null (→ HeroHeader default 0.6) if absent/invalid.
    overlayOpacity: parseOverlayOpacity(n.overlayOpacity),
    featuredImage: normalizeImage(n),
  }));
}

// The page assigned as Settings > Reading > "Posts page" (where the blog lives),
// or null if none is set. Drives the blog's base URL (its slug) and hero (its
// title + featured image + overlay). Derived from getPages, which already fetches
// these fields.
export interface WpPostsPage {
  databaseId: number;
  slug: string;
  title: string;
  featuredImage: WpImage | null;
  overlayOpacity: number | null;
}
export async function getPostsPage(): Promise<WpPostsPage | null> {
  const pp = (await getPages()).find((p) => p.isPostsPage);
  if (!pp) return null;
  return {
    databaseId: pp.databaseId,
    slug: pp.slug,
    title: pp.title,
    featuredImage: pp.featuredImage,
    overlayOpacity: pp.overlayOpacity,
  };
}

// The page chosen in Soames Settings → Documentation page, or null if none is
// set. Drives the /docs/ landing hero (title + subhead + featured image +
// overlay) — parity with getPostsPage() for the blog roll. The chosen page's ID
// comes from the Soames REST settings (docsPageId); the hero fields come from
// getPages. Decoupled from the GraphQL schema on purpose: an older plugin simply
// omits docsPageId (→ null), so /docs/ falls back to its default hero and the
// rest of the site is unaffected. Any failure degrades to null, never throws.
export interface WpDocsPage {
  databaseId: number;
  title: string;
  excerpt: string;
  featuredImage: WpImage | null;
  overlayOpacity: number | null;
}
export async function getDocsPage(): Promise<WpDocsPage | null> {
  try {
    const settings = await getSoamesSettings();
    const id = settings.docsPageId;
    if (!id) return null;
    const dp = (await getPages()).find((p) => p.databaseId === id);
    if (!dp) return null;
    return {
      databaseId: dp.databaseId,
      title: dp.title,
      excerpt: dp.excerpt,
      featuredImage: dp.featuredImage,
      overlayOpacity: dp.overlayOpacity,
    };
  } catch (err) {
    console.warn(
      "[soames] getDocsPage: could not resolve the docs hero page — using default hero.",
      (err as Error).message
    );
    return null;
  }
}

export async function getPosts(): Promise<WpPost[]> {
  const data = await wpQuery<{ wpPosts: { nodes: any[] } }>(
    `{ wpPosts: posts(first: 100) { nodes { databaseId title slug uri date excerpt content ${IMAGE_FRAGMENT}
        author { node { firstName name description avatar { url } } } } } }`
  );
  return data.wpPosts.nodes.map((n) => {
    const a = n.author?.node;
    return {
      databaseId: n.databaseId,
      title: n.title,
      slug: n.slug,
      uri: n.uri,
      date: n.date,
      excerpt: n.excerpt ?? "",
      content: n.content ?? "",
      featuredImage: normalizeImage(n),
      author: a
        ? {
            firstName: a.firstName ?? null,
            name: a.name ?? null,
            description: a.description ?? null,
            avatarUrl: a.avatar?.url ?? null,
          }
        : null,
    };
  });
}

// Documentation (weDocs `docs` CPT → GraphQL `documents`). OPTIONAL: weDocs may
// not be installed, in which case the `documents` field isn't in the schema and
// the query errors — we treat that as "no docs" and return [] so sites without
// documentation build normally. Aliased `wpDocs:` to dodge Wordfence (see top).
export async function getDocs(): Promise<WpDoc[]> {
  try {
    // Our docs CPT (registered by the Soames plugin) supports excerpts, so
    // `excerpt` is a field on the Document type — used for the /docs/ card grid.
    const data = await wpQuery<{ wpDocs: { nodes: any[] } }>(
      `{ wpDocs: documents(first: 200) { nodes { databaseId title slug uri content excerpt menuOrder parentDatabaseId ${IMAGE_FRAGMENT} } } }`
    );
    return data.wpDocs.nodes.map((n) => ({
      databaseId: n.databaseId,
      title: n.title,
      slug: n.slug,
      uri: n.uri,
      content: n.content ?? "",
      excerpt: n.excerpt ?? "",
      menuOrder: n.menuOrder ?? 0,
      parentDatabaseId: n.parentDatabaseId ?? 0,
      featuredImage: normalizeImage(n),
    }));
  } catch (err) {
    console.warn(
      "[soames] getDocs: `documents` unavailable (weDocs not installed?) — rendering no docs.",
      (err as Error).message
    );
    return [];
  }
}

// Turn the flat doc list into an ordered hierarchy (sort by menuOrder then title,
// nest by parentDatabaseId) for the docs sidebar nav.
export function buildDocTree(docs: WpDoc[]): DocTreeNode[] {
  const byId = new Map<number, DocTreeNode>();
  docs.forEach((d) => byId.set(d.databaseId, { ...d, children: [] }));
  const roots: DocTreeNode[] = [];
  byId.forEach((node) => {
    const parent = node.parentDatabaseId ? byId.get(node.parentDatabaseId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (arr: DocTreeNode[]) => {
    arr.sort((a, b) => a.menuOrder - b.menuOrder || a.title.localeCompare(b.title));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

// Walk the parentDatabaseId chain up from a doc, returning its ancestors in
// root→parent order (excluding the doc itself). Used for breadcrumbs. Derives
// from the data, not the URI, because slugs don't always match titles and we
// need each ancestor's title as well as its uri. The depth cap guards against a
// malformed cycle in parentDatabaseId.
export function docAncestors(docs: WpDoc[], databaseId: number): WpDoc[] {
  const byId = new Map<number, WpDoc>(docs.map((d) => [d.databaseId, d]));
  const chain: WpDoc[] = [];
  let current = byId.get(databaseId);
  let guard = 0;
  while (current && current.parentDatabaseId && guard++ < 50) {
    const parent = byId.get(current.parentDatabaseId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

export async function getGeneralSettings(): Promise<{ title: string; description: string }> {
  const data = await wpQuery<{ generalSettings: { title: string; description: string } }>(
    `{ generalSettings { title description } }`
  );
  return data.generalSettings;
}

// WP "Reading settings" → posts-per-page, drives blog archive pagination
// (parity with gatsby-node.js readingSettings.postsPerPage).
export async function getPostsPerPage(): Promise<number> {
  try {
    const data = await wpQuery<{ readingSettings: { postsPerPage: number } }>(
      `{ readingSettings { postsPerPage } }`
    );
    return data.readingSettings?.postsPerPage || 10;
  } catch {
    return 10;
  }
}

export async function getPostBySlug(slug: string): Promise<WpPost | null> {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

// --- Navigation menus (parity with allWpMenu + locations HEADER/FOOTER) ---
export interface MenuChild {
  id: string;
  label: string;
  uri: string;
  order: number;
}
export interface MenuItem extends MenuChild {
  path: string;
  parentDatabaseId: number;
  childItems: MenuChild[];
}

// Returns top-level items (with their children) for a registered menu location
// e.g. "HEADER" / "FOOTER". `menus` is not WAF-blocked, so no aliasing needed.
export async function getMenuByLocation(location: string): Promise<MenuItem[]> {
  const data = await wpQuery<{ menus: { nodes: any[] } }>(
    `{ menus(first: 20) { nodes { locations menuItems(first: 100) { nodes {
        id label path uri parentDatabaseId order
        childItems { nodes { id label uri order } }
      } } } } }`
  );
  const menu = data.menus.nodes.find((m) => (m.locations ?? []).includes(location));
  const nodes: any[] = menu?.menuItems?.nodes ?? [];
  return nodes
    .filter((n) => n.parentDatabaseId === 0)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((n) => ({
      id: n.id,
      label: n.label,
      path: n.path,
      uri: n.uri,
      parentDatabaseId: n.parentDatabaseId,
      order: n.order,
      childItems: (n.childItems?.nodes ?? []).sort(
        (a: MenuChild, b: MenuChild) => (a.order ?? 0) - (b.order ?? 0)
      ),
    }));
}

// Soames plugin settings via the REST endpoint (same source the Gatsby theme uses
// in gatsby-node.js sourceNodes — companyName, logo, contactBlurb, etc.).
export interface SoamesSettings {
  logoUrl: string | null;
  logoAlt: string | null;
  faviconUrl: string | null;
  contactBlurb: string | null;
  companyName: string | null;
  showCompanyName: boolean;
  // Page ID chosen in Soames Settings → Documentation page (drives the /docs/
  // hero). null when unset, or undefined against an older plugin that predates
  // this field — getDocsPage() treats both as "no docs page".
  docsPageId?: number | null;
}
export async function getSoamesSettings(): Promise<SoamesSettings> {
  const res = await fetch(`${BASE_URL}/wp-json/soames/v1/settings`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Soames settings REST ${res.status}`);
  return (await res.json()) as SoamesSettings;
}
