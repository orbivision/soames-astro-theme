// Shared blog date formatter (ORBI-48). Used by the blog post header, the archive
// cards, and the Recent Posts sidebar so every blog date reads identically
// (e.g. "June 15, 2026"). Single source of truth — keep formatting changes here.
export const formatPostDate = (d: string): string =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
