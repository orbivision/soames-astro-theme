// ORBI-50: client-side docs search. Lazily loads the prerendered
// /docs/search-index.json on first focus, builds a MiniSearch index in the
// browser, and shows a results dropdown. Fully static — no runtime WordPress
// call. Rendered as a hydrated island (client:idle) atop the docs sidebar and
// the /docs landing.
import React, { useEffect, useRef, useState } from "react";
import MiniSearch from "minisearch";
import type { DocSearchRecord } from "../lib/docsSearchIndex";

const INDEX_URL = "/docs/search-index.json";
const MAX_RESULTS = 8;

type Result = DocSearchRecord & { score: number };

const DocsSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loaded, setLoaded] = useState(false);

  const miniRef = useRef<MiniSearch<DocSearchRecord> | null>(null);
  const loadingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Build the MiniSearch index once, on first interaction.
  const ensureIndex = async () => {
    if (miniRef.current || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await fetch(INDEX_URL, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`index ${res.status}`);
      const records: DocSearchRecord[] = await res.json();
      const mini = new MiniSearch<DocSearchRecord>({
        fields: ["title", "breadcrumb", "excerpt", "text"],
        storeFields: ["title", "uri", "breadcrumb", "excerpt"],
        searchOptions: {
          prefix: true,
          fuzzy: 0.2,
          boost: { title: 3, breadcrumb: 1.5, excerpt: 2 },
        },
      });
      mini.addAll(records);
      miniRef.current = mini;
    } catch {
      // Leave miniRef null — search stays inert rather than throwing.
    } finally {
      loadingRef.current = false;
      setLoaded(true);
    }
  };

  const runSearch = (q: string) => {
    const mini = miniRef.current;
    if (!mini || !q.trim()) {
      setResults([]);
      return;
    }
    const hits = mini.search(q).slice(0, MAX_RESULTS) as unknown as Result[];
    setResults(hits);
    setActive(hits.length ? 0 : -1);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    runSearch(q);
  };

  const go = (r: Result) => {
    if (r?.uri) window.location.href = r.uri;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && active >= 0 && results[active]) {
        e.preventDefault();
        go(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const showEmpty = open && loaded && query.trim().length > 0 && results.length === 0;

  return (
    <div className="soames-docs-search" ref={rootRef}>
      <input
        type="search"
        className="soames-docs-search-input"
        placeholder="Search the docs…"
        aria-label="Search documentation"
        role="combobox"
        aria-expanded={open}
        aria-controls="soames-docs-search-results"
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onFocus={ensureIndex}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        <ul className="soames-docs-search-results" id="soames-docs-search-results" role="listbox">
          {results.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === active}
              className={`soames-docs-search-result${i === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                // mousedown (before input blur) so the click isn't lost.
                e.preventDefault();
                go(r);
              }}
            >
              <span className="soames-docs-search-title">{r.title}</span>
              {r.breadcrumb && <span className="soames-docs-search-crumb">{r.breadcrumb}</span>}
              {r.excerpt && <span className="soames-docs-search-excerpt">{r.excerpt}</span>}
            </li>
          ))}
        </ul>
      )}
      {showEmpty && (
        <ul className="soames-docs-search-results" role="listbox">
          <li className="soames-docs-search-empty">No matching articles.</li>
        </ul>
      )}
    </div>
  );
};

export default DocsSearch;
