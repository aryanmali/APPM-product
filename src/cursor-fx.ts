/* ------------------------------------------------------------------ */
/*  Dot-grid magnetic field background                                */
/*  – Evenly spaced dots across the viewport                          */
/*  – Dots within a radius are attracted toward the cursor            */
/*  – Smooth lerp for organic pull / release motion                   */
/* ------------------------------------------------------------------ */

interface Dot {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function initCursorFx(): void {
  const canvas = document.createElement("canvas");
  canvas.className = "dot-field";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  /* --- Config --- */
  const SPACING = 36;
  const DOT_BASE_RADIUS = 1.4;
  const ATTRACT_RADIUS = 160;
  const ATTRACT_STRENGTH = 0.35;
  const RETURN_SPEED = 0.08;
  const BASE_OPACITY = 0.14;
  const ACTIVE_OPACITY = 0.52;
  const ACTIVE_RADIUS_BOOST = 1.2;

  /* --- State --- */
  let dots: Dot[] = [];
  let mouseX = -9999;
  let mouseY = -9999;
  let dpr = window.devicePixelRatio || 1;

  /* --- Build dot grid --- */
  function createDots(): void {
    dots = [];
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cols = Math.ceil(w / SPACING) + 1;
    const rows = Math.ceil(h / SPACING) + 1;
    const offsetX = ((w - (cols - 1) * SPACING) / 2);
    const offsetY = ((h - (rows - 1) * SPACING) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hx = offsetX + c * SPACING;
        const hy = offsetY + r * SPACING;
        dots.push({ homeX: hx, homeY: hy, x: hx, y: hy });
      }
    }
  }

  /* --- Resize handler --- */
  function resize(): void {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    createDots();
  }

  window.addEventListener("resize", resize);
  resize();

  /* --- Mouse tracking --- */
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener("mouseleave", () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  /* --- Render loop --- */
  function animate(): void {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx!.clearRect(0, 0, w, h);

    const attractR2 = ATTRACT_RADIUS * ATTRACT_RADIUS;

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];

      /* Distance from cursor to dot's home position */
      const dx = mouseX - dot.homeX;
      const dy = mouseY - dot.homeY;
      const dist2 = dx * dx + dy * dy;

      let targetX = dot.homeX;
      let targetY = dot.homeY;

      if (dist2 < attractR2) {
        const dist = Math.sqrt(dist2);
        /* Ease-out curve: stronger pull when closer */
        const t = 1 - dist / ATTRACT_RADIUS;
        const force = t * t * ATTRACT_STRENGTH;
        targetX = dot.homeX + dx * force;
        targetY = dot.homeY + dy * force;
      }

      /* Smooth interpolation */
      dot.x = lerp(dot.x, targetX, RETURN_SPEED);
      dot.y = lerp(dot.y, targetY, RETURN_SPEED);

      /* Visual: proximity-based size + opacity */
      const renderDx = mouseX - dot.x;
      const renderDy = mouseY - dot.y;
      const renderDist2 = renderDx * renderDx + renderDy * renderDy;
      const proximity = renderDist2 < attractR2
        ? 1 - Math.sqrt(renderDist2) / ATTRACT_RADIUS
        : 0;

      const radius = DOT_BASE_RADIUS + proximity * ACTIVE_RADIUS_BOOST;
      const opacity = BASE_OPACITY + proximity * (ACTIVE_OPACITY - BASE_OPACITY);

      ctx!.beginPath();
      ctx!.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(196, 92, 62, ${opacity})`;
      ctx!.fill();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
