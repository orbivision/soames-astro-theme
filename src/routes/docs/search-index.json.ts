// ORBI-50: prerendered static search index for the docs. Emitted to
// /docs/search-index.json at build; the DocsSearch island fetches it lazily and
// searches in-browser. Static output — no runtime WordPress call.
import type { APIRoute } from "astro";
import { getDocs } from "../../lib/wp";
import { buildDocsSearchIndex } from "../../lib/docsSearchIndex";

export const prerender = true;

export const GET: APIRoute = async () => {
  const docs = await getDocs();
  const index = buildDocsSearchIndex(docs);
  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json" },
  });
};
