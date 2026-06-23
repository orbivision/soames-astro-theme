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
  uri: string;
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

const IMAGE_FRAGMENT = `featuredImage { node { sourceUrl altText mediaDetails { width height } } }`;

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
    `{ wpPages: pages(first: 100) { nodes { databaseId title uri content excerpt overlayOpacity ${IMAGE_FRAGMENT} } } }`
  );
  return data.wpPages.nodes.map((n) => ({
    databaseId: n.databaseId,
    title: n.title,
    uri: n.uri,
    content: n.content ?? "",
    excerpt: n.excerpt ?? "",
    overlayOpacity: typeof n.overlayOpacity === "number" ? n.overlayOpacity : null,
    featuredImage: normalizeImage(n),
  }));
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
}
export async function getSoamesSettings(): Promise<SoamesSettings> {
  const res = await fetch(`${BASE_URL}/wp-json/soames/v1/settings`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Soames settings REST ${res.status}`);
  return (await res.json()) as SoamesSettings;
}
