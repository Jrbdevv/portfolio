/* JB PORTFOLIO / evolve-zoom.js (Case 03: zoom into the Evolve homepage, play its engine, scroll through it) */

/* Command Center tour: the frame pins, and scrolling moves through its real views */
(() => {
  const band = document.querySelector(".ev-dash");
  if (!band || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const stage = band.querySelector(".ev-dash-stage");
  const screen = band.querySelector(".ev-dash-screen");
  const iframe = band.querySelector("iframe");
  const steps = [...band.querySelectorAll(".ev-steps li")];
  const STEP_VH = 0.7;     // scrolling per view
  const spacer = document.createElement("div");
  stage.after(spacer);
  let current = -1;

  const size = () => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const phone = vw <= 860;
    /* a real desktop-width layout scaled to fit; phones get the dashboard's own layout */
    const W = phone ? screen.clientWidth : 1360;
    const fit = screen.clientWidth / W;
    /* leave room for the browser bar and the step notes under the frame */
    const room = phone ? vh * 0.5 : Math.min(vh * 0.62, screen.clientWidth * 0.6);
    iframe.style.width = `${W}px`;
    iframe.style.height = `${room / fit}px`;
    iframe.style.transform = `scale(${fit})`;
    screen.style.height = `${room}px`;
    /* a spacer rather than a margin: a sticky element's own margin eats its pinned travel */
    spacer.style.height = `${STEP_VH * vh * (steps.length - 1)}px`;
  };

  const show = (i) => {
    if (i === current) return;
    current = i;
    steps.forEach((s, k) => s.classList.toggle("is-on", k === i));
    const doc = iframe.contentDocument;
    const go = doc && doc.querySelector(`[data-go="${steps[i].dataset.go}"]`);
    if (go) go.click();
    if (doc && doc.scrollingElement) doc.scrollingElement.scrollTop = 0;
  };

  let queued = false;
  const render = () => {
    queued = false;
    const vh = window.innerHeight;
    const head = band.querySelector(".ev-dash-head").getBoundingClientRect();
    const start = head.bottom + window.scrollY - Math.max(vh * 0.05, 40);
    const p = (window.scrollY - start) / (STEP_VH * vh);
    show(Math.min(steps.length - 1, Math.max(0, Math.floor(p + 0.5))));
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  };

  band.classList.add("is-live");
  size();
  show(0);
  iframe.addEventListener("load", () => {
    const i = current;
    current = -1;
    show(i);
  });
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", () => {
    size();
    queue();
  });
})();

(() => {
  const section = document.querySelector(".ev-zoom");
  if (!section) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const frame = section.querySelector(".ev-frame");
  const screen = section.querySelector(".ev-screen");
  const iframe = section.querySelector("iframe");
  const bg = section.querySelector(".ev-bg");
  const caption = section.querySelector(".ev-caption");
  const hud = document.querySelector(".hud");
  const dashBand = document.querySelector(".ev-dash");
  const hudParts = [...document.querySelectorAll(".hud-item, .hud-corner")];
  const stills = {
    start: section.querySelector('[data-still="start"]'),
    end: section.querySelector('[data-still="end"]'),
  };

  const mirror = section.querySelector(".ev-mirror");
  const mirrorCtx = mirror.getContext("2d");
  let mirrorRaf = 0;

  /* a piece of the site's text, drawn where it sits now, in its own computed style */
  const drawText = (text, rect, cs, origin, res, alpha) => {
    if (!text || alpha <= 0) return;
    const ctx = mirrorCtx;
    const str = cs.textTransform === "uppercase" ? text.toUpperCase() : text;
    const spacing = parseFloat(cs.letterSpacing) || 0;
    ctx.globalAlpha = alpha;
    ctx.font = `${cs.fontWeight} ${parseFloat(cs.fontSize) * res}px ${cs.fontFamily}`;
    ctx.fillStyle = cs.color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    let x = (rect.left - origin.left) * res;
    const y = (rect.top + rect.height / 2 - origin.top) * res;
    /* per character, since canvas letter-spacing isn't supported everywhere */
    for (const ch of str) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + spacing * res;
    }
    ctx.globalAlpha = 1;
  };

  /* The engine keeps running in the hidden site, so its canvas and nodes are copied
     here each frame. Only this one canvas changes during a zoom, not a whole page,
     so it keeps moving without bringing the flicker back. */
  const drawMirror = (doc, source, engine, res) => {
    const ctx = mirrorCtx;
    const win = iframe.contentWindow;
    const origin = engine.getBoundingClientRect();
    ctx.clearRect(0, 0, mirror.width, mirror.height);
    ctx.drawImage(source, 0, 0, mirror.width, mirror.height);

    /* the site lays a dark scrim over its canvas (desktop only); this copy sits above the
       still that already has it, so fade the canvas by the same amounts to match */
    const scrim = doc.querySelector(".scrim");
    if (scrim && win.getComputedStyle(scrim).display !== "none") {
      const w = mirror.width;
      const h = mirror.height;
      const across = ctx.createLinearGradient(0, 0, w, 0);
      across.addColorStop(0, "rgba(0,0,0,.86)");
      across.addColorStop(0.3, "rgba(0,0,0,.62)");
      across.addColorStop(0.54, "rgba(0,0,0,0)");
      const down = ctx.createLinearGradient(0, 0, 0, h);
      down.addColorStop(0, "rgba(0,0,0,.55)");
      down.addColorStop(0.22, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = across;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = down;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    const core = doc.getElementById("coreLabel");
    if (core) {
      const cs = win.getComputedStyle(core);
      const alpha = parseFloat(cs.opacity);
      const range = doc.createRange();
      core.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          range.selectNode(child);
          drawText(child.textContent.trim(), range.getBoundingClientRect(), cs, origin, res, alpha);
        } else if (child.nodeType === 1) {
          drawText(child.textContent.trim(), child.getBoundingClientRect(), win.getComputedStyle(child), origin, res, alpha);
        }
      });
    }

    const pulse = (performance.now() % 2600) / 2600;
    doc.querySelectorAll(".node").forEach((node) => {
      const op = parseFloat(node.style.opacity || "1");
      const dotEl = node.querySelector(".node-dot");
      const labelEl = node.querySelector(".node-label");
      if (!dotEl || !labelEl) return;
      const d = dotEl.getBoundingClientRect();
      const x = (d.left + d.width / 2 - origin.left) * res;
      const y = (d.top + d.height / 2 - origin.top) * res;
      const r = (d.width / 2) * res;
      /* the soft ring the site gives each dot with box-shadow */
      ctx.globalAlpha = op * 0.16;
      ctx.fillStyle = "#62ccff";
      ctx.beginPath();
      ctx.arc(x, y, r + 4 * res, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = op;
      ctx.shadowColor = "rgba(98,204,255,.55)";
      ctx.shadowBlur = 18 * res;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = op * 0.4 * (1 - pulse);
      ctx.strokeStyle = "#62ccff";
      ctx.lineWidth = res;
      ctx.beginPath();
      ctx.arc(x, y, r + (9 + pulse * 10) * res, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const cs = win.getComputedStyle(labelEl);
      ctx.shadowColor = "rgba(4,12,30,.9)";
      ctx.shadowBlur = 10 * res;
      drawText(labelEl.textContent, labelEl.getBoundingClientRect(), cs, origin, res, op * parseFloat(cs.opacity));
      ctx.shadowBlur = 0;
    });
  };

  const stopMirror = () => {
    cancelAnimationFrame(mirrorRaf);
    mirrorRaf = 0;
    mirror.classList.remove("is-on");
  };

  const startMirror = () => {
    stopMirror();
    const doc = iframe.contentDocument;
    const source = doc && doc.getElementById("engineCanvas");
    const engine = doc && doc.getElementById("engine");
    if (!source || !engine) return;
    const rect = engine.getBoundingClientRect();
    const res = Math.min(1.5, window.devicePixelRatio || 1);
    mirror.width = Math.round(rect.width * res);
    mirror.height = Math.round(rect.height * res);
    mirror.style.left = `${rect.left}px`;
    mirror.style.top = `${rect.top}px`;
    mirror.style.width = `${rect.width}px`;
    mirror.style.height = `${rect.height}px`;
    mirror.classList.add("is-on");
    const tick = () => {
      /* the frame sits at rest on the page, so skip the work while it's scrolled away */
      const box = section.getBoundingClientRect();
      if (box.bottom > 0 && box.top < window.innerHeight) drawMirror(doc, source, engine, res);
      mirrorRaf = requestAnimationFrame(tick);
    };
    tick();
  };

  /* the timeline, in viewport heights of scrolling */
  const HOLD = 0.2;        // frame at rest before anything moves
  const ZOOM_IN = 0.9;
  const ENGINE = 1.7;      // full screen while the neural engine plays: 2 to 3 scrolls
  const SETTLE = 0.2;      // the finished engine gets a moment on screen
  const ZOOM_OUT = 0.9;

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);

  let m = null;   // measurements
  let hudMids = [];
  let mode = null;

  /* While the frame is changing size it shows a frozen image: a live page, with its
     canvas, video and blur, flickers when re-rendered at a new scale every frame.
     The site is switched on only when it holds still: full screen, or back in the frame. */
  const setMode = (next) => {
    if (next === mode) return;
    mode = next;
    const still = next === "start" || next === "end" ? stills[next] : null;
    /* before the site is hidden, so the first copied frame is already in place */
    if (still) startMirror();
    frame.classList.toggle("is-frozen", !!still);
    const radius = next === "full" ? 0 : 12 / m.sRest;
    screen.style.borderRadius = `0 0 ${radius}px ${radius}px`;
    if (still) {
      Object.values(stills).forEach((img) => img.classList.toggle("is-on", img === still));
      iframe.style.visibility = "hidden";
      return;
    }
    /* reveal the site first and drop the image a frame later, so there's no blank gap */
    iframe.style.visibility = "visible";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (mode !== next) return;
      Object.values(stills).forEach((img) => img.classList.remove("is-on"));
      stopMirror();
    }));
  };

  const measure = () => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    /* The site always renders at one fixed design size and is scaled to fill, so the
       stills and the live page are the same picture on every screen: a window-sized
       layout would put the text and bridge somewhere else when they swap. Phones use
       its real mobile layout, since the desktop one would be unreadable scaled down. */
    const phone = vw <= 880;
    const W = phone ? 390 : 1440;
    const sizes = phone ? [844] : [780, 810, 900, 1080];
    const ideal = (W * vh) / vw;
    /* the captured height closest to this window's shape, so little gets cropped */
    const H = sizes.reduce((best, h) => (Math.abs(h - ideal) < Math.abs(best - ideal) ? h : best));
    const sFull = Math.max(vw / W, vh / H);
    /* at rest it has to fit with its browser bar and the caption above it */
    const CHROME = 44;
    const fit = (vh - (phone ? 150 : 120)) / (H + CHROME);
    const sRest = Math.min(fit, phone ? (vw - 32) / W : Math.min(0.78, (vw - 80) / W));

    Object.entries(stills).forEach(([name, img]) => {
      const src = `../assets/evolve-still-${W}x${H}-${name}.webp`;
      if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    });
    hudMids = hudParts.map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    mode = null;   // the corner radius depends on the size, so re-apply it
    section.style.setProperty("--ev-vh", `${vh}px`);
    frame.style.width = `${W}px`;
    frame.style.height = `${H}px`;

    let heroEnd = 0;
    let maxScroll = 0;
    const doc = iframe.contentDocument;
    if (doc && doc.body) {
      const track = doc.getElementById("heroTrack");
      const stage = doc.getElementById("heroStage");
      const space = doc.getElementById("engineSpace");
      maxScroll = Math.max(0, doc.documentElement.scrollHeight - H);
      if (phone && space) {
        /* the mobile hero isn't pinned: the engine finishes as its block scrolls up */
        const top = space.getBoundingClientRect().top + iframe.contentWindow.scrollY;
        heroEnd = Math.max(0, top - H * 0.9 + space.offsetHeight * 0.9);
      } else if (track && stage) {
        heroEnd = Math.max(0, track.offsetHeight - stage.offsetHeight);
      }
      heroEnd = Math.min(heroEnd, maxScroll);
    }

    /* the walk moves at normal scrolling speed on screen; his mobile page is far
       longer, so phones move through it faster to stay a walk and not a chore */
    const walk = (maxScroll - heroEnd) * sRest * (phone ? 0.5 : 1);
    const a = HOLD * vh;
    const b = a + ZOOM_IN * vh;
    const c = b + ENGINE * vh;
    const d = c + SETTLE * vh;
    const e = d + ZOOM_OUT * vh;
    const f = e + walk;
    section.style.height = `${f + vh}px`;
    m = { vw, vh, W, H, sFull, sRest, heroEnd, maxScroll, a, b, c, d, e, f };
  };

  const scrollSite = (y) => {
    const win = iframe.contentWindow;
    if (win && Math.abs(win.scrollY - y) > 0.5) win.scrollTo({ top: y, behavior: "instant" });
  };

  let queued = false;
  const render = () => {
    queued = false;
    if (!m) return;
    const y = -section.getBoundingClientRect().top;

    const zoomIn = ease(clamp((y - m.a) / (m.b - m.a)));
    const zoomOut = ease(clamp((y - m.d) / (m.e - m.d)));
    const z = zoomIn - zoomOut;   // 0 at rest, 1 full screen
    /* interpolated as a ratio, so the zoom feels even rather than rushing at the start */
    const s = m.sRest * Math.pow(m.sFull / m.sRest, z);
    /* room for the browser bar when at rest; gone when full screen */
    /* full screen lines up with the top, so his nav stays in view if the height is cropped */
    const overflow = Math.max(0, (m.H * m.sFull - m.vh) / 2);
    const drop = (1 - z) * 22 * s + z * overflow;
    frame.style.transform = `translate(-50%, -50%) translateY(${drop.toFixed(1)}px) scale(${s.toFixed(4)})`;
    /* navy arrives with the zoom and stays through the walk */
    const dark = clamp((y - m.a) / ((m.b - m.a) * 0.6));
    bg.style.opacity = dark.toFixed(3);
    caption.style.opacity = (1 - clamp(zoomIn * 2.5)).toFixed(3);

    /* the site itself: still until full screen, then the engine, then the rest of the page */
    const engine = clamp((y - m.b) / (m.c - m.b));
    const walked = clamp((y - m.e) / Math.max(1, m.f - m.e));
    scrollSite(m.heroEnd * engine + (m.maxScroll - m.heroEnd) * walked);
    /* after scrolling the site, since the mirror measures where the engine sits */
    setMode(y < m.b ? "start" : y < m.d ? "full" : y < m.e ? "end" : "walk");

    /* full screen should feel like being inside his site, so the portfolio's HUD steps away */
    if (hud) hud.style.opacity = (1 - clamp((z - 0.35) / 0.4)).toFixed(3);

    const { top, bottom } = section.getBoundingClientRect();
    const dash = dashBand ? dashBand.getBoundingClientRect() : null;
    hudParts.forEach((el, i) => {
      const mid = hudMids[i];
      const overDash = dash && mid > dash.top && mid < dash.bottom;
      el.classList.toggle("on-dark", overDash || (dark > 0.5 && mid > top && mid < bottom));
    });
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  };

  const remeasure = () => {
    measure();
    render();
  };

  section.classList.add("is-live");
  measure();
  render();

  const onSiteReady = () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.documentElement.style.scrollBehavior = "auto";
    doc.documentElement.style.scrollbarWidth = "none";
    remeasure();
    /* fonts and images change the page's height after load */
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasure);
    setTimeout(remeasure, 1200);
  };
  iframe.addEventListener("load", onSiteReady);
  if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") onSiteReady();

  window.addEventListener("scroll", queue, { passive: true });
  /* phone browsers fire resize as their address bar slides: only act on real changes */
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  window.addEventListener("resize", () => {
    const small = window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120;
    if (small) return;
    lastW = window.innerWidth;
    lastH = window.innerHeight;
    remeasure();
  });
})();
