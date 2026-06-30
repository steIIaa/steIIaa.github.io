(function () {
  const canvas = document.getElementById('grid');
  const ctx = canvas.getContext('2d');

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // --- config ---
  const CELL         = 72;    // resting grid spacing
  const PUSH_RADIUS  = 90;    // how far cursor pushes (roughly 1-2 nodes)
  const PUSH_FORCE   = 55;    // how far nodes get displaced at center
  const SPRING       = 0.032; // how fast they drift back (low = floaty)
  const DAMPING      = 0.78;  // velocity damping (lower = more jelly)
  const LINE_ALPHA   = 0.13;  // base line opacity
  const DOT_RADIUS   = 2;     // resting node dot size
  const VIOLET       = 'rgba(203, 79, 255,';
  const WHITE        = 'rgba(246, 246, 246,';

  let w, h, dpr;
  let nodes = [];
  let cols, rows;
  let pointer = { x: -9999, y: -9999 };
  let rafId;

  // --- node factory ---
  function makeNode(ox, oy) {
    return {
      ox, oy,       // origin (resting position)
      x: ox, y: oy, // current position
      vx: 0, vy: 0  // velocity
    };
  }

  function buildGrid() {
    nodes = [];
    cols = Math.ceil(w / CELL) + 2;
    rows = Math.ceil(h / CELL) + 2;
    const offX = (w % CELL) / 2 - CELL;
    const offY = (h % CELL) / 2 - CELL;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        nodes.push(makeNode(offX + c * CELL, offY + r * CELL));
      }
    }
  }

  function idx(c, r) {
    return r * (cols + 1) + c;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
  }

  // --- input ---
  window.addEventListener('mousemove', e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (e.touches[0]) {
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    pointer.x = -9999;
    pointer.y = -9999;
  });

  // --- physics ---
  function update() {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];

      // push from cursor
      const dx = n.x - pointer.x;
      const dy = n.y - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PUSH_RADIUS && dist > 0.01) {
        const t = 1 - dist / PUSH_RADIUS;
        const force = t * t * PUSH_FORCE;
        n.vx += (dx / dist) * force * 0.18;
        n.vy += (dy / dist) * force * 0.18;
      }

      // spring back to origin
      n.vx += (n.ox - n.x) * SPRING;
      n.vy += (n.oy - n.y) * SPRING;

      // damping
      n.vx *= DAMPING;
      n.vy *= DAMPING;

      // integrate
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  // --- draw ---
  function draw() {
    update();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // subtle violet glow near cursor
    if (pointer.x > -1000) {
      const g = ctx.createRadialGradient(
        pointer.x, pointer.y, 0,
        pointer.x, pointer.y, PUSH_RADIUS * 2.2
      );
      g.addColorStop(0, 'rgba(203,79,255,0.055)');
      g.addColorStop(1, 'rgba(203,79,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.lineWidth = 1;

    // horizontal lines — connect node (c,r) to (c+1,r)
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = nodes[idx(c, r)];
        const b = nodes[idx(c + 1, r)];
        if (!a || !b) continue;
        const stretch = Math.hypot(a.x - b.x, a.y - b.y) / CELL;
        const alpha = LINE_ALPHA + Math.min((stretch - 1) * 0.35, 0.5);
        ctx.strokeStyle = WHITE + Math.max(0, alpha) + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // vertical lines — connect node (c,r) to (c,r+1)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const a = nodes[idx(c, r)];
        const b = nodes[idx(c, r + 1)];
        if (!a || !b) continue;
        const stretch = Math.hypot(a.x - b.x, a.y - b.y) / CELL;
        const alpha = LINE_ALPHA + Math.min((stretch - 1) * 0.35, 0.5);
        ctx.strokeStyle = WHITE + Math.max(0, alpha) + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // nodes — glow violet when displaced
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const disp = Math.hypot(n.x - n.ox, n.y - n.oy);
      const t = Math.min(disp / 30, 1);
      const color = t > 0.3 ? VIOLET : WHITE;
      const alpha = 0.25 + t * 0.65;
      const r = DOT_RADIUS + t * 1.8;

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color + alpha + ')';
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  }

  // --- reduced motion fallback ---
  function drawStatic() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = WHITE + LINE_ALPHA + ')';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = nodes[idx(c, r)];
        const b = nodes[idx(c + 1, r)];
        if (!a || !b) continue;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const a = nodes[idx(c, r)];
        const b = nodes[idx(c, r + 1)];
        if (!a || !b) continue;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }

  window.addEventListener('resize', () => {
    resize();
    if (prefersReducedMotion) drawStatic();
  });

  resize();

  if (prefersReducedMotion) {
    drawStatic();
  } else {
    draw();
  }
})();
