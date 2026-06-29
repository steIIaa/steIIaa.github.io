(function () {
  const canvas = document.getElementById('grid');
  const ctx = canvas.getContext('2d');

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const CELL = 56;            // grid spacing in px
  const RADIUS = 260;          // glow radius around cursor
  const EASE = 0.08;           // pointer lag (lower = lazier follow)
  const BASE_ALPHA = 0.05;     // dim grid line opacity
  const PEAK_ALPHA = 0.85;     // brightest point near cursor
  const VIOLET = [203, 79, 255];
  const WHITE = [246, 246, 246];

  let w, h, dpr;
  let pointer = { x: -9999, y: -9999 };
  let eased = { x: -9999, y: -9999 };
  let hasPointer = false;
  let rafId;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!hasPointer) {
      pointer = { x: w / 2, y: h * 0.4 };
      eased = { ...pointer };
    }
  }

  function onMove(e) {
    hasPointer = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }

  function onTouch(e) {
    if (e.touches && e.touches[0]) {
      hasPointer = true;
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
    }
  }

  function draw() {
    eased.x += (pointer.x - eased.x) * EASE;
    eased.y += (pointer.y - eased.y) * EASE;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const cols = Math.ceil(w / CELL) + 2;
    const rows = Math.ceil(h / CELL) + 2;
    const offsetX = (w % CELL) / 2 - CELL;
    const offsetY = (h % CELL) / 2 - CELL;

    // ambient violet glow that breathes under the cursor
    const grad = ctx.createRadialGradient(
      eased.x, eased.y, 0,
      eased.x, eased.y, RADIUS * 1.4
    );
    grad.addColorStop(0, 'rgba(203, 79, 255, 0.07)');
    grad.addColorStop(1, 'rgba(203, 79, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 1;

    // vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = offsetX + i * CELL;
      drawLine(x, 0, x, h, true);
    }
    // horizontal lines
    for (let j = 0; j <= rows; j++) {
      const y = offsetY + j * CELL;
      drawLine(0, y, w, y, false);
    }

    // bright intersection nodes near the cursor
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const x = offsetX + i * CELL;
        const y = offsetY + j * CELL;
        const dist = Math.hypot(x - eased.x, y - eased.y);
        if (dist < RADIUS) {
          const t = 1 - dist / RADIUS;
          const alpha = Math.pow(t, 2) * PEAK_ALPHA;
          if (alpha > 0.02) {
            const r = 1 + t * 1.6;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            const c = t > 0.55 ? VIOLET : WHITE;
            ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
            ctx.fill();
          }
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function drawLine(x1, y1, x2, y2, vertical) {
    const closest = vertical
      ? clamp(eased.y, y1, y2)
      : clamp(eased.x, x1, x2);
    const cx = vertical ? x1 : closest;
    const cy = vertical ? closest : y1;
    const dist = Math.hypot(cx - eased.x, cy - eased.y);

    let alpha = BASE_ALPHA;
    if (dist < RADIUS) {
      const t = 1 - dist / RADIUS;
      alpha = BASE_ALPHA + Math.pow(t, 2) * 0.35;
    }

    ctx.strokeStyle = `rgba(246, 246, 246, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function drawStatic() {
    // Reduced-motion fallback: faint static grid, no animation loop.
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(246, 246, 246, ${BASE_ALPHA})`;
    ctx.lineWidth = 1;
    const cols = Math.ceil(w / CELL) + 2;
    const rows = Math.ceil(h / CELL) + 2;
    for (let i = 0; i <= cols; i++) {
      const x = i * CELL;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      const y = j * CELL;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  window.addEventListener('resize', () => {
    resize();
    if (prefersReducedMotion) drawStatic();
  });
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });

  resize();

  if (prefersReducedMotion) {
    drawStatic();
  } else {
    draw();
  }
})();
