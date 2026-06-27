// Hierarchical documentation nav for the docs template — the docs equivalent of
// BlogSidebar's "Recent Posts". Renders the weDocs doc tree (built by
// buildDocTree) as a nested menu, highlighting the current doc. Static (no
// hydration needed); links use each doc's WP `uri` (e.g. /docs/getting-started/).
import React from "react";
import parse from "html-react-parser";
import type { DocTreeNode } from "../lib/wp";

interface DocsSidebarProps {
  tree: DocTreeNode[];
  currentId: number;
}

const DocList: React.FC<{ nodes: DocTreeNode[]; currentId: number; top?: boolean }> = ({
  nodes,
  currentId,
  top = false,
}) => (
  <ul className={top ? "soames-docs-menu" : "soames-docs-menu soames-docs-submenu"}>
    {nodes.map((node) => {
      const active = node.databaseId === currentId;
      return (
        <li
          key={node.databaseId}
          className={`soames-docs-menu-item${active ? " is-active" : ""}`}
        >
          <a href={node.uri} aria-current={active ? "page" : undefined}>
            {parse(node.title)}
          </a>
          {node.children.length > 0 && (
            <DocList nodes={node.children} currentId={currentId} />
          )}
        </li>
      );
    })}
  </ul>
);

const DocsSidebar: React.FC<DocsSidebarProps> = ({ tree, currentId }) => (
  <nav className="soames-docs-nav" aria-label="Documentation">
    <DocList nodes={tree} currentId={currentId} top />
  </nav>
);

export default DocsSidebar;
