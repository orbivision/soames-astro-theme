// Breadcrumb trail for single Knowledge Base articles (docs CPT). Presentational
// and static (no hydration): the crumb list is assembled in the docs template
// from docAncestors() + the /docs/ landing title. Crumbs with an `href` render
// as links; the last crumb (the current page) has no href and renders as plain
// text with aria-current="page". Separators are drawn in CSS (::before), so they
// aren't part of the accessible name or selectable text.
import React from "react";
import parse from "html-react-parser";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ crumbs }) => (
  <nav className="soames-breadcrumbs-nav" aria-label="Breadcrumb">
    <ol className="soames-breadcrumbs">
      {crumbs.map((crumb, i) => {
        const isCurrent = i === crumbs.length - 1;
        return (
          <li key={i} className="soames-breadcrumb-item">
            {crumb.href && !isCurrent ? (
              <a href={crumb.href}>{parse(crumb.label)}</a>
            ) : (
              <span aria-current={isCurrent ? "page" : undefined}>
                {parse(crumb.label)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumbs;
