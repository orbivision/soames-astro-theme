import React, { ReactNode } from "react";
import parse, { domToReact, DOMNode, HTMLReactParserOptions, Element as DomElement } from "html-react-parser";

import { getAttributes } from "./getAttributes";
import { getContent } from "./getContent";

import RemoveContentAreaPadding from "./RemoveContentAreaPadding";
import SoamesTitle from "./SoamesTitle";
import SoamesTitleBar from "./SoamesTitleBar";
import SoamesTitleBarLg from "./SoamesTitleBarLg";
import SoamesTextBlock from "./SoamesTextBlock";
import SoamesIconList from "./SoamesIconList";
import SoamesFeature from "./SoamesFeature";
import SoamesGalleryMenu from "./SoamesGalleryMenu";
import SoamesVideo from "./SoamesVideo";
import SoamesTextList from "./SoamesTextList";
import SoamesSoundCloud from "./SoamesSoundCloud";

interface ShortcodesProps {
  // Astro passes slotted children as rendered nodes, not a raw string, so the
  // WP HTML comes in as an explicit `html` prop (only change for Astro).
  html: string;
}

type Attributes = {
  [key: string]: string[];
};

const handleShortcodes: HTMLReactParserOptions["replace"] = (node) => {
  if (node.type === "tag") {
    const classes = ((node as DomElement).attribs?.class ?? "").split(" ");
    const children = ((node as DomElement).children || []) as DOMNode[];
    const opts = { replace: handleShortcodes };

    // --- Gutenberg built-in block mappings ---

    if (classes.includes("wp-block-heading")) {
      return <SoamesTitle title={domToReact(children, opts)} />;
    }

    // Gutenberg paragraph blocks render as plain <p> tags (no wp-block-paragraph class in server HTML).
    // Skip paragraphs whose first child text starts with "[" — those are classic editor shortcodes.
    if ((node as DomElement).name === "p") {
      const firstChild = children[0] as any;
      const isShortcode = firstChild?.type === "text" && firstChild?.data?.trim().startsWith("[");
      if (!isShortcode) {
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

    if (classes.includes("wp-block-soames-icon-list")) {
      const attrs = (node as DomElement).attribs;
      // ORBI-20: new blocks emit JSON `data-items`; old blocks/shortcodes use
      // positional comma attrs. Prefer items, fall back to the legacy arrays.
      if (attrs["data-items"]) {
        try {
          const items = JSON.parse(attrs["data-items"]);
          if (Array.isArray(items)) return <SoamesIconList items={items} />;
        } catch {
          /* malformed JSON — fall through to legacy parsing below */
        }
      }
      const csv = (key: string) => (attrs[key] ?? "").split(",");
      return (
        <SoamesIconList
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
                        <p className="block-text mbr-fonts-style display-7">
                          {domToReact(children, opts)}
                        </p>
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
      // ORBI-20: prefer JSON `data-items`, fall back to legacy comma attrs.
      if (attrs["data-items"]) {
        try {
          const items = JSON.parse(attrs["data-items"]);
          if (Array.isArray(items)) return <SoamesGalleryMenu items={items} />;
        } catch {
          /* malformed JSON — fall through to legacy parsing below */
        }
      }
      const csv = (key: string) => (attrs[key] ?? "").split(",");
      return (
        <SoamesGalleryMenu
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

  return undefined;
};

const Shortcodes: React.FC<ShortcodesProps> = ({ html }) => {
  const reactElements = parse(html || "", {
    replace: handleShortcodes,
  });

  return <div>{reactElements}</div>;
};

export { Shortcodes };
export default Shortcodes;
