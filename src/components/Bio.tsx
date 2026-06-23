// PORTED from soames-gatsby-theme Bio.tsx. Change for Astro: author comes in as a
// prop (from the post's author node) instead of useStaticQuery(wpUser) — the
// standalone users query is auth/WAF-gated. Uses firstName, falling back to name.
import React from "react";
import type { WpAuthor } from "../lib/wp";

interface BioProps {
  author: WpAuthor | null;
}

const Bio: React.FC<BioProps> = ({ author }) => {
  if (!author) return null;
  const displayName = author.firstName || author.name;
  const twitterHandle = author.name;

  return (
    <div className="bio">
      {author.avatarUrl && (
        <img alt={displayName ?? "Author"} className="bio-avatar" src={author.avatarUrl} />
      )}
      {displayName && (
        <p>
          Written by <strong>{displayName}</strong>
          {author.description ? ` ${author.description}` : ""}{" "}
          {twitterHandle && (
            <a href={`https://twitter.com/${twitterHandle}`}>
              You should follow them on Twitter
            </a>
          )}
        </p>
      )}
    </div>
  );
};

export default Bio;
