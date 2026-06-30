/* ============================================
   ultraviolet. — interactive constellation background
   Nodes drift in straight lines, bouncing off the edges.
   Lines connect nearby nodes. The cursor directly pushes
   nodes aside (snappy, not steered) — they speed up while
   being pushed and settle back to normal drift after.
   ============================================ */

(function () {
  const canvas = document.getElementById('grid');
  const ctx = canvas.getContext('2d');

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // --- config ---
  // Node count auto-scales with screen area rather than being fixed,
  // so it stays proportionally dense on both small and large screens.
  // Lower AREA_PER_NODE = more nodes (denser); raise it for fewer.
  const AREA_PER_NODE = 9000;
  const LINK_DIST_SQ  = 15000; // squared distance for link check (avoids sqrt per pair, per frame)
  const PUSH_RADIUS   = 80;    // how far the cursor reaches to push nodes
  const PUSH_AMOUNT   = 7;     // px nodes are shoved per frame while inside the push radius
  const DRIFT_SPEED   = 0.5;   // base ambient drift speed per axis

  let w, h, dpr;
  let nodes = [];
  let pointer = { x: -9999, y: -9999 };
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
    buildNodes();
  }

  function buildNodes() {
    nodes = [];
    const count = Math.floor((w * h) / AREA_PER_NODE);
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 1.5 + 1;
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size,
        dx: (Math.random() - 0.5) * DRIFT_SPEED,
        dy: (Math.random() - 0.5) * DRIFT_SPEED
      });
    }
  }

  function onMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }

  function onTouch(e) {
    if (e.touches && e.touches[0]) {
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
    }
  }

  function update() {
    for (const n of nodes) {
      // bounce off edges
      if (n.x > w || n.x < 0) n.dx = -n.dx;
      if (n.y > h || n.y < 0) n.dy = -n.dy;

      // direct push away from cursor — snappy, not steered.
      // nodes move faster than normal while inside the radius,
      // and settle back to their regular drift once they leave it.
      const dx = pointer.x - n.x;
      const dy = pointer.y - n.y;
      const dist = Math.hypot(dx, dy);
      if (dist < PUSH_RADIUS) {
        if (pointer.x < n.x && n.x < w - n.size * 10) n.x += PUSH_AMOUNT;
        if (pointer.x > n.x && n.x > n.size * 10) n.x -= PUSH_AMOUNT;
        if (pointer.y < n.y && n.y < h - n.size * 10) n.y += PUSH_AMOUNT;
        if (pointer.y > n.y && n.y > n.size * 10) n.y -= PUSH_AMOUNT;
      }

      n.x += n.dx;
      n.y += n.dy;
    }
  }

  function draw() {
    update();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // connecting lines between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < LINK_DIST_SQ) {
          const t = 1 - distSq / LINK_DIST_SQ;
          const nearCursor = Math.min(
            Math.hypot(a.x - pointer.x, a.y - pointer.y),
            Math.hypot(b.x - pointer.x, b.y - pointer.y)
          );
          const glow = nearCursor < PUSH_RADIUS ? (1 - nearCursor / PUSH_RADIUS) : 0;
          const alpha = t * 0.32 + glow * 0.5;
          ctx.strokeStyle = glow > 0.4
            ? `rgba(203,79,255,${alpha})`
            : `rgba(246,246,246,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes, glowing violet when near the cursor
    for (const n of nodes) {
      const dist = Math.hypot(n.x - pointer.x, n.y - pointer.y);
      const near = dist < PUSH_RADIUS ? (1 - dist / PUSH_RADIUS) : 0;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size + near * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = near > 0.3
        ? `rgba(203,79,255,${0.5 + near * 0.5})`
        : `rgba(246,246,246,0.6)`;
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  }

  function drawStatic() {
    // Reduced-motion fallback: draw one static frame, no animation loop.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < LINK_DIST_SQ) {
          const alpha = (1 - distSq / LINK_DIST_SQ) * 0.18;
          ctx.strokeStyle = `rgba(246,246,246,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(246,246,246,0.6)';
      ctx.fill();
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
