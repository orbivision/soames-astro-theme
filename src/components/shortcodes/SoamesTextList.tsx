import React from "react";
import parse from "html-react-parser";

// ORBI-42 grouped format: one HTML chunk per list item.
interface TextItem {
  content: string;
}

interface SoamesTextListProps {
  // New (ORBI-42) grouped items from the block's data-items JSON.
  items?: TextItem[];
  // Legacy [soames-text-list] shortcode: a single string, split on the sentinel.
  content?: string;
}

const SoamesTextList: React.FC<SoamesTextListProps> = ({ items, content }) => {
  // Prefer the grouped items; fall back to the legacy sentinel-split string.
  const listItems: string[] =
    items && items.length
      ? items.map((it) => it?.content ?? "")
      : (content ?? "").split("__SOAMES_LI__");

  const cleaned = listItems.filter((html) => (html ?? "").trim().length > 0);

  // `soames-text-list` carries the top/bottom padding (ORBI-42) that replaces the
  // old manual <br><br> spacers — see styles/soames/overrides.css. Note: no pt-0/
  // pb-0 here (they previously zeroed the padding).
  return (
    <section className="soames-section article soames-list soames-text-list">
      <div className="container">
        <div className="media-container-row">
          <div className="soames-text counter-container col-12 col-md-10 mbr-fonts-style display-7">
            <ul>
              {cleaned.map((html, key) => (
                <li key={key}>{parse(html)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SoamesTextList;
