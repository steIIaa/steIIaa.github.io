(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ */
  /* Footer year                                                        */
  /* ------------------------------------------------------------------ */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ */
  /* Mobile nav toggle                                                   */
  /* ------------------------------------------------------------------ */
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
    mainNav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Active nav link on scroll                                           */
  /* ------------------------------------------------------------------ */
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = "#" + entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((section) => navObserver.observe(section));
  }

  /* ------------------------------------------------------------------ */
  /* Reveal-on-scroll                                                     */
  /* ------------------------------------------------------------------ */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Tiny seeded RNG — deterministic art per game title                  */
  /* ------------------------------------------------------------------ */
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  }

  const VIOLETS = ["#cb4fff", "#9a3ce0", "#6d28d9", "#e7bbff", "#4c2a73", "#1b1128"];

  function pick(rand, arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  /* Draws a generative "cartridge cover" onto a canvas, one of a few
     motifs, all built from the violet palette. Purely procedural —
     stands in for artwork we don't have photos for. */
  function paintProceduralArt(canvas, seedStr) {
    const rand = hashSeed(seedStr);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 120);
    const h = Math.max(rect.height, 90);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // base gradient
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, pick(rand, ["#1b1128", "#150f1e", "#100a19"]));
    g.addColorStop(1, pick(rand, ["#0a0710", "#170f24"]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const motif = Math.floor(rand() * 3);

    if (motif === 0) {
      // horizon bars — layered mountain-like silhouettes
      const layers = 4;
      for (let i = 0; i < layers; i++) {
        const baseY = h * (0.35 + i * 0.16);
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, baseY);
        const steps = 6;
        for (let s = 0; s <= steps; s++) {
          const x = (w / steps) * s;
          const y = baseY - rand() * h * 0.18;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? pick(rand, VIOLETS) : "rgba(203,79,255,0.12)";
        ctx.globalAlpha = 0.55 + i * 0.1;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // sun / moon dot
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.28, h * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = "#cb4fff";
      ctx.shadowColor = "#cb4fff";
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (motif === 1) {
      // scattered pixel grid — sparse lit cells
      const cols = 12;
      const rows = 9;
      const cw = w / cols;
      const ch = h / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (rand() > 0.86) {
            ctx.fillStyle = pick(rand, ["#cb4fff", "#e7bbff", "#9a3ce0"]);
            ctx.globalAlpha = 0.5 + rand() * 0.5;
            ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
          }
        }
      }
      ctx.globalAlpha = 1;
    } else {
      // radiating arcs from a corner
      const cx = pick(rand, [0, w]);
      const cy = pick(rand, [0, h]);
      const rings = 7;
      for (let i = 0; i < rings; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (Math.max(w, h) / rings) * (i + 1), 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? "rgba(203,79,255,0.5)" : "rgba(203,79,255,0.15)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#e7bbff";
      ctx.shadowColor = "#cb4fff";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // fine grain vignette to tie it back to the overall page texture
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, w, h * 0.06);
  }

  document.querySelectorAll(".game-card").forEach((card) => {
    const canvas = card.querySelector("canvas");
    const seed = card.dataset.seed || card.querySelector("h3")?.textContent || "uv";
    if (canvas) {
      paintProceduralArt(canvas, seed);
      window.addEventListener("resize", () => paintProceduralArt(canvas, seed));
    }
  });

  /* ------------------------------------------------------------------ */
  /* Hero "cartridge screen" — ambient animated signal, not a photo       */
  /* ------------------------------------------------------------------ */
  const heroCanvas = document.getElementById("heroCanvas");
  if (heroCanvas) {
    const ctx = heroCanvas.getContext("2d");
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;
    const rand = hashSeed("ultraviolet-hero");

    function resize() {
      const rect = heroCanvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      heroCanvas.width = w * dpr;
      heroCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // a small field of drifting points, connected when close — a quiet
    // "signal" pattern rather than anything trying to be a portrait
    const COUNT = 46;
    const points = Array.from({ length: COUNT }, () => ({
      x: rand() * w,
      y: rand() * h,
      vx: (rand() - 0.5) * 0.18,
      vy: (rand() - 0.5) * 0.18,
      r: 0.6 + rand() * 1.6,
    }));

    let raf;
    function frame() {
      ctx.clearRect(0, 0, w, h);

      // background sweep
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.75);
      grad.addColorStop(0, "rgba(203,79,255,0.10)");
      grad.addColorStop(1, "rgba(5,3,8,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      points.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });

      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const a = points[i], b = points[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = w * 0.16;
          if (dist < maxDist) {
            ctx.strokeStyle = `rgba(203,79,255,${(1 - dist / maxDist) * 0.35})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "#e7bbff";
        ctx.fill();
      });

      raf = requestAnimationFrame(frame);
    }

    if (reduceMotion) {
      frame();
      cancelAnimationFrame(raf);
    } else {
      frame();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Subtle parallax on hero floating shapes                             */
  /* ------------------------------------------------------------------ */
  if (!reduceMotion) {
    const heroVisual = document.querySelector(".hero-visual");
    const shapes = document.querySelectorAll(".hero-shape, .cartridge");
    if (heroVisual && shapes.length) {
      heroVisual.addEventListener("pointermove", (e) => {
        const rect = heroVisual.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        shapes.forEach((el, i) => {
          const depth = (i + 1) * 4;
          el.style.transform = `translate(${px * depth}px, ${py * depth}px)`;
        });
      });
      heroVisual.addEventListener("pointerleave", () => {
        shapes.forEach((el) => (el.style.transform = ""));
      });
    }
  }
})();
