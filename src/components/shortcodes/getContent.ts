// PORTED VERBATIM from soames-gatsby-theme/src/utils/shortcodes/getContent.ts
export function getContent(match: RegExpMatchArray | null): string | null {
  return match && match[2] ? match[2] : null;
}
