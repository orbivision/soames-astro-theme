// PORTED from soames-gatsby-theme Logo.tsx. Change: useStaticQuery(soamesSettings)
// → props supplied by the layout at build time (Astro has no useStaticQuery).
import React from "react";

interface LogoProps {
  title: string;
  logoUrl?: string | null;
  logoAlt?: string | null;
  companyName?: string | null;
  showCompanyName?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  title,
  logoUrl = null,
  logoAlt = null,
  companyName = null,
  showCompanyName = true,
}) => {
  const displayName = companyName || title;
  const alt = logoAlt || title;

  return (
    <div className="menu-logo">
      <div className="navbar-brand">
        <span className="navbar-caption-wrap">
          <a className="navbar-caption text-white display-5" href="/">
            {logoUrl && <img width="108" alt={alt} src={logoUrl} />}
            {showCompanyName && <>&nbsp;&nbsp;{displayName}</>}
          </a>
        </span>
      </div>
    </div>
  );
};

export default Logo;
