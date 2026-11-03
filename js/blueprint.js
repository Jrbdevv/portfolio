/* JB PORTFOLIO / blueprint.js (Case 02: drafting sheets, timeline scrub, product view, HUD contrast) */

(() => {
  const bands = [...document.querySelectorAll(".bp-band")];
  if (!bands.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canObserve = "IntersectionObserver" in window;
  const scrollWork = [];

  /* climbs to the figure already in the HTML, slowing as it lands, then stops:
     the number never runs past the real total or implies live sales data */
  const countUp = (el) => {
    const to = Number(el.dataset.countTo);
    const DURATION_MS = 2200;
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `$${(to * eased).toFixed(1)}M`;
      if (t < 1) requestAnimationFrame(frame);
      else el.closest("h2").classList.add("is-counted");
    };
    el.textContent = "$0.0M";
    requestAnimationFrame(frame);
  };

  /* parts play top to bottom: each waits until it has scrolled up past the
     trigger line, and never starts before the part above it */
  if (!reduceMotion && canObserve) {
    const TRIGGER_LINE = 0.72;   // fraction of the viewport, from the top
    const GAP_MS = 450;          // between one part starting and the next
    const parts = [...document.querySelectorAll("[data-seq]")];
    let reached = -1;
    let played = -1;
    let timer = null;

    const playNext = () => {
      timer = null;
      if (played >= reached) return;
      played += 1;
      parts[played].classList.add("is-in");
      parts[played].querySelectorAll("[data-count-to]").forEach(countUp);
      /* a part already scrolled off the top has no audience, so don't wait on it */
      const seen = parts[played].getBoundingClientRect().bottom > 0;
      timer = setTimeout(playNext, seen ? GAP_MS : 0);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        reached = Math.max(reached, parts.indexOf(e.target));
        io.unobserve(e.target);
      });
      if (!timer) playNext();
    }, { rootMargin: `0px 0px -${Math.round((1 - TRIGGER_LINE) * 100)}% 0px` });

    document.documentElement.classList.add("bp-arming");
    parts.forEach((part) => part.classList.add("is-armed"));
    void document.documentElement.offsetWidth;   // commit before transitions return
    document.documentElement.classList.remove("bp-arming");
    parts.forEach((part) => io.observe(part));
  }

  /* timeline: the rail fills with scroll, and a milestone lights when it is reached.
     Offsets are measured, since the rail runs across on desktop and down on phones. */
  const tl = document.querySelector(".bp-tl");
  if (tl && !reduceMotion) {
    const track = tl.querySelector(".bp-tl-track");
    const items = [...tl.querySelectorAll("li")];
    tl.classList.add("is-live");
    scrollWork.push(() => {
      const r = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.82;                   // rail starts filling here...
      const end = vh * 0.5 - r.height;           // ...and is full once it is well on screen
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
      track.style.setProperty("--p", p.toFixed(3));
      const vertical = r.height > r.width;
      const length = vertical ? r.height : r.width;
      items.forEach((li) => {
        const box = li.getBoundingClientRect();
        const offset = vertical ? box.top - r.top : box.left - r.left;
        li.classList.toggle("is-on", p * length >= offset);
      });
    });
  }

  /* product view: whichever note is at the middle of the screen picks the sheet */
  const pv = document.querySelector(".pv");
  if (pv && canObserve) {
    const steps = [...pv.querySelectorAll(".pv-step")];
    const views = [...pv.querySelectorAll(".pv-view")];
    const show = (i) => {
      steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
      views.forEach((v, k) => v.classList.toggle("is-on", k === i));
    };
    pv.classList.add("is-live");
    show(0);
    const stepIo = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) show(steps.indexOf(e.target));
    }), { rootMargin: "-48% 0px -48% 0px" });
    steps.forEach((s) => stepIo.observe(s));
  }

  /* HUD text and brackets are dark-on-tan, so flip each one while it is over a
     band. Checked per element, since the HUD's top and bottom cross at different times. */
  const hudParts = [...document.querySelectorAll(".hud-item, .hud-corner")];
  scrollWork.push(() => {
    const rects = bands.map((b) => b.getBoundingClientRect());
    hudParts.forEach((el) => {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      el.classList.toggle("on-dark", rects.some((b) => mid > b.top && mid < b.bottom));
    });
  });

  let queued = false;
  const run = () => {
    queued = false;
    scrollWork.forEach((fn) => fn());
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  window.addEventListener("load", queue);
  run();
})();
