import React from "react";

interface SoamesSoundCloudProps {
  attributes: {
    bandName: string;
    siteLink: string;
    playlistId: string;
    albumLink: string;
    albumName: string;
  };
}

const SoamesSoundCloud: React.FC<SoamesSoundCloudProps> = ({ attributes }) => {
  const { bandName, siteLink, playlistId, albumLink, albumName } = attributes;

  return (
    <section className="soames-section article soames-list">
      <div className="container">
        <div className="media-container-row">
          <div className="soames-text counter-container col-12 col-md-10 pt-2 mbr-fonts-style display-7">
            <iframe
              title={albumName}
              width="100%"
              height="300"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={`https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/${playlistId}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`}
            ></iframe>
            <div
              style={{
                fontSize: '10px',
                color: '#cccccc',
                lineBreak: 'anywhere',
                wordBreak: 'normal',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontFamily:
                  'Interstate,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Garuda,Verdana,Tahoma,sans-serif',
                fontWeight: 100,
              }}
            >
              <a
                href={siteLink}
                title={bandName}
                target="_blank"
                style={{ color: '#cccccc', textDecoration: 'none' }}
                rel="noreferrer"
              >
                {bandName}
              </a>{' '}
              ·{' '}
              <a
                href={albumLink}
                title={albumName}
                target="_blank"
                style={{ color: '#cccccc', textDecoration: 'none' }}
                rel="noreferrer"
              >
                {albumName}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SoamesSoundCloud;
