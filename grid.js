/* ============================================
   ultraviolet. — interactive constellation background
   Nodes drift slowly in straight lines, bouncing off
   the edges. Lines connect nodes that are close together,
   and the cursor pushes nearby nodes aside.
   ============================================ */

(function () {
  const canvas = document.getElementById('grid');
  const ctx = canvas.getContext('2d');

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // --- config ---
  // NODE_COUNT: how many points make up the constellation.
  // Default is 90. Raise it for a denser field, lower it for a
  // sparser one — more nodes costs more per-frame computation
  // since connections are checked between every pair of nodes.
  const NODE_COUNT   = 180;
  const LINK_DIST    = 140;   // max distance two nodes can be apart and still draw a line
  const PUSH_RADIUS  = 130;   // how far the cursor reaches to push nodes
  const PUSH_FORCE   = 2.2;   // how hard the cursor pushes
  const DAMPING      = 0.94;  // how quickly the cursor-push velocity settles back down
  const DRIFT_SPEED  = 0.12;  // constant ambient drift speed (px/frame)

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
    for (let i = 0; i < NODE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        dirX: Math.cos(angle),
        dirY: Math.sin(angle),
        vx: 0,
        vy: 0
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
      // constant ambient drift along a fixed heading, bouncing off edges
      n.x += n.dirX * DRIFT_SPEED;
      n.y += n.dirY * DRIFT_SPEED;

      if (n.x < 0) { n.x = 0; n.dirX *= -1; }
      else if (n.x > w) { n.x = w; n.dirX *= -1; }
      if (n.y < 0) { n.y = 0; n.dirY *= -1; }
      else if (n.y > h) { n.y = h; n.dirY *= -1; }

      // cursor push — a temporary velocity layered on top of the drift
      const dx = n.x - pointer.x;
      const dy = n.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < PUSH_RADIUS && dist > 0.01) {
        const t = 1 - dist / PUSH_RADIUS;
        n.vx += (dx / dist) * t * t * PUSH_FORCE;
        n.vy += (dy / dist) * t * t * PUSH_FORCE;
      }
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
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
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          const t = 1 - d / LINK_DIST;
          const nearCursor = Math.min(
            Math.hypot(a.x - pointer.x, a.y - pointer.y),
            Math.hypot(b.x - pointer.x, b.y - pointer.y)
          );
          const glow = nearCursor < PUSH_RADIUS ? (1 - nearCursor / PUSH_RADIUS) : 0;
          const alpha = t * 0.18 + glow * 0.35;
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
      ctx.arc(n.x, n.y, 1.6 + near * 1.5, 0, Math.PI * 2);
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
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK_DIST) {
          const alpha = (1 - d / LINK_DIST) * 0.18;
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
      ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
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
