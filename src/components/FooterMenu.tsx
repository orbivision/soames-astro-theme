// PORTED from soames-gatsby-theme FooterMenu.tsx. Changes: useStaticQuery → `items`
// prop (getMenuByLocation("FOOTER")); gatsby <Link> → <a>. Markup UNCHANGED.
import React from "react";
import type { MenuItem } from "../lib/wp";

interface FooterMenuProps {
  items: MenuItem[];
}

const FooterMenu: React.FC<FooterMenuProps> = ({ items }) => {
  const topLevel = items.filter((item) => item.parentDatabaseId === 0);
  if (topLevel.length === 0) return null;

  return (
    <div className="soames-footer-content">
      <h5 className="pb-3">Links</h5>
      <ul>
        {topLevel.map((item) =>
          item.uri.includes("http") ? (
            <li className="soames-footer-list-item" key={item.id}>
              <a href={item.uri} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            </li>
          ) : (
            <li className="soames-footer-list-item" key={item.id}>
              <a href={item.uri}>{item.label}</a>
            </li>
          )
        )}
      </ul>
    </div>
  );
};

export default FooterMenu;
