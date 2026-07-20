// PORTED from soames-gatsby-theme BlogSidebar.tsx. Changes for Astro: posts come in
// as a prop (no useStaticQuery); gatsby <Link> → <a>; links use the Astro post path
// (/blog/post/<slug>/). Markup/classes UNCHANGED.
import React from "react";
import parse from "html-react-parser";
import type { WpPost } from "../lib/wp";
import { formatPostDate } from "../lib/date";

interface BlogSidebarProps {
  posts: WpPost[];
  currentId: number;
}

const BlogSidebar: React.FC<BlogSidebarProps> = ({ posts, currentId }) => {
  return (
    <section className="soames-blog-roll pt-3">
      <div className="container">
        {posts.map((post) =>
          post.databaseId !== currentId ? (
            <div key={post.databaseId} className="media-container-row">
              <div className="card p-3 col-12">
                <div className="card-wrapper">
                  <div className="card-box">
                    <h4 className="card-title mbr-fonts-style display-5">
                      {parse(post.title)}
                    </h4>
                    <h4 className="mbr-fonts-style display-7">{formatPostDate(post.date)}</h4>
                    {parse(post.excerpt)}
                  </div>
                  <div className="mbr-section-btn text-center">
                    <a
                      href={`/blog/post/${post.slug}/`}
                      itemProp="url"
                      className="btn btn-primary display-4"
                    >
                      <span itemProp="headline">Read More</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : null
        )}
      </div>
    </section>
  );
};

export default BlogSidebar;
