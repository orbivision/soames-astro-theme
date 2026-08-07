import React from "react";

// ORBI-63: the full-width gray header band — an icon tile beside a title / subtitle /
// meta stack. Renders the markup the Resume page previously hand-wrote as a raw
// `<section class="soames-section soames-section-subhead">`, so it reuses the theme's
// existing `.soames-section-subhead` (#eee band) and `.media-wrap-icon` (white tile)
// rules and needs no CSS of its own.
//
// The Bootstrap utility classes below are deliberately verbatim from that hand-written
// markup — a converted row has to land pixel-identical to the one it replaces. The only
// thing dropped is the per-section `contentN` id/class, which was a mobirise-era anchor
// carrying no styling of its own.
//
// Rendering this as a block (rather than leaving it as raw HTML) is what restores the
// full-width band: ORBI-59's core-block fallback boxes unmapped top-level elements into
// the content column, but skips anything classed `wp-block-soames-*`.

interface SoamesIconHeaderProps {
  image?: string;
  title?: string;
  subtitle?: string;
  meta?: string;
}

const SoamesIconHeader: React.FC<SoamesIconHeaderProps> = ({
  image,
  title,
  subtitle,
  meta,
}) => (
  <section className="soames-section soames-section-subhead">
    <div className="container">
      <div className="media-container-row">
        <div className="media-wrap media-wrap-icon pt-5 pe-3 pb-5 ps-3">
          {image && <img src={image} alt={title || ""} />}
        </div>
        <div className="title col-12 col-md-8 pb-5">
          <h2 className="align-left pt-5 pb-4 ps-3 mbr-fonts-style">{title}</h2>
          <h3 className="align-left ps-3">{subtitle}</h3>
          <h5 className="align-left ps-3">{meta}</h5>
        </div>
      </div>
    </div>
  </section>
);

export default SoamesIconHeader;
