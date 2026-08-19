/* =========================================================================
   Portfolio - progressive enhancement only.
   The page is fully readable and navigable with JavaScript disabled.
   No third-party scripts, no network calls, no analytics, no cookies.
   ========================================================================= */
(function () {
  'use strict';

  /* Marks the document as scripted, before anything else runs. Every rule
     that starts an element at opacity 0 is scoped to .js, so with scripting
     disabled nothing is hidden and the page reads as plain HTML. This runs
     from a deferred script, which executes after parse and before first
     paint, so there is no flash of styled-then-hidden content. */
  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(max-width: 899px)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ----------------------------------------------------------------------
     Shared pointer.

     One listener feeding one smoothed value, read by the hero field, the
     ambient field, the LiDAR panel and the hero parallax. Four separate
     listeners meant four handlers on the same event easing at four slightly
     different rates, which is what made the page feel like several effects
     rather than one field. Smoothing happens once per animation frame -
     `easePointer` is idempotent within a frame because every rAF callback in
     a frame is handed the same timestamp.
     ---------------------------------------------------------------------- */
  var ptr = {
    tx: 0.5, ty: 0.5,        // target, normalised against the viewport
    x:  0.5, y:  0.5,        // smoothed, what everything actually reads
    cx: -9999, cy: -9999,    // last client position, for canvas-space maths
    seen: false              // false until the pointer has actually moved
  };
  var ptrFrame = -1;

  function easePointer(t) {
    if (t === ptrFrame) return;
    ptrFrame = t;
    ptr.x += (ptr.tx - ptr.x) * 0.055;
    ptr.y += (ptr.ty - ptr.y) * 0.055;
  }

  if (finePointer) {
    window.addEventListener('pointermove', function (e) {
      ptr.tx = e.clientX / window.innerWidth;
      ptr.ty = e.clientY / window.innerHeight;
      ptr.cx = e.clientX;
      ptr.cy = e.clientY;
      ptr.seen = true;
    }, { passive: true });

    // Leaving the window settles the field back to centre instead of
    // freezing it mid-lean, which reads as a stall rather than a rest.
    document.addEventListener('pointerleave', function () {
      ptr.tx = 0.5; ptr.ty = 0.5;
      ptr.cx = -9999; ptr.cy = -9999;
    }, { passive: true });
  }

  /* Page scroll, tracked passively. Canvases need their own position in
     viewport space every frame; reading window.scrollY or a bounding rect
     inside the frame loop forces a layout flush 60 times a second, so the
     value is cached here and the canvases measure their document offset
     only on resize. */
  var pageY = window.scrollY || 0;
  window.addEventListener('scroll', function () {
    pageY = window.scrollY || 0;
  }, { passive: true });

  /* ----------------------------------------------------------------------
     1. Email assembly.
     The address is never a contiguous string in the HTML source, which
     defeats naive harvesting crawlers. Elements marked .js-mail point at a
     public profile by default, so the no-JS path still reaches a person.
     ---------------------------------------------------------------------- */
  function wireMail() {
    var address = ['nikunj', 'prajapati', '09'].join('') +
                  String.fromCharCode(64) +
                  ['gmail', 'com'].join('.');

    // Each page declares its own subject, so a message sent from a story page
    // arrives already saying which story prompted it.
    var subject = document.body.getAttribute('data-mail-subject') || 'Project enquiry';
    var href = 'mailto:' + address + '?subject=' + encodeURIComponent(subject);

    document.querySelectorAll('.js-mail').forEach(function (el) {
      el.setAttribute('href', href);
      el.removeAttribute('target');
      el.removeAttribute('rel');
      if (el.dataset.mailText !== undefined) el.textContent = address;
      if (!el.getAttribute('aria-label')) {
        el.setAttribute('aria-label', 'Email ' + address + ' about ' + subject);
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
     3. Scroll reveal
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
     4. Active section in the nav
     ---------------------------------------------------------------------- */
  function wireActiveNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var sections = links
      .map(function (l) { return document.querySelector(l.getAttribute('href')); })
      .filter(Boolean);
    if (!sections.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          if (link.getAttribute('href') === '#' + entry.target.id) {
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
     5. Story rail - horizontal carousel.
     The rail is a native scroll container, so it already works by drag,
     trackpad, touch and keyboard. These buttons are an extra affordance,
     not the mechanism.
     ---------------------------------------------------------------------- */
  function wireRail() {
    var rail = document.querySelector('.rail');
    var prev = document.querySelector('.rail__btn--prev');
    var next = document.querySelector('.rail__btn--next');
    if (!rail || !prev || !next) return;

    function step() {
      var card = rail.querySelector('.story');
      return card ? card.getBoundingClientRect().width + 16 : 280;
    }

    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    }

    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left:  step(), behavior: reduceMotion ? 'auto' : 'smooth' }); });

    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ----------------------------------------------------------------------
     6. Hero depth field.

     A wave mesh of points sweeping left to right, compressed toward the
     horizon so it reads as depth rather than a flat grid, plus a scatter of
     loose particles. The whole field leans toward the pointer, and points
     near the cursor part around it and brighten - a local influence on top
     of the global lean is what makes the surface feel touched rather than
     merely tilted.

     The same loop drives the hero's layered parallax by writing two custom
     properties on the section; CSS moves the decorative SVGs, the portrait
     and the LiDAR panel at different rates off those. Writing custom
     properties through the CSSOM is not an inline style attribute, so it
     does not need 'unsafe-inline' in the style-src directive.

     Skipped under reduced motion and on small screens, where the CSS
     gradient already carries the look at no cost. The canvas is decorative
     and aria-hidden, so nothing is lost when it does not run.
     ---------------------------------------------------------------------- */
  function wireCloud() {
    var canvas = document.querySelector('.hero__field');
    if (!canvas || reduceMotion || coarse) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var hero = document.querySelector('.hero');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var docLeft = 0, docTop = 0;         // canvas origin in document space
    var COLS = 0, ROWS = 14;
    var motes = [];
    var raf = null, running = false;

    // Radius of the cursor's local influence, and its square so the common
    // case - a point nowhere near the cursor - costs one multiply-add and a
    // comparison rather than a square root.
    var R = 132, R2 = R * R;

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      docLeft = r.left + (window.scrollX || 0);
      docTop  = r.top  + (window.scrollY || 0);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      COLS = Math.max(26, Math.min(60, Math.round(w / 26)));

      // Loose particles drifting independently of the mesh.
      var n = Math.round(w / 16);
      motes = [];
      for (var i = 0; i < n; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: .5 + Math.random() * 1.5,
          a: .1 + Math.random() * .5,
          vx: .04 + Math.random() * .16,
          vy: (Math.random() - .5) * .06,
          warm: Math.random() < .12   // a few amber specks break the monotone
        });
      }
    }

    // The mesh belongs on the right, wrapping the portrait. It ramps in past
    // the headline so it never sits behind body copy and hurts legibility,
    // and eases off at the very edge so it does not end on a hard line.
    function edgeFade(u) {
      var rampIn  = Math.max(0, Math.min(1, (u - .22) / .22));
      var edgeOff = Math.min(1, (1.04 - u) / .07);
      return rampIn * edgeOff;
    }

    function frame(t) {
      easePointer(t);
      ctx.clearRect(0, 0, w, h);

      var lean = ptr.seen ? 1 : 0;
      var px = (ptr.x - .5) * 30 * lean;
      var py = (ptr.y - .5) * 20 * lean;

      // Cursor in canvas space, from cached scroll rather than a live
      // bounding-rect read. Off-screen when the pointer has never moved, so
      // the influence term costs nothing until it is earned.
      var curX = ptr.cx - docLeft;
      var curY = ptr.cy + pageY - docTop;

      // Feed the hero's layered parallax. Two writes on one element per
      // frame; the layers themselves are composited by CSS.
      if (hero) {
        hero.style.setProperty('--hx', (ptr.x - .5).toFixed(4));
        hero.style.setProperty('--hy', (ptr.y - .5).toFixed(4));
      }

      // --- wave mesh -----------------------------------------------------
      for (var r2 = 0; r2 < ROWS; r2++) {
        var v = r2 / (ROWS - 1);          // 0 = horizon, 1 = foreground
        var depth = v * v;                // squared: rows bunch up at the back
        var rowY = h * .30 + depth * h * .62;

        var prevX = 0, prevY = 0, prevA = 0;

        for (var c = 0; c < COLS; c++) {
          var u = c / (COLS - 1);
          var fade = edgeFade(u);
          if (fade <= .01) { prevA = 0; continue; }

          var wave = Math.sin(u * 5.4 + t * .00055 + v * 2.4) * (14 + depth * 42) +
                     Math.sin(u * 11.0 - t * .00031 + v * 1.3) * (5 + depth * 13);

          var x = u * w + px * (.35 + depth * .65);
          var y = rowY + wave + py * (.35 + depth * .65);

          var alpha = (.12 + depth * .62) * fade;
          var size  = .55 + depth * 1.7;

          // Local influence: points inside the radius drift outward along
          // the radial and brighten. Squared falloff, so the boundary of the
          // effect is invisible and only the centre reads as a response.
          var dx = x - curX, dy = y - curY;
          var d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1;
            var f = 1 - d / R;
            var ff = f * f;
            x += (dx / d) * ff * 15;
            y += (dy / d) * ff * 15;
            alpha += ff * .46 * fade;
            size  += ff * 1.15;
          }

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 229, 160, ' + (alpha > 1 ? 1 : alpha).toFixed(3) + ')';
          ctx.fill();

          // Thread each row together; the line is what makes it read as a
          // surface instead of loose confetti.
          if (prevA > .01) {
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(0, 229, 160, ' + (alpha * .42).toFixed(3) + ')';
            ctx.lineWidth = .55;
            ctx.stroke();
          }
          prevX = x; prevY = y; prevA = alpha;
        }
      }

      // --- loose particles ------------------------------------------------
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx; m.y += m.vy;
        if (m.x > w + 6) { m.x = -6; m.y = Math.random() * h; }
        if (m.y < -6 || m.y > h + 6) m.vy = -m.vy;

        var mf = edgeFade(m.x / w);
        if (mf <= .01) continue;

        var mx = m.x + px * .5, my = m.y + py * .5;
        var mAlpha = m.a * mf * (.65 + .35 * Math.sin(t * .0013 + i));
        var mr = m.r;

        var mdx = mx - curX, mdy = my - curY;
        var md2 = mdx * mdx + mdy * mdy;
        if (md2 < R2) {
          var md = Math.sqrt(md2) || 1;
          var mfc = 1 - md / R;
          var mff = mfc * mfc;
          mx += (mdx / md) * mff * 22;   // motes are looser, so they give more
          my += (mdy / md) * mff * 22;
          mAlpha += mff * .5 * mf;
          mr += mff * .9;
        }

        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fillStyle = m.warm
          ? 'rgba(240, 190, 120, ' + (mAlpha > 1 ? 1 : mAlpha * .8).toFixed(3) + ')'
          : 'rgba(90, 245, 205, ' + (mAlpha > 1 ? 1 : mAlpha).toFixed(3) + ')';
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    window.addEventListener('resize', resize);

    // Stop painting when the hero scrolls away or the tab hides. An
    // animation nobody can see is pure battery cost.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        e[0].isIntersecting ? start() : stop();
      }, { threshold: .01 }).observe(canvas);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    resize();
  }

  /* ----------------------------------------------------------------------
     7. Footer year
     ---------------------------------------------------------------------- */
  function wireYear() {
    document.querySelectorAll('.js-year').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }


  /* ----------------------------------------------------------------------
     8. Narrative stage.

     One canvas, six scenes, crossfaded as each statement takes focus. Each
     scene states the idea in the statement rather than decorating it:
     a link failing, records moving, space being measured, an intent being
     carried out, sources being reconciled, a monolith becoming modules.

     Kept deliberately slow and low-contrast. Inert under reduced motion.
     ---------------------------------------------------------------------- */
  function wireNarrative() {
    var lines = Array.prototype.slice.call(document.querySelectorAll('.nline'));
    if (!lines.length) return;

    var label = document.querySelector('.js-scene-label');
    var LABELS = ['LINK STATE', 'DATA TRANSFER', 'SPATIAL CAPTURE',
                  'AGENT PIPELINE', 'SENSOR FUSION', 'MODERNISATION'];

    var active = 0;
    var pinnedUntil = 0;   // a manual pick briefly outranks the scroll observer

    function setActive(i, manual) {
      if (i < 0 || i >= lines.length) return;
      if (manual) pinnedUntil = performance.now() + 1400;
      if (i === active) return;
      lines.forEach(function (l, k) {
        var on = k === i;
        l.classList.toggle('is-active', on);
        l.setAttribute('aria-current', on ? 'true' : 'false');
      });
      active = i;
      if (label) label.textContent = LABELS[i];
    }

    /* Pointer, touch and keyboard all reach the same state. Without this the
       visual only responds to scrolling, which leaves anyone who taps a
       statement wondering why nothing happened. */
    lines.forEach(function (el, i) {
      el.addEventListener('click', function () { setActive(i, true); });
      el.addEventListener('focus', function () { setActive(i, true); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i, true); return; }
        var next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1
                 : e.key === 'ArrowUp'   || e.key === 'ArrowLeft'  ? i - 1
                 : e.key === 'Home' ? 0
                 : e.key === 'End'  ? lines.length - 1 : null;
        if (next === null) return;
        e.preventDefault();
        var t = Math.max(0, Math.min(lines.length - 1, next));
        lines[t].focus();
        setActive(t, true);
      });
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (performance.now() < pinnedUntil) return;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          setActive(lines.indexOf(e.target), false);
        });
      }, { rootMargin: '-42% 0px -42% 0px' });
      lines.forEach(function (l) { io.observe(l); });
    }

    var canvas = document.querySelector('.narrative__viz');
    if (!canvas || reduceMotion) return;   // interaction above is already wired

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, raf = null, running = false;
    var shown = 0, fade = 1;               // scene crossfade
    // Scene-local pointer, normalised against this canvas rather than the
    // viewport, because these scenes parallax relative to their own frame.
    // Deliberately not the shared `ptr`: same idea, different basis.
    var scenePtr = { x: .5, y: .5, tx: .5, ty: .5 };
    var A = '0, 229, 160';

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function line(x1, y1, x2, y2, a, width) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(' + A + ',' + a.toFixed(3) + ')';
      ctx.lineWidth = width || 1; ctx.stroke();
    }
    function dot(x, y, r, a) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + A + ',' + a.toFixed(3) + ')'; ctx.fill();
    }
    function ring(x, y, r, a) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + A + ',' + a.toFixed(3) + ')';
      ctx.lineWidth = 1; ctx.stroke();
    }

    /* Ambient field: a few slow points behind every scene. Systems, devices,
       people. Low enough that it reads as texture, not content. */
    var motes = [];
    function seedMotes() {
      motes = [];
      for (var i = 0; i < 26; i++) {
        motes.push({ x: Math.random(), y: Math.random(),
                     vx: (Math.random() - .5) * .00006,
                     vy: (Math.random() - .5) * .00006,
                     r: .6 + Math.random() * .9 });
      }
    }
    function drawMotes(t) {
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.x += m.vx * 16; m.y += m.vy * 16;
        if (m.x < 0) m.x = 1; if (m.x > 1) m.x = 0;
        if (m.y < 0) m.y = 1; if (m.y > 1) m.y = 0;
        dot(m.x * w, m.y * h, m.r, .07 + .04 * Math.sin(t * .0008 + i));
      }
    }

    // --- 01 link state: a chain of nodes, one hop drops, the local end lives
    function sceneLink(t, a) {
      var n = 4, pad = w * .16, span = (w - pad * 2) / (n - 1), y = h * .5;
      var broken = (Math.floor(t / 2600) % 2) === 1;
      for (var i = 0; i < n - 1; i++) {
        var x1 = pad + i * span, x2 = pad + (i + 1) * span;
        var dead = broken && i === 1;
        if (dead) {
          line(x1, y, x1 + span * .38, y, .12 * a, 1);
          line(x2 - span * .38, y, x2, y, .12 * a, 1);
          var cx = (x1 + x2) / 2, s = 4.5;
          ctx.strokeStyle = 'rgba(240,145,63,' + (.7 * a).toFixed(3) + ')';
          ctx.lineWidth = 1.3; ctx.beginPath();
          ctx.moveTo(cx - s, y - s); ctx.lineTo(cx + s, y + s);
          ctx.moveTo(cx + s, y - s); ctx.lineTo(cx - s, y + s); ctx.stroke();
        } else {
          line(x1, y, x2, y, .3 * a, 1);
        }
      }
      for (var j = 0; j < n; j++) {
        var x = pad + j * span;
        var localNode = j === 0;
        var pulse = localNode ? .55 + .35 * Math.sin(t * .0022) : (broken && j > 1 ? .2 : .5);
        dot(x, y, localNode ? 4.4 : 3.4, pulse * a);
        if (localNode) ring(x, y, 9 + 3 * Math.sin(t * .0022), .18 * a);
      }
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(' + A + ',' + (.4 * a).toFixed(3) + ')';
      ctx.fillText('LOCAL', pad - 12, y + 26);
    }

    // --- 02 data transfer: packets crossing three lanes
    function sceneFlow(t, a) {
      var lx = w * .2, rx = w * .8, lanes = 3;
      for (var i = 0; i < lanes; i++) {
        var y = h * .34 + i * (h * .16);
        line(lx, y, rx, y, .12 * a, 1);
        for (var k = 0; k < 3; k++) {
          var p = ((t * .00013) + i * .21 + k * .34) % 1;
          dot(lx + (rx - lx) * p, y, 2, (.5 + .3 * Math.sin(p * Math.PI)) * a);
        }
        dot(lx, y, 3, .45 * a);
        dot(rx, y, 3, .45 * a);
      }
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(' + A + ',' + (.4 * a).toFixed(3) + ')';
      ctx.fillText('LOCAL', lx - 16, h * .34 - 22);
      ctx.fillText('REMOTE', rx - 20, h * .34 - 22);
    }

    // --- 03 spatial capture: point cloud around a volume, parallax on pointer
    function sceneSpace(t, a) {
      var px = (scenePtr.x - .5) * 22, py = (scenePtr.y - .5) * 14;
      var cx = w * .5 + px, cy = h * .5 + py, bw = w * .16, bh = h * .17;
      var front = [[cx-bw,cy-bh],[cx+bw,cy-bh],[cx+bw,cy+bh],[cx-bw,cy+bh]];
      var off = bw * .5;
      for (var i = 0; i < 4; i++) {
        var q = front[i], r2 = front[(i + 1) % 4];
        line(q[0], q[1], r2[0], r2[1], .34 * a, 1);
        line(q[0] + off, q[1] - off, r2[0] + off, r2[1] - off, .16 * a, 1);
        line(q[0], q[1], q[0] + off, q[1] - off, .16 * a, 1);
      }
      for (var s = 0; s < 46; s++) {
        var ang = s * 2.399, rad = 22 + (s % 11) * 9;
        var sx = cx + Math.cos(ang) * rad * 1.7 + px * .4;
        var sy = cy + Math.sin(ang) * rad * .85 + py * .4;
        var depth = .3 + .7 * ((s % 7) / 7);
        dot(sx, sy, .6 + depth * 1.1, (.1 + depth * .32) * a);
      }
    }

    // --- 04 agent pipeline: a pulse travelling through the stages
    function sceneAgent(t, a) {
      var steps = ['INTENT', 'UNDERSTAND', 'DECIDE', 'ACT', 'DONE'];
      var top = h * .2, gap = (h * .6) / (steps.length - 1), x = w * .34;
      var cursor = (t * .00028) % 1;
      var at = cursor * (steps.length - 1);
      for (var i = 0; i < steps.length; i++) {
        var y = top + i * gap;
        if (i < steps.length - 1) line(x, y + 6, x, y + gap - 6, .14 * a, 1);
        var near = Math.max(0, 1 - Math.abs(at - i) * 1.6);
        dot(x, y, 3 + near * 2.4, (.24 + near * .62) * a);
        if (near > .35) ring(x, y, 8 + near * 5, near * .3 * a);
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillStyle = 'rgba(' + A + ',' + ((.26 + near * .5) * a).toFixed(3) + ')';
        ctx.fillText(steps[i], x + 16, y + 3);
      }
    }

    // --- 05 sensor fusion: three sources diverge, then agree on one decision
    function sceneFusion(t, a) {
      var x0 = w * .14, x1 = w * .62, dx = w * .82, mid = h * .5;
      for (var i = 0; i < 3; i++) {
        var base = h * .3 + i * (h * .2);
        ctx.beginPath();
        for (var x = x0; x <= x1; x += 5) {
          var p = (x - x0) / (x1 - x0);
          var noise = Math.sin(x * .07 + t * .0012 + i * 2.1) * (7 * (1 - p));
          var y = base + (mid - base) * (p * p) + noise;
          if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(143,161,181,' + (.34 * a).toFixed(3) + ')';
        ctx.lineWidth = 1; ctx.stroke();
        dot(x0, base, 2.4, .4 * a);
      }
      line(x1, mid, dx, mid, .5 * a, 1.6);
      dot(x1, mid, 4, .75 * a);
      ring(x1, mid, 8 + 2.5 * Math.sin(t * .002), .22 * a);
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(' + A + ',' + (.45 * a).toFixed(3) + ')';
      ctx.fillText('DECISION', dx - 46, mid - 12);
    }

    // --- 06 modernisation: one slab becomes separated modules
    function sceneModules(t, a) {
      var phase = (Math.sin(t * .0006) + 1) / 2;       // 0 monolith, 1 modules
      var cx = w * .5, cy = h * .5, bw = w * .3, bh = h * .34;
      var cols = 3, rows = 3;
      var cw = bw / cols, ch = bh / rows;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var sp = phase * 7;
          var x = cx - bw / 2 + c * cw + (c - 1) * sp;
          var y = cy - bh / 2 + r * ch + (r - 1) * sp;
          var inset = phase * 1.5;
          ctx.beginPath();
          ctx.rect(x + inset, y + inset, cw - inset * 2 - 1, ch - inset * 2 - 1);
          ctx.fillStyle = 'rgba(' + A + ',' + ((.05 + phase * .07) * a).toFixed(3) + ')';
          ctx.fill();
          ctx.strokeStyle = 'rgba(' + A + ',' + ((.16 + phase * .34) * a).toFixed(3) + ')';
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }

    var SCENES = [sceneLink, sceneFlow, sceneSpace, sceneAgent, sceneFusion, sceneModules];

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      scenePtr.x += (scenePtr.tx - scenePtr.x) * .06;
      scenePtr.y += (scenePtr.ty - scenePtr.y) * .06;

      drawMotes(t);

      if (shown !== active) { fade -= .05; if (fade <= 0) { shown = active; fade = 0; } }
      else if (fade < 1) { fade = Math.min(1, fade + .05); }

      SCENES[shown](t, Math.max(0, fade));
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    window.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      scenePtr.tx = (e.clientX - r.left) / r.width;
      scenePtr.ty = (e.clientY - r.top) / r.height;
    }, { passive: true });

    window.addEventListener('resize', function () { resize(); seedMotes(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        e[0].isIntersecting ? start() : stop();
      }, { threshold: .01 }).observe(canvas);
    } else { start(); }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    resize(); seedMotes();
  }


  /* ----------------------------------------------------------------------
     9. Ambient field.

     Runs on every page. Slow drifting points with the occasional faint link
     between near neighbours, at a contrast low enough to read as paper grain
     rather than as content.

     The pointer draws points very gently toward it and lifts their opacity,
     so the whole page has the same quiet responsiveness as the hero rather
     than the hero being the only living surface. The pull is deliberately
     weaker than the hero's push: this layer sits behind body copy, and
     anything more assertive would read as movement under the text.

     The canvas is position:fixed and inset:0, so canvas space and viewport
     space are the same thing and the pointer needs no translation. Pauses
     when the tab is hidden.
     ---------------------------------------------------------------------- */
  function wireAmbient() {
    var canvas = document.querySelector('.ambient');
    if (!canvas || reduceMotion) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], raf = null, running = false;
    var scrollY = window.scrollY || 0;
    var R = 190, R2 = R * R;

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with area but is capped, so a large display does not
      // pay more than a laptop does.
      var n = Math.min(64, Math.round((w * h) / 26000));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - .5) * .085,
          vy: (Math.random() - .5) * .065,
          r: .5 + Math.random() * 1.15,
          ph: Math.random() * Math.PI * 2,
          warm: Math.random() < .1
        });
      }
    }

    function frame(t) {
      easePointer(t);
      ctx.clearRect(0, 0, w, h);

      // A whisper of parallax: the field lags the page very slightly.
      var drift = (pageY - scrollY) * .015;
      scrollY += (pageY - scrollY) * .08;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy + drift * .04;
        if (p.x < -8) p.x = w + 8; else if (p.x > w + 8) p.x = -8;
        if (p.y < -8) p.y = h + 8; else if (p.y > h + 8) p.y = -8;

        var tw = .6 + .4 * Math.sin(t * .0007 + p.ph);
        var a = 1, dxr = 0, dyr = 0;

        // Drawn toward the pointer rather than pushed from it. The hero
        // parts around the cursor; here the field gathers, which keeps the
        // two surfaces distinguishable instead of doubling one gesture.
        var dx = ptr.cx - p.x, dy = ptr.cy - p.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          var d = Math.sqrt(d2) || 1;
          var f = 1 - d / R;
          var ff = f * f;
          dxr = (dx / d) * ff * 9;
          dyr = (dy / d) * ff * 9;
          a = 1 + ff * 2.4;
        }

        var px = p.x + dxr, py = p.y + dyr;

        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.warm
          ? 'rgba(242, 145, 63, ' + Math.min(.22, .05 * tw * a).toFixed(3) + ')'
          : 'rgba(0, 229, 160, ' + Math.min(.34, .09 * tw * a).toFixed(3) + ')';
        ctx.fill();

        // Link only to the next couple of points: O(n*k), never O(n squared).
        for (var j = i + 1; j < Math.min(i + 3, pts.length); j++) {
          var q = pts[j];
          var lx = px - q.x, ly = py - q.y;
          var l2 = lx * lx + ly * ly;
          if (l2 > 24000) continue;
          ctx.beginPath();
          ctx.moveTo(px, py); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(0, 229, 160, ' +
            Math.min(.16, .035 * (1 - l2 / 24000) * a).toFixed(3) + ')';
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    resize(); start();
  }


  /* ----------------------------------------------------------------------
     10. LiDAR panel - a scan, not a picture of one.

     The panel used to be several hundred hand-placed SVG circles: a still
     life of a point cloud, with a readout of three numbers that never moved.
     This samples an actual volume - a floor and two walls - yaws it slowly,
     projects it through a single perspective divide, and sweeps a scan band
     through the depth axis.

     The X/Y/Z readout is the centroid of whatever the band is currently
     lighting, so the numbers move because the geometry moved. That is the
     difference between a readout and a decoration, and it is the only
     version worth putting on an engineer's portfolio: a fake telemetry
     display on a page about building real ones would undercut the argument.

     Digits refresh at about 8 Hz rather than per frame. Sixty updates a
     second is unreadable noise; this is the pace real instrument panels
     settle on, and it lets the eye actually track a value.

     Falls back to the static SVG underneath whenever it cannot run, so the
     panel is never an empty rectangle.
     ---------------------------------------------------------------------- */
  function wireLidar() {
    var panel = document.querySelector('.lidar');
    var canvas = panel && panel.querySelector('.lidar__canvas');
    if (!canvas || reduceMotion) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var readX = panel.querySelector('.js-lidar-x');
    var readY = panel.querySelector('.js-lidar-y');
    var readZ = panel.querySelector('.js-lidar-z');

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, raf = null, running = false;
    var yaw = 0, pitch = 0, lastRead = 0;

    /* Sampled geometry. A floor with a slight undulation plus two walls
       reads as a corner of a room; a sphere of random points reads as
       noise, which is what most decorative "point clouds" actually are. */
    var pts = [];
    (function build() {
      var i, u, v;
      for (i = 0; i < 165; i++) {                       // floor
        u = (i % 15) / 14; v = Math.floor(i / 15) / 10;
        pts.push({
          x: (u - .5) * 2.3,
          y: -.55 + Math.sin(u * 5.2 + v * 3.1) * .045,
          z: v * 2.5 - .45
        });
      }
      for (i = 0; i < 55; i++) {                        // left wall
        u = (i % 11) / 10; v = Math.floor(i / 11) / 4;
        pts.push({ x: -1.15, y: -.55 + v * 1.05, z: u * 2.5 - .45 });
      }
      for (i = 0; i < 55; i++) {                        // back wall
        u = (i % 11) / 10; v = Math.floor(i / 11) / 4;
        pts.push({ x: (u - .5) * 2.3, y: -.55 + v * 1.05, z: 2.05 });
      }
    })();

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(t) {
      easePointer(t);
      if (!w || !h) { resize(); }
      ctx.clearRect(0, 0, w, h);

      // Constant slow drift, plus an eased offset the pointer steers. The
      // drift is what keeps it alive when nobody is touching it.
      var target = (ptr.x - .5) * .85;
      yaw += (target - yaw) * .045;
      pitch += (.52 + (ptr.y - .5) * .16 - pitch) * .045;

      var a = t * .00007 + yaw;
      var ca = Math.cos(a), sa = Math.sin(a);
      var cp = Math.cos(pitch), sp = Math.sin(pitch);

      var cx = w / 2, cy = h / 2 + h * .12;
      var fov = h * 1.9, dist = 3.15;

      // The scan band sweeping the depth axis, and the accumulator that
      // turns whatever it lights into the readout.
      var bandZ = -.5 + ((t * .00028) % 1) * 3.05;
      var sx = 0, sy = 0, sz = 0, lit = 0;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];

        var zc = p.z - 1;                    // centre the volume before yaw
        var x1 = p.x * ca + zc * sa;
        var z1 = zc * ca - p.x * sa;
        var y2 = p.y * cp - z1 * sp;
        var z2 = p.y * sp + z1 * cp;

        var d = z2 + dist;
        if (d < .35) continue;               // behind the near plane

        var k = fov / d;
        var px = cx + x1 * k;
        var py = cy - y2 * k;
        if (px < -4 || px > w + 4 || py < -4 || py > h + 4) continue;

        // Depth cue: near points larger and brighter, far points recede.
        var near = (4.5 - d) / 2.4;
        near = near < 0 ? 0 : near > 1 ? 1 : near;

        var db = Math.abs(p.z - bandZ);
        var glow = db < .2 ? (1 - db / .2) : 0;
        glow *= glow;

        if (glow > .05) {
          sx += p.x; sy += p.y; sz += p.z; lit++;
        }

        var alpha = .1 + near * .34 + glow * .55;
        var size = .5 + near * .85 + glow * .9;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = glow > .25
          ? 'rgba(150, 255, 220, ' + (alpha > 1 ? 1 : alpha).toFixed(3) + ')'
          : 'rgba(0, 229, 160, ' + (alpha > 1 ? 1 : alpha).toFixed(3) + ')';
        ctx.fill();
      }

      if (lit && readX && t - lastRead > 120) {
        lastRead = t;
        // Scaled to plausible metres. The value is the band centroid, so it
        // tracks the sweep and the yaw rather than a random walk.
        readX.textContent = 'X: ' + (sx / lit * 5.4 + 12.4).toFixed(2) + ' m';
        readY.textContent = 'Y: ' + (sy / lit * 5.4 - 8.2).toFixed(2) + ' m';
        readZ.textContent = 'Z: ' + (sz / lit * 1.35 + 1.6).toFixed(2) + ' m';
      }

      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    resize();
    panel.classList.add('is-live');   // hands the panel over from the static SVG

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        e[0].isIntersecting ? start() : stop();
      }, { threshold: .01 }).observe(canvas);
    } else {
      start();
    }
  }

  /* ----------------------------------------------------------------------
     11. Card tilt.

     A small parallax on the story cards: the card leans a few
     degrees away from the cursor, which reads as the card having thickness.
     The rotation is written as two custom properties and composed in CSS
     alongside the hover lift, so there is exactly one transform on the
     element and the two effects cannot fight each other.

     Pointer-only and motion-sensitive. On touch, `:hover` still gives the
     lift, so nothing is lost - a tilt keyed to a cursor that does not exist
     would either never fire or stick on after a tap.
     ---------------------------------------------------------------------- */
  function wireTilt() {
    if (reduceMotion || !finePointer) return;

    var cards = document.querySelectorAll('.story');
    if (!cards.length) return;

    Array.prototype.forEach.call(cards, function (card) {
      var box = null;

      card.addEventListener('pointerenter', function () {
        box = card.getBoundingClientRect();
        card.classList.add('is-tilting');
      });

      card.addEventListener('pointermove', function (e) {
        if (!box) box = card.getBoundingClientRect();
        // -0.5 at one edge, +0.5 at the other.
        card.style.setProperty('--tx', ((e.clientX - box.left) / box.width - .5).toFixed(3));
        card.style.setProperty('--ty', ((e.clientY - box.top) / box.height - .5).toFixed(3));
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--tx', '0');
        card.style.setProperty('--ty', '0');
        box = null;
      });

      // A card can also scroll out from under a held pointer, and the rail
      // scrolls horizontally under the cursor constantly. Re-measuring on
      // the next enter is enough; dropping the stale box here avoids
      // tilting against a rectangle that has since moved.
      card.addEventListener('pointercancel', function () {
        card.classList.remove('is-tilting');
        box = null;
      });
    });
  }

  /* ----------------------------------------------------------------------
     12. Metric count-up.

     The four figures in the metrics band are the one place on the page where
     a reader is expected to stop for a beat, and they were arriving as static
     type. Counting them up on entry buys that beat honestly - the number
     lands on exactly what the markup says, so nothing is being dramatised.

     The suffix is preserved rather than re-derived: "52+" counts to 52 and
     keeps its plus. The band is already tabular-nums, so the width does not
     twitch as digits change.

     Under reduced motion the function never runs and the markup stands as
     written, which is why the final value lives in the HTML rather than in
     a data attribute - with no script at all, the numbers are simply there.
     ---------------------------------------------------------------------- */
  function wireCountUp() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    var nums = document.querySelectorAll('.metric b');
    if (!nums.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        run(entry.target);
      });
    }, { threshold: .6 });

    function run(el) {
      var m = /^(\d+)(.*)$/.exec(el.textContent.trim());
      if (!m) return;                         // anything unparsed is left alone
      var target = parseInt(m[1], 10);
      var suffix = m[2];
      if (!isFinite(target) || target <= 0) return;

      var DUR = 900, t0 = 0;

      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / DUR);
        var eased = 1 - Math.pow(1 - p, 3);   // ease-out: fast start, soft landing
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target + suffix;   // land exactly on the markup
      }
      el.textContent = '0' + suffix;
      requestAnimationFrame(step);
    }

    nums.forEach(function (el) { io.observe(el); });
  }

  function init() {
    wireMail();
    wireNav();
    wireReveal();
    wireActiveNav();
    wireRail();
    wireCloud();
    wireYear();
    wireNarrative();
    wireAmbient();
    wireLidar();
    wireTilt();
    wireCountUp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
