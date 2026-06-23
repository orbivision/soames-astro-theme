import React from "react";

const RemoveContentAreaPadding: React.FC = () => {
  const css = `
    .soames-gatsby-content {
      padding: 0px;
    }
  `;

  return <style>{css}</style>;
};

export default RemoveContentAreaPadding;
