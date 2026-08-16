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
     loose particles. Everything parallaxes toward the pointer.

     Skipped under reduced motion and on small screens, where the CSS
     gradient already carries the look at no cost. The canvas is decorative
     and aria-hidden, so nothing is lost when it does not run.
     ---------------------------------------------------------------------- */
  function wireCloud() {
    var canvas = document.querySelector('.hero__field');
    if (!canvas || reduceMotion || coarse) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var COLS = 0, ROWS = 14;
    var motes = [];
    var pointer = { x: .5, y: .5, tx: .5, ty: .5 };
    var raf = null, running = false;

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
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
      ctx.clearRect(0, 0, w, h);

      pointer.x += (pointer.tx - pointer.x) * .05;
      pointer.y += (pointer.ty - pointer.y) * .05;
      var px = (pointer.x - .5) * 30;
      var py = (pointer.y - .5) * 20;

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

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 229, 160, ' + alpha.toFixed(3) + ')';
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

        var tw = .65 + .35 * Math.sin(t * .0013 + i);
        ctx.beginPath();
        ctx.arc(m.x + px * .5, m.y + py * .5, m.r, 0, Math.PI * 2);
        ctx.fillStyle = m.warm
          ? 'rgba(240, 190, 120, ' + (m.a * mf * tw * .8).toFixed(3) + ')'
          : 'rgba(90, 245, 205, ' + (m.a * mf * tw).toFixed(3) + ')';
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop()  { if (running) { running = false; cancelAnimationFrame(raf); } }

    window.addEventListener('pointermove', function (e) {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    }, { passive: true });

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
    var ptr = { x: .5, y: .5, tx: .5, ty: .5 };
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
      var px = (ptr.x - .5) * 22, py = (ptr.y - .5) * 14;
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
      ptr.x += (ptr.tx - ptr.x) * .06;
      ptr.y += (ptr.ty - ptr.y) * .06;

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
      ptr.tx = (e.clientX - r.left) / r.width;
      ptr.ty = (e.clientY - r.top) / r.height;
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
     rather than as content. Pauses when the tab is hidden.
     ---------------------------------------------------------------------- */
  function wireAmbient() {
    var canvas = document.querySelector('.ambient');
    if (!canvas || reduceMotion) return;

    var ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [], raf = null, running = false;
    var scrollY = window.scrollY || 0;

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
      ctx.clearRect(0, 0, w, h);

      // A whisper of parallax: the field lags the page very slightly.
      var drift = (window.scrollY - scrollY) * .015;
      scrollY += (window.scrollY - scrollY) * .08;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy + drift * .04;
        if (p.x < -8) p.x = w + 8; else if (p.x > w + 8) p.x = -8;
        if (p.y < -8) p.y = h + 8; else if (p.y > h + 8) p.y = -8;

        var tw = .6 + .4 * Math.sin(t * .0007 + p.ph);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.warm
          ? 'rgba(242, 145, 63, ' + (.05 * tw).toFixed(3) + ')'
          : 'rgba(0, 229, 160, ' + (.09 * tw).toFixed(3) + ')';
        ctx.fill();

        // Link only to the next couple of points: O(n·k), never O(n squared).
        for (var j = i + 1; j < Math.min(i + 3, pts.length); j++) {
          var q = pts[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > 24000) continue;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(0, 229, 160, ' + (.035 * (1 - d2 / 24000)).toFixed(3) + ')';
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
     10. Visitor counter.

     Talks to the same Firestore document the previous site used, so the
     count carries over rather than restarting. Uses the REST API directly
     instead of the Firebase SDK: the SDK is well over 100 KB and pulls in a
     second origin (gstatic.com), where this is a few lines of fetch against
     one host.

     Set PROJECT and KEY below to enable. Left blank, the whole feature is
     inert and the element stays hidden, so the page never shows a broken or
     zeroed counter.

     The document is guarded server-side by firestore.rules: read is public,
     update must be exactly +1 on a single integer field, delete is denied.
     The sessionStorage check here only avoids double-counting a refresh; it
     is not the security boundary and is trivially bypassed.
     ---------------------------------------------------------------------- */
  var COUNTER = {
    PROJECT: '',            // Firebase project id
    KEY:     '',            // Firebase web API key
    PATH:    'visitors/counter'
  };

  function wireCounter() {
    var el = document.querySelector('.js-visits');
    if (!el) return;
    if (!COUNTER.PROJECT || !COUNTER.KEY) return;   // stays hidden until configured

    var base = 'https://firestore.googleapis.com/v1/projects/' + COUNTER.PROJECT +
               '/databases/(default)/documents';
    var docPath = base + '/' + COUNTER.PATH;
    var docName = 'projects/' + COUNTER.PROJECT + '/databases/(default)/documents/' + COUNTER.PATH;

    function show(n) {
      if (typeof n !== 'number' || !isFinite(n) || n < 0) return;
      el.textContent = n.toLocaleString();
      el.closest('.visits').hidden = false;
    }

    function read() {
      return fetch(docPath + '?key=' + COUNTER.KEY, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var v = d && d.fields && d.fields.count && d.fields.count.integerValue;
          return v == null ? null : parseInt(v, 10);
        });
    }

    function bump() {
      return fetch(base + ':commit?key=' + COUNTER.KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writes: [{
            update: { name: docName, fields: {} },
            updateMask: { fieldPaths: [] },          // touch no ordinary field
            updateTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
            currentDocument: { exists: true }
          }]
        })
      });
    }

    var KEY = 'np_visit_counted';
    var counted = false;
    try { counted = sessionStorage.getItem(KEY) === '1'; } catch (e) { counted = true; }

    read().then(function (n) {
      if (n === null) return;
      if (counted) { show(n); return; }
      show(n + 1);                                   // optimistic, so it never lags
      return bump().then(function () {
        try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
      });
    }).catch(function () { /* a counter is never worth breaking a page over */ });
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
    wireCounter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
