// src/utils/shortcodes/getAttributes.ts

export function getAttributes(match: RegExpMatchArray | null): Record<string, string[]> | null {
  if (!match || !match[1]) return null;

  const attributes: Record<string, string[]> = {};
  const attrString = match[1];

  const regex = /(\w+)=["']?((?:.(?!["']?\s+(?:\S+)=|\s*\/?[>"']))+.)["']?/g;
  let attrMatch;

  while ((attrMatch = regex.exec(attrString)) !== null) {
    const key = attrMatch[1];
    const value = attrMatch[2].replace(/[″”]+/g, '').split(',');
    attributes[key] = value;
  }

  return attributes;
}
