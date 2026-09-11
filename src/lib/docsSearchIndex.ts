// ORBI-50: build a small, static search index for the docs (Knowledge Base).
// All doc content is already fetched at build time (getDocs), so we derive a
// plain-text index here and emit it as /docs/search-index.json. The client
// (DocsSearch island) loads that JSON and searches it in-browser with MiniSearch —
// keeping Soames fully static (no runtime WordPress dependency).
import { docAncestors, type WpDoc } from "./wp";
// htmlToText moved to ./text in ORBI-68 — the meta-description path needs it too.
import { htmlToText } from "./text";

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
