// Plain-text helpers shared by anything that has to turn WordPress HTML into
// text. WP hands us HTML in places that must not contain markup — excerpts used
// as meta descriptions (ORBI-68), and doc bodies used as a search index
// (ORBI-50). Both want the same conversion, so it lives in one place; two
// tag-strippers drifting apart is a worse defect than the one this fixes.

/**
 * Strip HTML tags and decode the handful of entities WP emits, to plain text.
 *
 * Regex-based, not a parser: fine for WP excerpts and post bodies, and it would
 * mangle markup with a `>` inside an attribute value. That trade has been
 * shipping in the docs search index since ORBI-50 on the same class of input.
 */
export function htmlToText(html: string): string {
  return (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    // Named entities WP emits. `&amp;` must come first or `&amp;lt;` double-decodes.
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&hellip;/gi, "…")
    // Decoded here but stripped below: `&lt;show&gt;` should read as "show", not as
    // literal "&lt;show&gt;" in a search result.
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&[lr]squo;/gi, (m) => (m[1].toLowerCase() === "l" ? "\u2018" : "\u2019"))
    .replace(/&[lr]dquo;/gi, (m) => (m[1].toLowerCase() === "l" ? "\u201c" : "\u201d"))
    // Numeric entities, decoded generically. WP emits these constantly — a bare
    // `&#8217;` (curly apostrophe) was reaching the output before ORBI-68, because
    // only `&#39;` was special-cased.
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => codePoint(parseInt(hex, 16), m))
    .replace(/&#(\d+);/g, (m, dec) => codePoint(parseInt(dec, 10), m))
    // Drop any angle bracket still standing, LAST — after every decode. `&lt;code&gt;`
    // would otherwise decode into real-looking `<code>`, which is worse than the raw
    // markup this function exists to remove: it satisfies nothing and trips the
    // "contains no HTML" assertion in soames-site's e2e suite. A plain-text meta
    // description has no use for them either way.
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Decode one numeric entity, leaving anything out-of-range as it was found. */
function codePoint(n: number, original: string): string {
  if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return original;
  // Lone surrogates would throw.
  if (n >= 0xd800 && n <= 0xdfff) return original;
  try {
    return String.fromCodePoint(n);
  } catch {
    return original;
  }
}

/**
 * Roughly what Google renders of a meta description. WP excerpts are ~55 words,
 * well past this, and get cut by consumers anyway — just not gracefully.
 */
export const META_DESCRIPTION_MAX = 160;

/**
 * Trim to `max` characters on a word boundary, with a trailing ellipsis. The
 * result never exceeds `max`.
 *
 * Must run AFTER htmlToText, never before: cutting a raw HTML string and then
 * decoding can slice `&hellip;` in half and emit a literal `&hel`.
 */
export function truncateAtWord(text: string, max = META_DESCRIPTION_MAX): string {
  const trimmed = (text || "").trim();
  if (trimmed.length <= max) return trimmed;
  // -1 leaves room for the ellipsis itself.
  const cut = trimmed.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  // A single word longer than the cap has no boundary to break on — hard-cut it.
  const body = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return body.replace(/[\s,;:.!?-]+$/, "") + "…";
}
