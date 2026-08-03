import React, { ReactNode } from "react";

interface SoamesCoreBlockProps {
  children: ReactNode;
}

/**
 * Container for a built-in WordPress block on a Soames page (ORBI-59).
 *
 * Pages run WP content through the "marketing" transform in Shortcodes.tsx, which wrapped
 * only headings and paragraphs. Every other core block — lists, tables, buttons, images,
 * quotes, groups — fell through as raw HTML into `.soames-gatsby-content`, which sets padding
 * but no max-width. So they spanned the whole viewport while the text beside them sat in a
 * Bootstrap container, and they rendered at the browser's default 1rem instead of the Soames
 * body size of 1.2rem (`display-7`).
 *
 * This reuses the SAME `container col-md-10` the paragraph transform uses, so the widths line
 * up by construction rather than by a magic number that could drift from it.
 *
 * Text is left-aligned, deliberately unlike the centered paragraph treatment: centered list
 * items and table cells are hard to read, and lists are the main thing this affects.
 */
const SoamesCoreBlock: React.FC<SoamesCoreBlockProps> = ({ children }) => {
  return (
    <section className="soames-section article soames-core-block">
      <div className="container col-md-10">
        <div className="inner-container" style={{ width: "100%" }}>
          {/* display-7 carries the Soames body font (Rubik 1.2rem); descendants inherit it,
              which is why the block's own elements don't each need a rule. */}
          <div className="section-text mbr-fonts-style display-7">{children}</div>
        </div>
      </div>
    </section>
  );
};

export default SoamesCoreBlock;
