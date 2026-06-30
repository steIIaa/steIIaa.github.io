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

  // color flood: a wave of color expands outward from a random seed
  // node until every node has flipped, then reverses to the other
  // color from a new random seed, forever alternating.
  const FLOOD_SPEED     = 900;  // px/sec the color wave expands outward
  const FLOOD_EDGE_SOFT = 120;  // px width of the soft transition band at the wave's edge
  const GREY_RGB        = [246, 246, 246];
  const VIOLET_RGB      = [203, 79, 255];

  let w, h, dpr;
  let nodes = [];
  let pointer = { x: -9999, y: -9999 };
  let rafId;
  let lastTime = 0;

  // flood state: expands from (seedX, seedY) toward targetColor (0=grey, 1=violet)
  let flood = {
    seedX: 0, seedY: 0,
    radius: 0,
    maxRadius: 0,
    targetMix: 1 // 1 = flooding to violet, 0 = flooding to grey
  };

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

  let floodStarted = false;

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
        dy: (Math.random() - 0.5) * DRIFT_SPEED,
        mix: 0 // 0 = grey, 1 = violet — current color blend of this node
      });
    }
    // only kick off the flood cycle once, on first load — resizing
    // the window shouldn't restart it
    if (!floodStarted) {
      floodStarted = true;
      startFlood(1);
    }
  }

  function startFlood(targetMix) {
    if (nodes.length === 0) return;
    const seed = nodes[Math.floor(Math.random() * nodes.length)];
    let maxDist = 0;
    for (const n of nodes) {
      const d = Math.hypot(n.x - seed.x, n.y - seed.y);
      if (d > maxDist) maxDist = d;
    }
    flood.seedX = seed.x;
    flood.seedY = seed.y;
    flood.radius = 0;
    flood.maxRadius = maxDist + FLOOD_EDGE_SOFT;
    flood.targetMix = targetMix;
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

  function update(dt) {
    // advance the flood wave's radius outward at a constant speed
    flood.radius += FLOOD_SPEED * dt;
    const floodDone = flood.radius >= flood.maxRadius;

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

      // color flood: as the wave's edge passes this node's distance
      // from the seed, blend its color toward the flood's target
      const distFromSeed = Math.hypot(n.x - flood.seedX, n.y - flood.seedY);
      const edge = flood.radius - distFromSeed;
      // edge < 0: wave hasn't arrived yet, node keeps its current color
      // 0 <= edge < FLOOD_EDGE_SOFT: node is inside the soft transition band
      // edge >= FLOOD_EDGE_SOFT: wave has fully passed, node is fully flipped
      if (edge > 0) {
        const t = Math.min(edge / FLOOD_EDGE_SOFT, 1);
        n.mix = n.mix + (flood.targetMix - n.mix) * t * 0.3;
        if (t >= 1) n.mix = flood.targetMix;
      }
    }

    // once the wave has covered every node, start the next one in the opposite color
    if (floodDone) {
      startFlood(1 - flood.targetMix);
    }
  }

  function lerpColor(rgbA, rgbB, t) {
    return [
      Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * t),
      Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * t),
      Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * t)
    ];
  }

  function draw(time) {
    if (lastTime === 0) lastTime = time; // first frame: establish a real baseline
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    update(dt);

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
          const lineMix = (a.mix + b.mix) / 2;
          const rgb = lerpColor(GREY_RGB, VIOLET_RGB, Math.max(lineMix, glow));
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes — colored by their current flood mix, brightened near the cursor
    for (const n of nodes) {
      const dist = Math.hypot(n.x - pointer.x, n.y - pointer.y);
      const near = dist < PUSH_RADIUS ? (1 - dist / PUSH_RADIUS) : 0;
      const rgb = lerpColor(GREY_RGB, VIOLET_RGB, Math.max(n.mix, near));
      const alpha = 0.6 + near * 0.4;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size + near * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
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
    rafId = requestAnimationFrame(draw);
  }
})();
