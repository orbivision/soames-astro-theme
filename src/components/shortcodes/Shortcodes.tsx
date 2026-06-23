// PORTED from soames-gatsby-theme/src/utils/shortcodes/Shortcodes.tsx
// Trimmed to the subset of mappings exercised by this spike (heading, title-bar,
// paragraph). The parsing engine (html-react-parser + domToReact + replace) and
// the mapping logic are COPIED UNCHANGED — note there is NO Gatsby import here,
// so the real file ports to Astro as-is. This runs as a React island.
import React from "react";
import parse, {
  domToReact,
  DOMNode,
  HTMLReactParserOptions,
  Element as DomElement,
} from "html-react-parser";

import SoamesTitle from "./SoamesTitle";
import SoamesTitleBar from "./SoamesTitleBar";

interface ShortcodesProps {
  // In the real Gatsby theme this was `children: string`. Astro passes slotted
  // children as rendered nodes, not a raw string, so we take the HTML as an
  // explicit prop. (Only change required to the parser for Astro.)
  html: string;
}

const handleShortcodes: HTMLReactParserOptions["replace"] = (node) => {
  if (node.type === "tag") {
    const classes = ((node as DomElement).attribs?.class ?? "").split(" ");
    const children = ((node as DomElement).children || []) as DOMNode[];
    const opts = { replace: handleShortcodes };

    // --- Gutenberg built-in block mappings ---
    if (classes.includes("wp-block-heading")) {
      return <SoamesTitle title={domToReact(children, opts)} />;
    }

    // Gutenberg paragraph blocks render as plain <p> tags.
    if ((node as DomElement).name === "p") {
      const firstChild = children[0] as any;
      const isShortcode =
        firstChild?.type === "text" && firstChild?.data?.trim().startsWith("[");
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
  }

  return undefined;
};

const Shortcodes: React.FC<ShortcodesProps> = ({ html }) => {
  const reactElements = parse(html || "", { replace: handleShortcodes });
  return <div>{reactElements}</div>;
};

export default Shortcodes;
