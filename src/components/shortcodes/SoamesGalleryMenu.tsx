import React from "react";

// New (ORBI-20) grouped format: one object per item.
interface GalleryMenuItemInput {
  image: string;
  label?: string | null;
  link?: string | null;
  css?: string | null;
}

// Legacy format: parallel, index-aligned comma arrays.
interface GalleryMenuAttributes {
  images: string[];
  links?: string[];
  labels?: string[];
  css?: string[];
}

interface GalleryMenuItem {
  id: string;
  imageUrl: string;
  label?: string | null;
  link?: string | null;
  css?: string | null;
}

// ORBI-44: "standard" = 3 items per row, "compact" = 4 items per row.
type GalleryMenuLayout = "standard" | "compact";

interface SoamesGalleryMenuProps {
  items?: GalleryMenuItemInput[];
  attributes?: GalleryMenuAttributes;
  layout?: GalleryMenuLayout;
}

const SoamesGalleryMenu: React.FC<SoamesGalleryMenuProps> = ({ items, attributes, layout = "standard" }) => {
  const normalizeUrl = (url: string) => (url ?? "").replace(/['""]+/g, '"');

  let menuItems: GalleryMenuItem[];
  if (items && items.length) {
    menuItems = items.map((it, i) => ({
      id: `icon_${i}`,
      imageUrl: normalizeUrl(it.image),
      label: it.label ?? null,
      link: it.link ?? null,
      css: it.css ?? null,
    }));
  } else if (attributes) {
    const { images, links, labels, css } = attributes;
    menuItems = (images ?? []).map((image, i) => ({
      id: `icon_${i}`,
      imageUrl: normalizeUrl(image),
      label: labels?.[i] ?? null,
      link: links?.[i] ?? null,
      css: css?.[i] ?? null,
    }));
  } else {
    menuItems = [];
  }

  // Drop rows with no image (e.g. a trailing comma in the legacy format).
  menuItems = menuItems.filter((item) => item.imageUrl.trim().length > 0);

  // Standard fits 3 across (col-lg-4); compact fits 4 across (col-lg-3).
  const colClass = layout === "compact" ? "col-lg-3" : "col-lg-4";

  return (
    <section className={`features1 soames-gallery-menu soames-gallery-menu--${layout}`}>
      <div className="container-fluid">
        <div className="media-container-row">
          {menuItems.map(menuItem => (
            <div key={menuItem.id} className={`card p-3 col-md-12 ${colClass}`}>
              <div className="card-wrapper">
                <div className="card-img">
                  <a href={menuItem.link ?? "#"}>
                    <img
                      src={menuItem.imageUrl}
                      alt={menuItem.label ?? ""}
                      title={menuItem.label ?? ""}
                    />
                  </a>
                </div>
                <div className="card-box">
                  <h4 className="card-title pb-3 mbr-fonts-style display-7">
                    {menuItem.label}
                  </h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SoamesGalleryMenu;
