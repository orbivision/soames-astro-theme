import React, { ReactNode } from "react";
import { domToReact, htmlToDOM, DOMNode, HTMLReactParserOptions, Element as DomElement } from "html-react-parser";

import { getAttributes } from "./getAttributes";
import { getContent } from "./getContent";

import RemoveContentAreaPadding from "./RemoveContentAreaPadding";
import SoamesTitle from "./SoamesTitle";
import SoamesTitleBar from "./SoamesTitleBar";
import SoamesTitleBarLg from "./SoamesTitleBarLg";
import SoamesIconHeader from "./SoamesIconHeader";
import SoamesTextBlock from "./SoamesTextBlock";
import SoamesIconList from "./SoamesIconList";
import SoamesFeature from "./SoamesFeature";
import SoamesGalleryMenu from "./SoamesGalleryMenu";
import SoamesVideo from "./SoamesVideo";
import SoamesTextList from "./SoamesTextList";
import SoamesSoundCloud from "./SoamesSoundCloud";
import SoamesCoreBlock from "./SoamesCoreBlock";

interface ShortcodesProps {
  // Astro passes slotted children as rendered nodes, not a raw string, so the
  // WP HTML comes in as an explicit `html` prop (only change for Astro).
  html: string;
  // Prose mode (docs/blog bodies): render Gutenberg headings/paragraphs as plain,
  // left-aligned HTML instead of the centered, padded marketing transform.
  prose?: boolean;
}

// Set per-render in <Shortcodes>. Safe as a module-level flag because parse()
// runs synchronously (no async boundary, single-threaded SSR/render), so one
// parse completes before another begins.
let proseMode = false;

type Attributes = {
  [key: string]: string[];
};

const handleShortcodes: HTMLReactParserOptions["replace"] = (node) => {
  if (node.type === "tag") {
    const classes = ((node as DomElement).attribs?.class ?? "").split(" ");
    const children = ((node as DomElement).children || []) as DOMNode[];
    const opts = { replace: handleShortcodes };

    // --- Gutenberg built-in block mappings ---

    // A run of consecutive paragraphs, grouped by groupParagraphRuns() before parsing. One
    // section for the whole run, so paragraphs sit a paragraph apart rather than a section
    // apart (ORBI-93). Must be claimed here: it is a top-level node, so the generic core-block
    // fallback at the bottom would otherwise wrap it.
    if ((node as DomElement).name === "div" && classes.includes(PARAGRAPH_RUN_CLASS)) {
      const paragraphs = children.filter((c): c is DomElement => c.type === "tag");
      return (
        <section className={`soames-section article soames-article ${PARAGRAPH_RUN_CLASS}`}>
          <div className="container col-md-10">
            <div className="inner-container" style={{ width: "100%" }}>
              <div className="section-text align-center mbr-fonts-style display-7 pb-2">
                {paragraphs.map((p, i) => (
                  <p key={i} className="block-text mbr-fonts-style display-7">
                    {domToReact(p.children as DOMNode[], opts)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (classes.includes("wp-block-heading")) {
      if (proseMode) return undefined; // keep the plain <h2>/<h3>, left-aligned
      return <SoamesTitle title={domToReact(children, opts)} />;
    }

    // Gutenberg paragraph blocks render as plain <p> tags (no wp-block-paragraph class in server HTML).
    // Skip paragraphs whose first child text starts with "[" — those are classic editor shortcodes.
    if ((node as DomElement).name === "p") {
      if (!isShortcodeParagraph(node as DomElement)) {
        if (proseMode) return undefined; // keep the plain <p>, left-aligned
        return (
          <section className="soames-section article soames-article">
            <div className="container col-md-10">
              <div className="inner-container" style={{ width: "100%" }}>
                <div className="section-text align-center mbr-fonts-style display-7 pb-2">
                  <p className="block-text mbr-fonts-style display-7">
                    {domToReact(children, opts)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        );
      }
    }

    // --- Custom Soames block mappings ---

    if (classes.includes("wp-block-soames-title-bar")) {
      return <SoamesTitleBar title={domToReact(children, opts)} />;
    }

    if (classes.includes("wp-block-soames-title-bar-lg")) {
      const attrs = (node as DomElement).attribs;
      return (
        <SoamesTitleBarLg
          title={attrs["data-title"] ?? ""}
          attributes={{
            subtitle: [attrs["data-subtitle"] ?? ""],
            background: [attrs["data-background"] ?? ""],
          }}
        />
      );
    }

    // ORBI-63: full-width gray header band (icon + title/subtitle/meta).
    if (classes.includes("wp-block-soames-icon-header")) {
      const attrs = (node as DomElement).attribs;
      return (
        <SoamesIconHeader
          image={attrs["data-image"] ?? ""}
          title={attrs["data-title"] ?? ""}
          subtitle={attrs["data-subtitle"] ?? ""}
          meta={attrs["data-meta"] ?? ""}
        />
      );
    }

    if (classes.includes("wp-block-soames-icon-list")) {
      const attrs = (node as DomElement).attribs;
      // ORBI-49: block-level image size (small|medium|large), default small.
      const size = (attrs["data-size"] as "small" | "medium" | "large") || "small";
      // ORBI-20: new blocks emit JSON `data-items`; old blocks/shortcodes use
      // positional comma attrs. Prefer items, fall back to the legacy arrays.
      if (attrs["data-items"]) {
        try {
          const items = JSON.parse(attrs["data-items"]);
          if (Array.isArray(items)) return <SoamesIconList items={items} size={size} />;
        } catch {
          /* malformed JSON — fall through to legacy parsing below */
        }
      }
      const csv = (key: string) => (attrs[key] ?? "").split(",");
      return (
        <SoamesIconList
          size={size}
          attributes={{
            images: csv("data-images"),
            labels: csv("data-labels"),
            links: csv("data-links"),
            css: csv("data-css"),
          }}
        />
      );
    }

    if (classes.includes("wp-block-soames-feature")) {
      const attrs = (node as DomElement).attribs;
      const image = attrs["data-image"];
      const title = attrs["data-title"];
      const css = attrs["data-css"];
      return (
        <section className="soames-features">
          <div className="container">
            <div className="col-md-12">
              <div className="media-container-row">
                <div className="align-left aside-content">
                  {title && (
                    <h2 className="mbr-title pt-2 mbr-fonts-style display-2">
                      <div>{title}</div>
                    </h2>
                  )}
                  <div className="block-content">
                    <div className={`card ${css ?? ""}`}>
                      <div className="media"><div className="media-body"></div></div>
                      <div className="card-box">
                        <div className="block-text mbr-fonts-style display-7">
                          {domToReact(children, opts)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {image && (
                  <div className="soames-figure" style={{ width: "50%" }}>
                    <img src={image} alt={title ?? "Feature"} title={title ?? "Feature"} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (classes.includes("wp-block-soames-gallery-menu")) {
      const attrs = (node as DomElement).attribs;
      // ORBI-44: "compact" fits 4 per row; anything else defaults to "standard".
      const layout = attrs["data-layout"] === "compact" ? "compact" : "standard";
      // ORBI-20: prefer JSON `data-items`, fall back to legacy comma attrs.
      if (attrs["data-items"]) {
        try {
          const items = JSON.parse(attrs["data-items"]);
          if (Array.isArray(items))
            return <SoamesGalleryMenu items={items} layout={layout} />;
        } catch {
          /* malformed JSON — fall through to legacy parsing below */
        }
      }
      const csv = (key: string) => (attrs[key] ?? "").split(",");
      return (
        <SoamesGalleryMenu
          layout={layout}
          attributes={{
            images: csv("data-images"),
            labels: csv("data-labels"),
            links: csv("data-links"),
            css: csv("data-css"),
          }}
        />
      );
    }

    if (classes.includes("wp-block-soames-video")) {
      const attrs = (node as DomElement).attribs;
      return (
        <SoamesVideo
          attributes={{
            link: attrs["data-link"] ?? "",
            title: attrs["data-title"] ?? "",
          }}
        />
      );
    }

    if (classes.includes("wp-block-soames-soundcloud")) {
      const attrs = (node as DomElement).attribs;
      return (
        <SoamesSoundCloud
          attributes={{
            bandName:   attrs["data-band-name"]   ?? "",
            siteLink:   attrs["data-site-link"]   ?? "",
            playlistId: attrs["data-playlist-id"] ?? "",
            albumLink:  attrs["data-album-link"]  ?? "",
            albumName:  attrs["data-album-name"]  ?? "",
          }}
        />
      );
    }

    if (classes.includes("wp-block-soames-text-list")) {
      const attrs = (node as DomElement).attribs;
      // ORBI-42: new blocks emit JSON `data-items` (one HTML chunk per list item).
      // Old blocks emit their inner HTML directly — keep rendering that as-is.
      if (attrs["data-items"]) {
        try {
          const items = JSON.parse(attrs["data-items"]);
          if (Array.isArray(items)) return <SoamesTextList items={items} />;
        } catch {
          /* malformed JSON — fall through to the legacy passthrough below */
        }
      }
      return (
        <section className="soames-section article soames-list pb-0">
          <div className="container">
            <div className="media-container-row">
              <div className="soames-text counter-container col-12 col-md-10 mbr-fonts-style pt-0 display-7">
                {domToReact(children, opts)}
              </div>
            </div>
          </div>
        </section>
      );
    }

    // --- Legacy text shortcode detection (unchanged) ---
  }
  if (node.type === "tag" && node.children && node.children.length > 0) {
    const child = node.children[0];
    if (child.type === "text") {
      const shortcode = child.data.trim();

      if (shortcode === "[soames-remove-content-area-padding]") {
        return <RemoveContentAreaPadding />;
      }

      const shortcodeMappings: {
        regex: RegExp;
        component: React.FC<any>;
        propsExtractor: (match: RegExpMatchArray) => any;
      }[] = [
        {
          regex: /\[soames-title([^\]]*)\]([\s\S]*?)\[\/soames-title\]/,
          component: SoamesTitle,
          propsExtractor: (match) => ({ title: getContent(match) }),
        },
        {
          regex: /\[soames-title-bar([^\]]*)\]([\s\S]*?)\[\/soames-title-bar\]/,
          component: SoamesTitleBar,
          propsExtractor: (match) => ({ title: getContent(match) }),
        },
        {
          regex: /\[soames-title-bar-lg([^\]]*)\]([\s\S]*?)\[\/soames-title-bar-lg\]/,
          component: SoamesTitleBarLg,
          propsExtractor: (match) => ({
            title: getContent(match),
            attributes: getAttributes(match),
          }),
        },
        {
          regex: /\[soames-text-block([^\]]*)\]([\s\S]*?)\[\/soames-text-block\]/,
          component: SoamesTextBlock,
          propsExtractor: (match) => ({ content: getContent(match) }),
        },
        {
          regex: /\[soames-text-list([^\]]*)\]([\s\S]*?)\[\/soames-text-list\]/,
          component: SoamesTextList,
          propsExtractor: (match) => ({ content: getContent(match) }),
        },
        {
          regex: /\[soames-icon-list([^\]]*)\]/,
          component: SoamesIconList,
          propsExtractor: (match) => ({ attributes: getAttributes(match) }),
        },
        {
          regex: /\[soames-feature([^\]]*)\]([\s\S]*?)\[\/soames-feature\]/,
          component: SoamesFeature,
          propsExtractor: (match) => ({
            content: getContent(match),
            attributes: getAttributes(match),
          }),
        },
        {
          regex: /\[soames-gallery-menu([^\]]*)\]/,
          component: SoamesGalleryMenu,
          propsExtractor: (match) => ({ attributes: getAttributes(match) }),
        },
        {
          regex: /\[soames-video([^\]]*)\]/,
          component: SoamesVideo,
          propsExtractor: (match) => ({ attributes: getAttributes(match) }),
        },
        {
          regex: /\[soames-soundcloud([^\]]*)\]/,
          component: SoamesSoundCloud,
          propsExtractor: (match) => ({ attributes: getAttributes(match) }),
        },
      ];

      for (const { regex, component: Component, propsExtractor } of shortcodeMappings) {
        const match = shortcode.match(regex);
        if (match) {
          const props = propsExtractor(match);
          return <Component {...props} />;
        }
      }
    }
  }

  // --- Built-in WordPress blocks: constrain and re-typeset (ORBI-59) ---
  //
  // LAST on purpose. Everything above has had its chance to claim this node, so whatever
  // reaches here is a block the transform has no specific mapping for: lists, tables,
  // buttons, images, quotes, groups, separators, embeds. Those used to pass straight through
  // as raw HTML into `.soames-gatsby-content`, which sets padding but no max-width — so they
  // ran the full width of the viewport while the surrounding text sat in a Bootstrap
  // container, at the browser's default 1rem rather than the Soames 1.2rem body size.
  if (!proseMode && shouldWrapCoreBlock(node)) {
    // Re-render the node ITSELF (not just its children) so the block's own element and
    // classes survive — `.wp-block-table`'s <figure> still needs them to be styled.
    //
    // The inner replace has to short-circuit on `node`, or this recurses forever: the node's
    // parent is still null on the way back through, so shouldWrapCoreBlock would match it
    // again and wrap again. Returning undefined for it means "render this element as-is",
    // and its children are then walked with these same options — by which point they DO have
    // a parent, so they can't be wrapped either.
    return (
      <SoamesCoreBlock>
        {domToReact([node], {
          replace: (inner) => (inner === node ? undefined : handleShortcodes(inner)),
        })}
      </SoamesCoreBlock>
    );
  }

  return undefined;
};

// Elements that must never be given a layout container, either because they aren't visible
// content or because wrapping them would break what they do.
const NEVER_WRAP_TAGS = new Set(["style", "script", "template", "noscript", "link", "meta"]);

/**
 * Whether this node is an unhandled built-in block that needs the Soames content container.
 *
 * TOP-LEVEL ONLY, and that restriction is the whole trick. `replace` runs for every node the
 * parser walks, including the children we hand back to domToReact — so without this a
 * `wp-block-buttons` would be wrapped, then its inner `wp-block-button` wrapped again, and so
 * on down. Nodes parsed at the top level of the WP content have no parent; anything reached
 * through recursion does. Since the wrapper re-parses the node itself, this check is also
 * what stops that call recursing infinitely.
 */
function shouldWrapCoreBlock(node: DOMNode): boolean {
  if (node.type !== "tag") return false;
  const el = node as DomElement;
  if (el.parent) return false; // nested — its top-level ancestor already got wrapped
  if (NEVER_WRAP_TAGS.has(el.name)) return false;

  const classes = (el.attribs?.class ?? "").split(" ");
  // Soames blocks are full-width sections by design and bring their own containers.
  if (classes.some((c) => c.startsWith("wp-block-soames-"))) return false;
  // Honour WordPress's own opt-out: alignfull/alignwide mean "break out of the column".
  if (classes.includes("alignfull") || classes.includes("alignwide")) return false;

  return true;
}

const PARAGRAPH_RUN_CLASS = "soames-paragraph-run";

// A classic-editor shortcode arrives as a <p> whose text starts with "[" — not a paragraph.
function isShortcodeParagraph(el: DomElement): boolean {
  const first = el.children?.[0] as any;
  return first?.type === "text" && !!first.data?.trim().startsWith("[");
}

const isPlainParagraph = (n: DOMNode): n is DomElement =>
  n.type === "tag" && (n as DomElement).name === "p" && !isShortcodeParagraph(n as DomElement);

// Whitespace between blocks (WP puts "\n\n" between every one) must not end a run, or the
// grouping would never match real content. Comments are skipped for the same reason.
const isSeparator = (n: DOMNode): boolean =>
  n.type === "comment" || (n.type === "text" && !(n as any).data.trim());

/**
 * Groups each run of two or more consecutive sibling paragraphs into one synthetic
 * `div.soames-paragraph-run`, which handleShortcodes renders as a single section (ORBI-93).
 *
 * Without this every paragraph became its own section, and two in a row sat ~102px apart:
 * the paragraph's 32px margin + 8px `.pb-2` + the section's 30px bottom padding + the next
 * section's 32px top padding. A lone paragraph is left exactly as it was, so pages without
 * consecutive paragraphs render byte-identical. Anything else — a heading, image, list,
 * Soames block or shortcode paragraph — ends a run.
 *
 * Applied at EVERY depth, not just the top level: the paragraph handler fires on any <p>,
 * including those a content-inlining block (Soames Feature) hands back through domToReact,
 * so a run inside a Feature stacked the same 102px.
 */
function groupParagraphRuns(nodes: DOMNode[], parent: DomElement | null = null): DOMNode[] {
  for (const n of nodes) {
    if (n.type === "tag" && (n as DomElement).name !== "p") {
      const el = n as DomElement;
      el.children = groupParagraphRuns(el.children as DOMNode[], el) as typeof el.children;
    }
  }
  const out: DOMNode[] = [];
  let i = 0;
  while (i < nodes.length) {
    if (!isPlainParagraph(nodes[i])) {
      out.push(nodes[i++]);
      continue;
    }
    // Collect paragraphs, looking past separators, until something else appears.
    const run: DomElement[] = [nodes[i] as DomElement];
    let j = i + 1;
    let end = i + 1; // index after the last paragraph taken
    while (j < nodes.length) {
      if (isSeparator(nodes[j])) { j++; continue; }
      if (!isPlainParagraph(nodes[j])) break;
      run.push(nodes[j] as DomElement);
      end = ++j;
    }
    if (run.length < 2) {
      out.push(nodes[i++]);
      continue;
    }
    const wrapper = new DomElement("div", { class: PARAGRAPH_RUN_CLASS }, run);
    wrapper.parent = parent; // same level as the paragraphs it replaces (null = top level)
    run.forEach((p, k) => {
      p.parent = wrapper;
      p.prev = run[k - 1] ?? null;
      p.next = run[k + 1] ?? null;
    });
    out.push(wrapper);
    i = end; // separators after the last paragraph are kept as they were
  }
  return out;
}

const Shortcodes: React.FC<ShortcodesProps> = ({ html, prose = false }) => {
  proseMode = !!prose;
  // parse() is htmlToDOM + domToReact; it's split here so marketing mode can regroup
  // paragraph runs in between. Same parser options as parse()'s default.
  const dom = html ? htmlToDOM(html, { lowerCaseAttributeNames: false }) : [];
  const reactElements = domToReact(proseMode ? dom : groupParagraphRuns(dom), {
    replace: handleShortcodes,
  });
  proseMode = false;

  return <div>{reactElements}</div>;
};

export { Shortcodes };
export default Shortcodes;
