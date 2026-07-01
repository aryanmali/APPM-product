/* ------------------------------------------------------------------ */
/*  Cursor-reactive background effects                                */
/*  – Ambient blobs drift toward cursor (parallax)                    */
/*  – Soft radial glow tracks the cursor                              */
/*  – Floating particles scatter from cursor proximity                */
/* ------------------------------------------------------------------ */

interface Particle {
  el: HTMLElement;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function initCursorFx(): void {
  const blobA = document.querySelector(".ambient-a") as HTMLElement;
  const blobB = document.querySelector(".ambient-b") as HTMLElement;
  if (!blobA || !blobB) return;

  /* --- Cursor glow element --- */
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);

  /* --- Particle field --- */
  const PARTICLE_COUNT = 18;
  const particles: Particle[] = [];
  const particleContainer = document.createElement("div");
  particleContainer.className = "particle-field";
  document.body.appendChild(particleContainer);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    const size = 2 + Math.random() * 4;
    const baseX = Math.random() * 100;
    const baseY = Math.random() * 100;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.opacity = `${0.15 + Math.random() * 0.3}`;
    particleContainer.appendChild(el);

    particles.push({
      el,
      baseX,
      baseY,
      x: (baseX / 100) * window.innerWidth,
      y: (baseY / 100) * window.innerHeight,
      size,
      speed: 0.3 + Math.random() * 0.7,
      drift: 20 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2,
    });
  }

  /* --- Mouse state --- */
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let smoothMouseX = mouseX;
  let smoothMouseY = mouseY;
  let blobAX = 0;
  let blobAY = 0;
  let blobBX = 0;
  let blobBY = 0;
  let glowX = mouseX;
  let glowY = mouseY;
  let isMouseInWindow = false;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    isMouseInWindow = true;
  });

  document.addEventListener("mouseleave", () => {
    isMouseInWindow = false;
  });

  /* --- Handle resize --- */
  let winW = window.innerWidth;
  let winH = window.innerHeight;
  window.addEventListener("resize", () => {
    winW = window.innerWidth;
    winH = window.innerHeight;
    particles.forEach((p) => {
      p.x = (p.baseX / 100) * winW;
      p.y = (p.baseY / 100) * winH;
    });
  });

  /* --- Animation loop --- */
  let time = 0;

  function animate(): void {
    time += 0.008;
    const halfW = winW / 2;
    const halfH = winH / 2;

    /* Smooth mouse (for glow) */
    smoothMouseX = lerp(smoothMouseX, mouseX, 0.1);
    smoothMouseY = lerp(smoothMouseY, mouseY, 0.1);

    /* Blob A — slow parallax (far depth) */
    const targetAX = ((mouseX - halfW) / halfW) * 60;
    const targetAY = ((mouseY - halfH) / halfH) * 40;
    blobAX = lerp(blobAX, targetAX, 0.015);
    blobAY = lerp(blobAY, targetAY, 0.015);
    blobA.style.transform = `translate(${blobAX}px, ${blobAY}px)`;

    /* Blob B — faster parallax (near depth) */
    const targetBX = ((mouseX - halfW) / halfW) * -45;
    const targetBY = ((mouseY - halfH) / halfH) * -30;
    blobBX = lerp(blobBX, targetBX, 0.025);
    blobBY = lerp(blobBY, targetBY, 0.025);
    blobB.style.transform = `translate(${blobBX}px, ${blobBY}px)`;

    /* Cursor glow */
    glowX = lerp(glowX, mouseX, 0.06);
    glowY = lerp(glowY, mouseY, 0.06);
    const glowOpacity = isMouseInWindow ? 1 : 0;
    glow.style.transform = `translate(${glowX - 200}px, ${glowY - 200}px)`;
    glow.style.opacity = String(glowOpacity);

    /* Particles */
    for (const p of particles) {
      /* Gentle floating drift */
      const floatX = Math.sin(time * p.speed + p.phase) * p.drift;
      const floatY = Math.cos(time * p.speed * 0.7 + p.phase) * p.drift * 0.6;

      let targetX = (p.baseX / 100) * winW + floatX;
      let targetY = (p.baseY / 100) * winH + floatY;

      /* Cursor repulsion */
      if (isMouseInWindow) {
        const dx = targetX - smoothMouseX;
        const dy = targetY - smoothMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 180;
        if (dist < repelRadius) {
          const force = ((repelRadius - dist) / repelRadius) * 50;
          const angle = Math.atan2(dy, dx);
          targetX += Math.cos(angle) * force;
          targetY += Math.sin(angle) * force;
        }
      }

      p.x = lerp(p.x, targetX, 0.04);
      p.y = lerp(p.y, targetY, 0.04);
      p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
