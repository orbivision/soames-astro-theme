// Vanilla replacement for the theme's two jQuery files
// (soames-nav-dropdown.js + soames-navbar-dropdown.js) — NO jQuery.
//
// Bootstrap 5's bundle (loaded separately) handles the mobile hamburger collapse
// and Popper. This script covers the two remaining bespoke behaviors:
//   1) Submenu dropdowns: markup uses `[data-toggle="dropdown-submenu"]` with a
//      parent <li> that gets the `.open` class toggled (NOT Bootstrap's own
//      data-bs-* API). Toggle on click; close others; close on outside-click/ESC.
//   2) Navbar scroll state: add `.navbar-short` (and toggle `.bg-color` on
//      transparent bars) once the page is scrolled, matching the old behavior.
(function () {
  "use strict";

  function initSubmenus() {
    var toggles = document.querySelectorAll('[data-toggle="dropdown-submenu"]');
    if (!toggles.length) return;

    function closeAll(except) {
      document.querySelectorAll(".nav-item.dropdown.open, .dropdown.open").forEach(function (li) {
        if (li !== except) {
          li.classList.remove("open");
          var t = li.querySelector('[data-toggle="dropdown-submenu"]');
          if (t) t.setAttribute("aria-expanded", "false");
        }
      });
    }

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var li = toggle.parentNode;
        var isOpen = li.classList.contains("open");
        closeAll(li);
        li.classList.toggle("open", !isOpen);
        toggle.setAttribute("aria-expanded", String(!isOpen));
      });
    });

    document.addEventListener("click", function () { closeAll(null); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll(null);
    });
  }

  function initScrollState() {
    var bars = document.querySelectorAll(".navbar-fixed-top");
    if (!bars.length) return;
    var onScroll = function () {
      var scrolled = (window.pageYOffset || document.documentElement.scrollTop) > 0;
      bars.forEach(function (bar) {
        bar.classList.toggle("navbar-short", scrolled);
        if (bar.classList.contains("transparent") && !bar.classList.contains("opened")) {
          bar.classList.toggle("bg-color", !scrolled);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function init() {
    initSubmenus();
    initScrollState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
