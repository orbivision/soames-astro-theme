// PORTED from soames-gatsby-theme Header.tsx. Logo/menu data now flow as props
// (no useStaticQuery). Markup UNCHANGED.
import React from "react";
import HeaderMenu from "./HeaderMenu";
import Logo from "./Logo";
import type { MenuItem } from "../lib/wp";

interface HeaderProps {
  title: string;
  logoUrl?: string | null;
  logoAlt?: string | null;
  companyName?: string | null;
  showCompanyName?: boolean;
  menuItems: MenuItem[];
}

const Header: React.FC<HeaderProps> = ({
  title,
  logoUrl = null,
  logoAlt = null,
  companyName = null,
  showCompanyName = true,
  menuItems,
}) => {
  return (
    <section className="menu soames-menu">
      <nav className="navbar navbar-expand beta-menu navbar-dropdown align-items-center navbar-fixed-top navbar-toggleable-sm">
        <button
          className="navbar-toggler navbar-toggler-right"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        <Logo
          title={title}
          logoUrl={logoUrl}
          logoAlt={logoAlt}
          companyName={companyName}
          showCompanyName={showCompanyName}
        />
        <HeaderMenu items={menuItems} />
      </nav>
    </section>
  );
};

export default Header;
