// PORTED from soames-gatsby-theme/src/components/Footer.tsx (post-ORBI-22).
// Changes for Astro: FooterMenu's useStaticQuery → `menuItems` prop (fetched in the
// layout). Copyright logic (companyName || title) UNCHANGED from ORBI-22.
import React from "react";
import FooterMenu from "./FooterMenu";
import type { MenuItem } from "../lib/wp";

interface FooterProps {
  title: string;
  contactBlurb?: string | null;
  companyName?: string | null;
  menuItems?: MenuItem[];
}

const Footer: React.FC<FooterProps> = ({
  title,
  contactBlurb = null,
  companyName = null,
  menuItems = [],
}) => {
  return (
    <section className="soames-footer mt-5">
      <div className="container">
        <div className="media-container-row content text-white">
          <div className="col-12 col-md-2">
            <div className="media-wrap">{` `}</div>
          </div>
          <div className="col-12 col-md-4 mbr-fonts-style display-7">
            <FooterMenu items={menuItems} />
          </div>
          <div className="col-12 col-md-4 mbr-fonts-style display-7">
            {contactBlurb && (
              <>
                <h5 className="pb-3">Contact</h5>
                <div
                  className="soames-text pr-3"
                  dangerouslySetInnerHTML={{ __html: contactBlurb }}
                />
              </>
            )}
            <p className="soames-text pt-3" data-testid="footer-copyright">
              © {new Date().getFullYear()} {companyName || title}
              <br />
              Built with{" "}
              <a href="https://www.soames.app" target="_blank" rel="noreferrer">Soames</a>,{" "}
              <a href="https://astro.build" target="_blank" rel="noreferrer">Astro</a>, and{" "}
              <a href="https://wordpress.org/" target="_blank" rel="noreferrer">WordPress</a>
            </p>
          </div>
          <div className="col-12 col-md-2 mbr-fonts-style display-7">
            <h5 className="pb-3">{` `}</h5>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Footer;
