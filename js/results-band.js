/* JB PORTFOLIO / results-band.js (Case 01 results: dot grid, chart playback, HUD contrast) */

(() => {
  const band = document.querySelector(".results-band");
  if (!band) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* one dot per product page. The stagger runs right to left, so the catalogue
     visibly collapses toward the block of pages that survived. */
  document.querySelectorAll(".dots[data-total]").forEach((grid) => {
    const total = Number(grid.dataset.total);
    const keep = Number(grid.dataset.keep);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("i");
      if (i < keep) dot.className = "keep";
      dot.style.setProperty("--d", `${Math.round((total - i) * 7)}ms`);
      frag.appendChild(dot);
    }
    grid.appendChild(frag);
  });

  /* The band plays as a sequence, top to bottom: each part waits until it has
     scrolled up past TRIGGER_LINE, and never starts before the part above it.
     Panels sharing a row cross the line together, so the gap is what staggers
     them; stacked on a phone they each simply wait for their own scroll. */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const TRIGGER_LINE = 0.65;   // fraction of the viewport, from the top
    const GAP_MS = 550;          // between one part starting and the next
    const parts = [...band.querySelectorAll(".rb-head, .viz")];
    let reached = -1;            // furthest part that has crossed the line
    let played = -1;             // furthest part that has started
    let timer = null;

    const playNext = () => {
      timer = null;
      if (played >= reached) return;
      played += 1;
      const part = parts[played];
      part.classList.add("is-in");
      /* a part already scrolled off the top has no audience, so don't wait on it */
      const seen = part.getBoundingClientRect().bottom > 0;
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

    band.classList.add("rb-arming");
    parts.forEach((part) => part.classList.add("is-armed"));
    void band.offsetWidth;   // commit the rewound state before transitions return
    band.classList.remove("rb-arming");
    parts.forEach((part) => io.observe(part));
  }

  /* HUD text and brackets are dark-on-tan, so flip each one while it is over
     the band. Checked per element because the top and bottom of the HUD cross
     the band's edges at different moments. */
  const hudParts = document.querySelectorAll(".hud-item, .hud-corner");
  let queued = false;
  const syncHud = () => {
    queued = false;
    const { top, bottom } = band.getBoundingClientRect();
    hudParts.forEach((el) => {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      el.classList.toggle("on-dark", mid > top && mid < bottom);
    });
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(syncHud);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  syncHud();
})();
