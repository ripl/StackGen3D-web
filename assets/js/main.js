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
