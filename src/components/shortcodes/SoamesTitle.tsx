// PORTED VERBATIM from soames-gatsby-theme/src/components/shortcodes/SoamesTitle.tsx
import React from "react";

interface SoamesTitleProps {
  title: React.ReactNode;
}

const SoamesTitle: React.FC<SoamesTitleProps> = ({ title }) => {
  return (
    <section className="soames-section soames-title">
      <div className="container">
        <div className="media-container-row">
          <div className="title col-12 col-md-8">
            <h2 className="align-center mbr-fonts-style display-2">
              {title}
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SoamesTitle;
