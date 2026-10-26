// ORBI-85: WordPress Preview for a static site — the Astro successor to the Gatsby theme's
// src/pages/preview.tsx.
//
// The plugin answers wp-admin's Preview with a 302 to <site>/preview/?token=…, having stored
// {post id, type} under that token for five minutes (and only for someone who can edit the post).
// This island reads the token, fetches the draft from the plugin's REST route, and renders it with
// the SAME components the build uses, so a preview looks like the page will. Nothing runs on the
// server: the browser talks to WordPress directly (WP core's REST CORS echoes the site's origin).
//
// Deliberately absent, because each needs data the token doesn't carry: prev/next navigation,
// Recent Posts, the author Bio. Build-time media localization doesn't run either, so images load
// straight from WordPress.
import React, { useEffect, useState } from "react";
import HeroHeader from "./HeroHeader";
import Shortcodes from "./shortcodes/Shortcodes";
import RemoveContentAreaPadding from "./shortcodes/RemoveContentAreaPadding";
import { resolveHeroBg, resolveHeroTitle, resolveHeroCaption } from "../lib/hero";

interface PreviewImage {
  sourceUrl: string;
  altText?: string;
}

interface BlogHero {
  title?: string | null;
  heroTitle?: string | null;
  heroCaption?: string | null;
  heroBackgroundImage?: string | null;
  guid?: string | null; // the posts page's featured image URL
  overlayOpacity?: string | null;
}

interface PreviewContent {
  type: "post" | "page";
  title: string;
  content: string;
  date?: string;
  heroTitle?: string | null;
  heroCaption?: string | null;
  heroBackgroundImage?: string | null;
  overlayOpacity?: string | null;
  featuredImage?: PreviewImage | null;
  blogImage?: string | null;
  blogHero?: BlogHero | null;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; content: PreviewContent };

export interface PreviewPageProps {
  /** The WordPress this site builds from (WORDPRESS_BASE_URL). The token only exists there. */
  wordpressBaseUrl: string;
}

// soames-site's fallback WordPress URL is http://; a browser on an https page blocks that fetch as
// mixed content. Upgrade to match the page, and leave http alone in local dev.
function restOrigin(base: string): string {
  const origin = new URL(base).origin;
  return window.location.protocol === "https:" ? origin.replace(/^http:/, "https:") : origin;
}

const opacity = (v?: string | null) => (v ? Number(v) : null);

const PreviewPage: React.FC<PreviewPageProps> = ({ wordpressBaseUrl }) => {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState({ status: "error", message: "No preview token. Use the Preview button in WordPress." });
      return;
    }
    if (!wordpressBaseUrl) {
      setState({ status: "error", message: "This site has no WordPress URL configured." });
      return;
    }
    const url = `${restOrigin(wordpressBaseUrl)}/wp-json/soames/v1/preview?token=${encodeURIComponent(token)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data?.code) {
          setState({ status: "error", message: data.message ?? "Could not load the preview." });
        } else {
          setState({ status: "ready", content: data as PreviewContent });
          document.title = `Preview: ${data.title}`;
        }
      })
      .catch((err: Error) => {
        setState({ status: "error", message: `Could not reach WordPress: ${err.message}` });
      });
  }, [wordpressBaseUrl]);

  if (state.status !== "ready") {
    return (
      <section id="soames-gatsby-content-container" className="soames-gatsby-content">
        <div className="soames-preview-status soames-prose">
          <h1>Preview</h1>
          <p>{state.status === "loading" ? "Loading the draft from WordPress…" : state.message}</p>
        </div>
      </section>
    );
  }

  const c = state.content;

  if (c.type === "post") {
    // Same hero rule as routes/blog/post: a single post wears the posts page's hero.
    const bh = c.blogHero ?? null;
    const heroBg = resolveHeroBg(
      bh ? { heroBackgroundImage: bh.heroBackgroundImage, featuredImage: bh.guid ? { sourceUrl: bh.guid } : null } : null
    );
    return (
      <>
        <HeroHeader
          title={resolveHeroTitle(bh, "Blog")}
          subhead={resolveHeroCaption(bh)}
          backgroundImage={heroBg}
          overlayOpacity={opacity(bh?.overlayOpacity)}
        />
        <section>
          <div className="media-container-row">
            <div className="col-12 col-lg-8">
              <section id="soames-gatsby-content-container" className="soames-gatsby-blog-content">
                <article className="blog-post soames-prose">
                  <header>
                    <h1>{c.title}</h1>
                    {c.date && <p>{c.date}</p>}
                  </header>
                  {c.content && (
                    <section className="blog-post-content">
                      <Shortcodes html={c.content} prose />
                    </section>
                  )}
                </article>
              </section>
            </div>
            <div className="col-12 col-lg-4">
              <section id="soames-gatsby-sidebar-container" className="soames-gatsby-sidebar">
                {c.blogImage && <img src={c.blogImage} alt="" style={{ marginBottom: 50 }} />}
              </section>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <HeroHeader
        title={resolveHeroTitle(c)}
        subhead={resolveHeroCaption(c)}
        backgroundImage={resolveHeroBg(c)}
        overlayOpacity={opacity(c.overlayOpacity)}
      />
      {c.content && (
        <section id="soames-gatsby-content-container" className="soames-gatsby-content">
          <RemoveContentAreaPadding />
          <Shortcodes html={c.content} />
        </section>
      )}
    </>
  );
};

export default PreviewPage;
