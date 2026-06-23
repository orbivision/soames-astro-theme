import React from "react";

interface SoamesTitleBarLgProps {
  title: React.ReactNode;
  attributes: {
    subtitle?: string[];
    background?: string[];
  };
}

const SoamesTitleBarLg: React.FC<SoamesTitleBarLgProps> = ({ title, attributes }) => {
  const subtitle = attributes?.subtitle?.[0];
  const background = attributes?.background?.[0];
  const defaultBackground = 'https://picsum.photos/1080/720';

  const css = `
    .soames-background-title-bar-lg::after {
      background: url(${background || defaultBackground});
      background-position: 50% 50%;
      background-size: cover;
      background-attachment: fixed;
      background-repeat: no-repeat;
      left: 0px;
      height: 176px;
      overflow: hidden;
      pointer-events: none;
      margin-top: 0px;
      transform: translate3d(0px, 0px, 0px);
    }
  `;

  return (
    <>
      <style>{css}</style>
      <section className="soames-header-sm soames-parallax soames-background-title-bar-lg mt-5 mb-3">
        <div className="soames-overlay" style={{ opacity: 0.6, backgroundColor: 'rgb(46, 46, 46)' }}></div>
        <div className="container">
          <div className="row justify-content-md-center">
            <div className="soames-white col-md-10">
              <h1 className="soames-section-title align-center soames-bold mbr-fonts-style display-1">
                {title}
              </h1>
              {subtitle && (
                <h3 className="soames-section-subtitle align-center soames-light soames-white mbr-fonts-style display-5">
                  {subtitle}
                </h3>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SoamesTitleBarLg;
