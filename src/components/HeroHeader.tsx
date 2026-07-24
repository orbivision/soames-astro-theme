// PORTED from soames-gatsby-theme HeroHeader.tsx. Change for Astro: title/subhead
// come in as HTML strings and are run through html-react-parser here (the Gatsby
// page template parsed them before passing). Parallax/overlay markup UNCHANGED.
//
// ORBI-52: callers now source `title`/`subhead` from the dedicated WP hero fields
// via resolveHeroTitle()/resolveHeroCaption(), not from the page title/excerpt.
// `subhead` is optional in the real sense now — most heroes won't have one.
import React from "react";
import parse from "html-react-parser";

export interface HeroHeaderProps {
  title: string;
  subhead?: string | null;
  backgroundImage?: string | null;
  overlayOpacity?: number | null;
}

const HeroHeader: React.FC<HeroHeaderProps> = ({
  title,
  subhead,
  backgroundImage,
  overlayOpacity,
}) => {
  const bg = backgroundImage || "https://picsum.photos/1080/720";
  const opacity = overlayOpacity ?? 0.6;

  const css = `
    .soames-background-lg::after {
      background: url(${bg});
      background-position: 50% 50%;
      background-size: cover;
      background-repeat: no-repeat;
      position: fixed;
      top: 0px;
      left: 0px;
      overflow: hidden;
      pointer-events: none;
      margin-top: -180px;
    }
  `;

  return (
    <>
      <style>{css}</style>
      <section
        className="soames-header-lg soames-parallax soames-background-lg"
        id="header1"
      >
        <div
          className="soames-overlay"
          style={{ opacity, backgroundColor: "rgb(46, 46, 46)" }}
        />
        <div className="container">
          <div className="row justify-content-md-center">
            <div className="soames-hero-header soames-white col-md-10">
              <h1 className="soames-section-title align-center soames-bold mbr-fonts-style display-1">
                {parse(title || "")}
              </h1>
              {/* ORBI-52: the caption comes from a dedicated WP field with no
                  fallback, so an unset caption omits this element entirely rather
                  than rendering it empty. */}
              {subhead ? (
                <div className="soames-section-subtitle align-center soames-light soames-white mbr-fonts-style display-5">
                  {parse(subhead)}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroHeader;
