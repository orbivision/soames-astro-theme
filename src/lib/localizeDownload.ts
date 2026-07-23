// ORBI-51 — build-time localization of WordPress images (Phase 1).
//
// Download half: drains the registry populated by localizeImages.ts during render
// and writes each WP image into the built output (`dist/wp-media/`). Runs from the
// integration's `astro:build:done` hook (main process, never client). Imported
// ONLY by integration.ts so its `node:fs` use never reaches lib/wp's module graph.
import fs from "node:fs/promises";
import path from "node:path";

import { getRegistry } from "./localizeImages.js";

const CONCURRENCY = 8;
const TIMEOUT_MS = 15000;

interface Logger {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
}

async function fetchToFile(url: string, dest: string, ua: string): Promise<void> {
  const attempt = async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": ua },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) throw new Error("empty body");
      await fs.writeFile(dest, buf);
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    await attempt();
  } catch {
    await attempt(); // retry once; a second failure propagates to the caller
  }
}

async function walkHtml(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walkHtml(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

// Download every registered WP image into <outDir>/wp-media/. On a per-image
// failure (404, timeout, empty body) the image is skipped with a warning and its
// deterministic local path is reverted to the original WP URL across the emitted
// HTML — so a broken/unreachable image degrades to today's behavior (a live WP
// reference) rather than a dangling local path. WP-down-at-build still fails the
// build earlier, at the GraphQL fetch (inherent to headless-static; out of scope).
export async function downloadImages(
  outDir: string,
  ua: string,
  log?: Logger
): Promise<void> {
  const entries = [...getRegistry().entries()];
  if (!entries.length) return;

  const mediaDir = path.join(outDir, "wp-media");
  await fs.mkdir(mediaDir, { recursive: true });

  const failed = new Map<string, string>(); // url → local
  let ok = 0;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ([url, local]) => {
        const dest = path.join(outDir, local.replace(/^\//, ""));
        try {
          await fetchToFile(url, dest, ua);
          ok++;
        } catch (err) {
          failed.set(url, local);
          log?.warn?.(
            `image localize skipped ${url}: ${(err as Error).message} (kept live WP URL)`
          );
        }
      })
    );
  }

  // Revert failed local paths back to their live WP URLs in the emitted HTML.
  if (failed.size) {
    const files = await walkHtml(outDir);
    for (const f of files) {
      let html = await fs.readFile(f, "utf8");
      let changed = false;
      for (const [url, local] of failed) {
        if (html.includes(local)) {
          html = html.split(local).join(url);
          changed = true;
        }
      }
      if (changed) await fs.writeFile(f, html);
    }
  }

  log?.info?.(
    `localized ${ok} WordPress image(s)${
      failed.size ? `, ${failed.size} skipped (kept live)` : ""
    } → /wp-media/`
  );
}
