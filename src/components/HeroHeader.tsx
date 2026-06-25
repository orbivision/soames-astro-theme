// PORTED from soames-gatsby-theme HeroHeader.tsx. Change for Astro: title/subhead
// come in as HTML strings and are run through html-react-parser here (the Gatsby
// page template parsed them before passing). Parallax/overlay markup UNCHANGED.
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

  // The hero bg is drawn on .soames-parallax::after (position:absolute; inset:0;
  // z-index:-1 — confined to the hero box). We deliberately do NOT set
  // position:fixed here: a fixed layer escapes the hero to fill <main>'s viewport
  // and, inside main's `perspective` scroll container, gets composited OVER page
  // content (the hero bg "bleeds" across the page on hover repaints). Instead we
  // keep it absolute/inset, neutralize the parallax scale via translate3d(0,0,0),
  // and get the parallax feel from `background-attachment: fixed` — clipped to the
  // hero box, so it can never render below the hero. Mirrors SoamesTitleBarLg.
  const css = `
    .soames-background-lg::after {
      background: url(${bg});
      background-position: 50% 50%;
      background-size: cover;
      background-attachment: fixed;
      background-repeat: no-repeat;
      top: 0px;
      right: 0px;
      bottom: 0px;
      left: 0px;
      overflow: hidden;
      pointer-events: none;
      margin-top: 0px;
      transform: translate3d(0px, 0px, 0px);
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
              <div className="soames-section-subtitle align-center soames-light soames-white mbr-fonts-style display-5">
                {subhead ? parse(subhead) : ""}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroHeader;
