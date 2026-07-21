import React from "react";

// New (ORBI-20) grouped format: one object per icon.
interface IconItem {
  image: string;
  label?: string | null;
  link?: string | null;
  css?: string | null;
}

// Legacy format: parallel, index-aligned comma arrays.
interface IconListAttributes {
  images: string[];
  links?: string[];
  labels?: string[];
  css?: string[];
}

interface Icon {
  id: string;
  imageUrl: string;
  label?: string | null;
  link?: string | null;
  css?: string | null;
}

type IconSize = "small" | "medium" | "large";

interface SoamesIconListProps {
  items?: IconItem[];
  attributes?: IconListAttributes;
  size?: IconSize;
}

// ORBI-49: fixed icon-image height per size. Applied as an inline style so it wins
// on both pages and posts — on posts `.soames-prose .blog-post-content img{height:auto}`
// would otherwise override a plain height attribute.
const ICON_HEIGHTS: Record<IconSize, number> = {
  small: 116,
  medium: 256,
  large: 512,
};

const SoamesIconList: React.FC<SoamesIconListProps> = ({ items, attributes, size = "small" }) => {
  const normalizeUrl = (url: string) => (url ?? "").replace(/['""]+/g, '"');
  const heightPx = ICON_HEIGHTS[size] ?? ICON_HEIGHTS.small;

  let icons: Icon[];
  if (items && items.length) {
    // New grouped format.
    icons = items.map((it, i) => ({
      id: `icon_${i}`,
      imageUrl: normalizeUrl(it.image),
      label: it.label ?? null,
      link: it.link ?? null,
      css: it.css ?? null,
    }));
  } else if (attributes) {
    // Legacy positional arrays.
    const { images, links, labels, css } = attributes;
    icons = (images ?? []).map((image, i) => ({
      id: `icon_${i}`,
      imageUrl: normalizeUrl(image),
      label: labels?.[i] ?? null,
      link: links?.[i] ?? null,
      css: css?.[i] ?? null,
    }));
  } else {
    icons = [];
  }

  // Drop rows with no image (e.g. a trailing comma in the legacy format).
  icons = icons.filter((icon) => icon.imageUrl.trim().length > 0);

  return (
    <section className="soames-section">
      <div className="container">
        <div className="d-flex flex-wrap align-items-center justify-content-center">
          {icons.map((icon) => (
            <a
              key={icon.id}
              className={`d-flex flex-column align-items-center text-decoration-none p-2 ${icon.css ?? ''}`}
              href={icon.link ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              <img
                className="d-block mb-2"
                src={icon.imageUrl}
                alt={icon.label ?? ""}
                style={{ height: `${heightPx}px`, width: "auto" }}
                loading="lazy"
              />
              <span className="text-muted">{icon.label}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SoamesIconList;
