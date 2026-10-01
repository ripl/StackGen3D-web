// StackGen3D project page: equations, video controls, BibTeX copy, section nav.
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Display equations (plain-text fallback stays if KaTeX fails to load) ----
  if (window.katex) {
    document.querySelectorAll(".eq[data-tex]").forEach(function (el) {
      try {
        window.katex.render(el.getAttribute("data-tex"), el, { displayMode: true, throwOnError: false });
      } catch (e) { /* keep fallback */ }
    });
  }

  // ---- Videos: pause/play button, pause when off screen, respect reduced motion ----
  var PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
  var PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';

  var videos = Array.prototype.slice.call(document.querySelectorAll(".video-box video"));

  function sync(video, btn) {
    var paused = video.paused;
    btn.innerHTML = paused ? PLAY : PAUSE;
    btn.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    video.parentElement.classList.toggle("is-paused", paused && video.dataset.userPaused === "1");
  }

  videos.forEach(function (video) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vid-toggle";
    video.parentElement.appendChild(btn);

    if (reduceMotion) {
      video.removeAttribute("autoplay");
      video.pause();
      video.dataset.userPaused = "1";
    }

    btn.addEventListener("click", function () {
      if (video.paused) {
        video.dataset.userPaused = "0";
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        video.dataset.userPaused = "1";
        video.pause();
      }
    });
    video.addEventListener("play", function () { sync(video, btn); });
    video.addEventListener("pause", function () { sync(video, btn); });
    sync(video, btn);
  });

  if ("IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (v.dataset.userPaused !== "1" && v.paused) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          }
        } else if (!v.paused && !onScreen(v)) {
          v.pause();
        }
      });
    }, { threshold: 0.15 });
    videos.forEach(function (v) { vio.observe(v); });
  }

  // Observer entries can arrive late (e.g. background tabs); re-check before pausing.
  function onScreen(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
  }

  // ---- Best-of-N trade-off: sweep N along the curves; the block gap follows ----
  var tradeoff = document.querySelector(".tradeoff-anim");
  if (tradeoff) initTradeoff(tradeoff);

  function initTradeoff(root) {
    var svg = root.querySelector(".tradeoff-chart");
    var x1 = +root.dataset.x1, x10 = +root.dataset.x10, x100 = +root.dataset.x100;
    var sweep = svg.querySelector(".tc-sweep-rect");
    var cursor = svg.querySelector(".tc-cursor");
    var heads = [
      { el: svg.querySelector(".tc-head.stab"), pts: pointsOf(svg.querySelector(".tc-line.stab")) },
      { el: svg.querySelector(".tc-head.pen"), pts: pointsOf(svg.querySelector(".tc-line.pen")) }
    ];
    var reveal = Array.prototype.slice.call(svg.querySelectorAll(".tc-pt, .tc-val"));
    var p1 = svg.querySelector(".tc-phase.p1"), p2 = svg.querySelector(".tc-phase.p2");
    var blk = root.querySelector(".sc-blk.a"), ov = root.querySelector(".sc-ov"), contact = root.querySelector(".sc-contact");
    var TOP = 50, DMAX = 18;               // the upper block rests on the lower one at y = 50
    var RISE = 3600, HOLD = 1200, FALL = 3200, CYCLE = RISE + HOLD + FALL + HOLD;
    var elapsed = 0, last = null, raf = null, visible = false, userPaused = reduceMotion;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vid-toggle";
    root.appendChild(btn);
    btn.addEventListener("click", function () {
      userPaused = !userPaused;
      if (!userPaused) root.classList.add("is-anim");
      update();
    });

    function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

    function frameAt(t) {
      if (t < RISE) { var u = ease(t / RISE); return { x: x1 + (x10 - x1) * u, d: -DMAX * (1 - u), phase: 1 }; }
      t -= RISE;
      if (t < HOLD) return { x: x10, d: 0, phase: 1 };
      t -= HOLD;
      if (t < FALL) { var v = ease(t / FALL); return { x: x10 + (x100 - x10) * v, d: DMAX * v, phase: 2 }; }
      return { x: x100, d: DMAX, phase: 2 };
    }

    function render(f) {
      sweep.setAttribute("width", f.x.toFixed(1));
      cursor.setAttribute("x1", f.x.toFixed(1));
      cursor.setAttribute("x2", f.x.toFixed(1));
      heads.forEach(function (h) {
        h.el.setAttribute("cx", f.x.toFixed(1));
        h.el.setAttribute("cy", yAt(h.pts, f.x).toFixed(1));
      });
      reveal.forEach(function (el) { el.classList.toggle("is-hidden", +el.getAttribute("data-x") > f.x + 0.5); });
      p1.classList.toggle("is-on", f.phase === 1);
      p2.classList.toggle("is-on", f.phase === 2);
      // d < 0: blocks interpenetrate; d = 0: contact; d > 0: the upper block floats
      blk.setAttribute("y", (TOP - f.d).toFixed(1));
      ov.setAttribute("height", Math.max(0, -f.d).toFixed(1));
      contact.style.opacity = Math.max(0, 1 - Math.abs(f.d) / 3).toFixed(2);
    }

    function tick(now) {
      raf = null;
      if (last !== null) elapsed = (elapsed + Math.min(now - last, 100)) % CYCLE;
      last = now;
      render(frameAt(elapsed));
      if (visible && !userPaused) raf = requestAnimationFrame(tick);
    }

    function update() {
      var run = visible && !userPaused;
      if (run && raf === null) { last = null; raf = requestAnimationFrame(tick); }
      if (!run && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      root.classList.toggle("is-paused", userPaused);
      btn.innerHTML = userPaused ? PLAY : PAUSE;
      btn.setAttribute("aria-label", userPaused ? "Play animation" : "Pause animation");
    }

    if (userPaused) {
      // reduced motion: full static chart, blocks in contact
      render({ x: x100, d: 0, phase: 0 });
    } else {
      root.classList.add("is-anim");
      render(frameAt(0));
    }

    if ("IntersectionObserver" in window) {
      var observed = false;
      new IntersectionObserver(function (entries) {
        observed = true;
        visible = entries[0].isIntersecting;
        update();
      }, { threshold: 0.2 }).observe(root);
      // some embedded/background views never deliver observer callbacks; fall back to running
      setTimeout(function () { if (!observed) { visible = true; update(); } }, 1000);
    } else {
      visible = true;
      update();
    }
  }

  function pointsOf(polyline) {
    return polyline.getAttribute("points").trim().split(/\s+/).map(function (p) {
      var xy = p.split(",");
      return [+xy[0], +xy[1]];
    });
  }

  function yAt(pts, x) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return pts[pts.length - 1][1];
  }

  // ---- Copy BibTeX ----
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    var label = btn.querySelector("span");
    btn.addEventListener("click", function () {
      var target = document.querySelector(btn.getAttribute("data-copy"));
      if (!target) return;
      var text = target.textContent;
      var done = function () {
        btn.classList.add("is-done");
        label.textContent = "Copied";
        setTimeout(function () { btn.classList.remove("is-done"); label.textContent = "Copy"; }, 1800);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text) && done(); });
      } else if (fallbackCopy(text)) {
        done();
      }
    });
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // ---- Top nav: show after the hero, highlight the current section ----
  var nav = document.querySelector(".topnav");
  var hero = document.querySelector(".hero");
  if (nav && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle("is-visible", !entries[0].isIntersecting);
    }).observe(hero);

    var links = {};
    nav.querySelectorAll("nav a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && links[entry.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
          links[entry.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) sio.observe(s);
    });
  }
})();
