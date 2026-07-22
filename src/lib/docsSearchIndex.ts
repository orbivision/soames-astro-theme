// ORBI-50: build a small, static search index for the docs (Knowledge Base).
// All doc content is already fetched at build time (getDocs), so we derive a
// plain-text index here and emit it as /docs/search-index.json. The client
// (DocsSearch island) loads that JSON and searches it in-browser with MiniSearch —
// keeping Soames fully static (no runtime WordPress dependency).
import { docAncestors, type WpDoc } from "./wp";

export interface DocSearchRecord {
  /** databaseId — MiniSearch's document id. */
  id: number;
  title: string;
  uri: string;
  /** Ancestor titles joined by " › " (e.g. "Editor Guide"), for context in results. */
  breadcrumb: string;
  /** Plain-text excerpt. */
  excerpt: string;
  /** Plain-text article body (HTML stripped), capped to keep the index small. */
  text: string;
}

// Guard against a pathologically large doc bloating the index. KB articles are
// short; this cap is generous and never trims a normal article.
const MAX_TEXT = 50000;

// Strip HTML tags and decode the handful of entities WP emits, to plain text.
export function htmlToText(html: string): string {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&hellip;/gi, "…")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDocsSearchIndex(docs: WpDoc[]): DocSearchRecord[] {
  return docs.map((d) => ({
    id: d.databaseId,
    title: htmlToText(d.title),
    uri: d.uri,
    breadcrumb: docAncestors(docs, d.databaseId)
      .map((a) => htmlToText(a.title))
      .join(" › "),
    excerpt: htmlToText(d.excerpt),
    text: htmlToText(d.content).slice(0, MAX_TEXT),
  }));
}
