import React from "react";

interface SoamesTextBlockProps {
  content: string;
}

const SoamesTextBlock: React.FC<SoamesTextBlockProps> = ({ content }) => {
  const paragraphs = content?.split('__SOAMES_P__') ?? [];

  return (
    <section className="soames-section article soames-article">
      <div className="container col-md-10">
        <div className="inner-container" style={{ width: "100%" }}>
          <div className="section-text align-center mbr-fonts-style display-7 pb-2">
            {paragraphs.map((paragraph, key) => (
              <p key={key} className="block-text mbr-fonts-style display-7">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SoamesTextBlock;
