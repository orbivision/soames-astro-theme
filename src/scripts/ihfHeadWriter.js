// Optima Express client head writer (ORBI-82, architecture A). Inlined into every indexable IDX
// shell, after Kestrel's loader. Kestrel renders the page and appends its own og:url / og:title /
// og:description / og:image and JSON-LD to <head>, but never sets the document title, the meta
// description or a canonical — so a crawler that runs JS sees "Listing Details" on every
// listing. This fills exactly those gaps, once Kestrel's head writes have settled:
//
//   found      → canonical from Kestrel's og:url (on the site's primary origin), title from
//                og:title, description from og:description;
//   not found  → <meta name="robots" content="noindex"> and a "Listing Not Found" title: Google's
//                documented soft-404 pattern for script-rendered pages, and the only way to catch a
//                listing the server still thinks exists (ORBI-82: 1449859).
//
// It only ever fills gaps — a canonical already present, or a title or description that isn't
// the shell's generic one, means the edge already wrote this head (group B), and it's left alone.
// Kestrel's tags are told apart from the shell's by position: they come after its loader script.
(function () {
  var el = document.getElementById('soames-ihf-config');
  var loader = document.querySelector('script[src*="ihf-kestrel"]');
  if (!el || !loader || !window.MutationObserver) return;
  var cfg;
  try {
    cfg = JSON.parse(el.textContent);
  } catch (e) {
    return;
  }
  // The edge already wrote this page's head (group B): its splice always adds a canonical, and a
  // plain shell never has one while it's being parsed. Stand down entirely. Without this check,
  // 0.1.30 read the edge's title as "the shell's generic title" (it was simply the title at parse
  // time) and replaced WordPress's head with Kestrel's on every B page.
  if (document.head.querySelector('link[rel="canonical"]')) return;
  // The shell's generic values, read while the head is still being parsed — before Kestrel or
  // anything else can change them. "Still equal to these" is what "not yet filled" means below.
  var descTag = document.head.querySelector('meta[name="description"]');
  cfg.shellTitle = document.title;
  cfg.description = descTag ? descTag.getAttribute('content') : null;

  function fromKestrel(node) {
    return !!(loader.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
  }
  function kestrelMeta(prop) {
    var all = document.head.querySelectorAll('meta[property="' + prop + '"]');
    var value = null;
    // Last one wins; null = Kestrel wrote none.
    for (var i = 0; i < all.length; i++) if (fromKestrel(all[i])) value = all[i].getAttribute('content');
    return value;
  }
  function renderedText() {
    var out = '';
    (function walk(n) {
      if (n.shadowRoot) walk(n.shadowRoot);
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) out += c.textContent + ' ';
        else if ((c.nodeType === 1 && c.tagName !== 'STYLE' && c.tagName !== 'SCRIPT') || c.nodeType === 11) walk(c);
      }
    })(document.querySelector('.ihf-container') || document.body);
    return out.replace(/\s+/g, ' ').trim();
  }
  function addHead(tag, attrs) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    document.head.appendChild(n);
  }
  function suffix(t) {
    return cfg.siteTitle ? t + ' | ' + cfg.siteTitle : t;
  }

  var done = false;
  function apply() {
    if (done) return;
    done = true;
    observer.disconnect();
    var url = kestrelMeta('og:url');
    // Kestrel wrote no page head (a list or form page): nothing to fill.
    if (url === null) return;
    var title = kestrelMeta('og:title');
    var desc = kestrelMeta('og:description');

    if (title) {
      if (url && !document.head.querySelector('link[rel="canonical"]')) {
        var href = url;
        try {
          var u = new URL(url, location.href);
          href = cfg.siteUrl ? new URL(u.pathname, cfg.siteUrl).href : u.href;
        } catch (e) {}
        addHead('link', { rel: 'canonical', href: href });
      }
      if (document.title === cfg.shellTitle) document.title = suffix(title);
      if (desc && descTag && descTag.getAttribute('content') === cfg.description) {
        descTag.setAttribute('content', desc.length > 160 ? desc.slice(0, 157).replace(/\s+\S*$/, '') + '…' : desc);
      }
      return;
    }
    // Two signals, not one: an empty og:title alone could be a page mid-render, and a wrong
    // noindex is far worse than a missed soft 404.
    if (/^Not Found\b/i.test(renderedText())) {
      if (!document.head.querySelector('meta[name="robots"]')) addHead('meta', { name: 'robots', content: 'noindex' });
      if (document.title === cfg.shellTitle) document.title = suffix('Listing Not Found');
    }
  }

  // Settled = Kestrel has written its og:url and then nothing has changed in <head> for a while.
  var quiet = null;
  var observer = new MutationObserver(function () {
    if (kestrelMeta('og:url') === null) return;
    clearTimeout(quiet);
    quiet = setTimeout(apply, 1500);
  });
  observer.observe(document.head, { childList: true, subtree: true, attributes: true });
  // Hard stop.
  setTimeout(apply, 20000);
})();
