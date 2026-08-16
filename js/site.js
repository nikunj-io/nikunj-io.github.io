/* =========================================================================
   Portfolio — progressive enhancement only.
   The page is fully readable and navigable with JavaScript disabled.
   No third-party scripts, no network calls, no analytics, no cookies.
   ========================================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     1. Email address assembly.
     The address is never present as a contiguous string in the HTML source,
     which defeats naive address-harvesting crawlers. Elements marked
     .js-mail point at LinkedIn by default, so the no-JS path still works.
     ---------------------------------------------------------------------- */
  function wireMail() {
    var user = ['np', '9199'].join('');
    var host = ['gmail', 'com'].join('.');
    var address = user + String.fromCharCode(64) + host;

    document.querySelectorAll('.js-mail').forEach(function (el) {
      el.setAttribute('href', 'mailto:' + address);
      el.removeAttribute('target');
      el.removeAttribute('rel');
      if (el.textContent.trim() === 'Email') {
        el.textContent = address;
      }
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', 'Email ' + address);
      }
    });
  }

  /* ----------------------------------------------------------------------
     2. Mobile navigation
     ---------------------------------------------------------------------- */
  function wireNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.setAttribute('data-open', String(open));
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function () {
      setOpen(nav.getAttribute('data-open') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ----------------------------------------------------------------------
     3. Scroll reveal — opt-in, and skipped entirely under reduced motion.
     ---------------------------------------------------------------------- */
  function wireReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     4. Active section indicator in the nav.
     ---------------------------------------------------------------------- */
  function wireActiveNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var sections = links
      .map(function (link) { return document.querySelector(link.getAttribute('href')); })
      .filter(Boolean);
    if (!sections.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          var match = link.getAttribute('href') === '#' + entry.target.id;
          if (match) {
            link.setAttribute('aria-current', 'true');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ----------------------------------------------------------------------
     5. Footer year
     ---------------------------------------------------------------------- */
  function wireYear() {
    document.querySelectorAll('.js-year').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function init() {
    wireMail();
    wireNav();
    wireReveal();
    wireActiveNav();
    wireYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
