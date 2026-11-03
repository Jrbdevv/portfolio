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

  /* charts play once, the first time they are properly on screen */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }), { threshold: 0.3 });
    band.classList.add("rb-arming");
    band.querySelectorAll(".viz").forEach((viz) => viz.classList.add("is-armed"));
    void band.offsetWidth;   // commit the rewound state before transitions return
    band.classList.remove("rb-arming");
    band.querySelectorAll(".viz").forEach((viz) => io.observe(viz));
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
