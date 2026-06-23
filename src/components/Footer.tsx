// PORTED from soames-gatsby-theme/src/components/Footer.tsx (post-ORBI-22).
// Only change vs. the real theme: the original embedded <FooterMenu/>, which used
// Gatsby `useStaticQuery`. In Astro the data is fetched at build time and passed
// as a prop instead (the same lift-to-prop pattern ORBI-13/ORBI-22 already use for
// contactBlurb/companyName). The copyright logic is UNCHANGED.
import React from "react";

interface FooterProps {
  title: string;
  contactBlurb?: string | null;
  companyName?: string | null;
}

const Footer: React.FC<FooterProps> = ({ title, contactBlurb = null, companyName = null }) => {
  return (
    <section className="soames-footer mt-5">
      <div className="container">
        <div className="media-container-row content text-white">
          <div className="col-12 col-md-4 mbr-fonts-style display-7">
            {contactBlurb && (
              <>
                <h5 className="pb-3">Contact</h5>
                <div className="soames-text pr-3" dangerouslySetInnerHTML={{ __html: contactBlurb }} />
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
        </div>
      </div>
    </section>
  );
};

export default Footer;
