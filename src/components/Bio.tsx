// PORTED from soames-gatsby-theme Bio.tsx. Change for Astro: author comes in as a
// prop (from the post's author node) instead of useStaticQuery(wpUser) — the
// standalone users query is auth/WAF-gated.
//
// ORBI-53: shows the author's display name (WPGraphQL's `name` IS WP_User->display_name),
// falling back to firstName. Previously preferred firstName. The "You should follow them
// on Twitter" link was dropped in the same pass — it built twitter.com/<display name>,
// spaces included, so it was never a working URL.
import React from "react";
import type { WpAuthor } from "../lib/wp";

interface BioProps {
  author: WpAuthor | null;
}

const Bio: React.FC<BioProps> = ({ author }) => {
  if (!author) return null;
  const displayName = author.name || author.firstName;

  return (
    <div className="bio">
      {author.avatarUrl && (
        <img alt={displayName ?? "Author"} className="bio-avatar" src={author.avatarUrl} />
      )}
      {displayName && (
        <p>
          Written by <strong>{displayName}</strong>
          {author.description ? ` ${author.description}` : ""}
        </p>
      )}
    </div>
  );
};

export default Bio;
