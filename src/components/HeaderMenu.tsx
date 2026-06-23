// PORTED from soames-gatsby-theme HeaderMenu.tsx. Changes: useStaticQuery → `items`
// prop (fetched in the layout via getMenuByLocation("HEADER")); gatsby <Link> → <a>.
// Markup/classes UNCHANGED — Bootstrap dropdown behavior is wired by global JS
// (Phase 4), not React, so this renders as static HTML.
import React from "react";
import type { MenuItem } from "../lib/wp";

interface HeaderMenuProps {
  items: MenuItem[];
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({ items }) => {
  return (
    <div className="collapse navbar-collapse" id="navbarSupportedContent">
      <ul className="navbar-nav nav-dropdown nav-right" data-app-modern-menu="true">
        {items.map((item) =>
          item.path !== "/home/" && item.parentDatabaseId === 0 ? (
            item.childItems.length === 0 ? (
              <li key={item.id} className="nav-item">
                {item.uri.includes("http") ? (
                  <a
                    className="nav-link link text-white display-4"
                    href={item.uri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.label}
                  </a>
                ) : (
                  <a href={item.uri} className="nav-link link text-white display-4">
                    {item.label}
                  </a>
                )}
              </li>
            ) : (
              <li key={item.id} className="nav-item dropdown">
                <a
                  className="nav-link link text-white dropdown-toggle display-4"
                  href={item.uri}
                  data-toggle="dropdown-submenu"
                  aria-expanded="false"
                >
                  {item.label}
                </a>
                <div className="dropdown-menu">
                  <ul className="navbar-nav nav-dropdown nav-right">
                    {item.childItems.map((childItem) => (
                      <li key={childItem.id}>
                        {childItem.uri.includes("http") ? (
                          <a
                            className="text-white dropdown-item display-4"
                            target="_blank"
                            rel="noreferrer"
                            href={childItem.uri}
                          >
                            {childItem.label}
                            <br />
                          </a>
                        ) : (
                          <a href={childItem.uri} className="text-white dropdown-item display-4">
                            {childItem.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          ) : null
        )}
      </ul>
    </div>
  );
};

export default HeaderMenu;
