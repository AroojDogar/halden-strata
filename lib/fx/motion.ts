import Lenis from "lenis";

type Cleanup = () => void;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Buttery smooth scrolling with Lenis. Anchor links glide to their section. */
export function mountSmoothScroll(reduce: boolean): Cleanup {
  if (reduce) return () => {};
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  let raf = 0;
  const loop = (t: number) => {
    lenis.raf(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const id = a?.getAttribute("href");
    if (!a || !id || id.length < 2) return;
    const el = document.querySelector<HTMLElement>(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el);
  };
  document.addEventListener("click", onClick);
  return () => {
    cancelAnimationFrame(raf);
    document.removeEventListener("click", onClick);
    lenis.destroy();
  };
}

/** Layers marked data-depth move at different speeds with scroll and mouse. */
export function mountParallax(root: ParentNode, reduce: boolean): Cleanup {
  const scenes = [...root.querySelectorAll<HTMLElement>("[data-parallax]")];
  if (!scenes.length || reduce) return () => {};
  const layers = scenes.map((s) => [...s.querySelectorAll<HTMLElement>("[data-depth]")]);
  const m = { x: 0, tx: 0 };
  const onMove = (e: PointerEvent) => (m.tx = (e.clientX / innerWidth) * 2 - 1);
  window.addEventListener("pointermove", onMove);
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    m.x += (m.tx - m.x) * 0.06;
    scenes.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1..1 while passing
      for (const l of layers[i]) {
        const d = parseFloat(l.dataset.depth ?? "0");
        l.style.transform = `translate3d(${(-m.x * d * 60).toFixed(2)}px, ${(p * d * 260).toFixed(2)}px, 0)`;
      }
    });
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
  };
}

/** A dot plus a lagging ring. The ring grows and shows a word over [data-cursor] areas. */
export function mountCursor(): Cleanup {
  if (!matchMedia("(pointer: fine)").matches) return () => {};
  const dot = document.querySelector<HTMLElement>("[data-cursor-dot]");
  const ring = document.querySelector<HTMLElement>("[data-cursor-ring]");
  const label = ring?.querySelector<HTMLElement>("[data-cursor-label]");
  if (!dot || !ring) return () => {};
  document.documentElement.classList.add("has-cursor");
  let x = -100, y = -100, rx = x, ry = y;
  const onMove = (e: PointerEvent) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const t = e.target as HTMLElement;
    const zone = t.closest<HTMLElement>("[data-cursor]");
    if (zone) {
      ring.dataset.state = zone.dataset.cursor;
      if (label) label.textContent = zone.dataset.cursorLabel ?? "DRAG";
    } else if (t.closest("a, button, label")) ring.dataset.state = "link";
    else delete ring.dataset.state;
  };
  const onLeave = () => {
    x = y = -100;
  };
  window.addEventListener("pointermove", onMove);
  document.addEventListener("pointerleave", onLeave);
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", onLeave);
    document.documentElement.classList.remove("has-cursor");
  };
}

/** Cards tilt toward the pointer in 3D, with a glare that follows it. */
export function mountTilt(root: ParentNode, reduce: boolean): Cleanup {
  if (reduce || !matchMedia("(hover: hover)").matches) return () => {};
  const offs: Cleanup[] = [];
  root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((el) => {
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add("is-tilting");
      el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * 12).toFixed(2)}deg) rotateY(${((px - 0.5) * 14).toFixed(2)}deg)`;
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    const leave = () => {
      el.classList.remove("is-tilting");
      el.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    offs.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    });
  });
  return () => offs.forEach((f) => f());
}

/** Buttons that lean toward the cursor when it comes close. */
export function mountMagnetic(root: ParentNode, reduce: boolean): Cleanup {
  if (reduce || !matchMedia("(hover: hover)").matches) return () => {};
  const els = [...root.querySelectorAll<HTMLElement>("[data-magnetic]")];
  const onMove = (e: PointerEvent) => {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const reach = Math.max(r.width, r.height) * 0.9 + 40;
      if (Math.hypot(dx, dy) < reach) {
        el.classList.add("is-near");
        el.style.transform = `translate3d(${(dx * 0.32).toFixed(1)}px, ${(dy * 0.32).toFixed(1)}px, 0)`;
      } else if (el.classList.contains("is-near")) {
        el.classList.remove("is-near");
        el.style.transform = "";
      }
    }
  };
  window.addEventListener("pointermove", onMove);
  return () => window.removeEventListener("pointermove", onMove);
}

/** A ticker that speeds up and leans with your scroll speed, and flips with scroll direction. */
export function mountMarquee(root: ParentNode, reduce: boolean): Cleanup {
  const els = [...root.querySelectorAll<HTMLElement>("[data-marquee]")];
  if (!els.length) return () => {};
  const tracks = els.map((e) => e.firstElementChild as HTMLElement);
  let x = 0, dir = 1, skew = 0, lastY = scrollY, last = performance.now(), raf = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const vel = (scrollY - lastY) / Math.max(dt, 0.001);
    lastY = scrollY;
    if (Math.abs(vel) > 30) dir = vel > 0 ? 1 : -1;
    const speed = reduce ? 0 : 60 + Math.min(1600, Math.abs(vel)) * 0.5;
    skew += (clamp(vel * 0.004, -10, 10) - skew) * 0.1;
    tracks.forEach((t) => {
      const half = t.scrollWidth / 2;
      x = (x - speed * dir * dt) % half;
      if (x > 0) x -= half;
      t.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(reduce ? 0 : -skew).toFixed(2)}deg)`;
    });
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** Scroll progress bar, chapter counter, and the hero's scroll-out value (--hp). */
export function mountProgress(root: ParentNode): Cleanup {
  const bar = root.querySelector<HTMLElement>("[data-progress-bar]");
  const label = root.querySelector<HTMLElement>("[data-chapter-label]");
  const count = root.querySelector<HTMLElement>("[data-chapter-count]");
  const chapters = [...root.querySelectorAll<HTMLElement>("[data-chapter]")];
  const hero = root.querySelector<HTMLElement>("[data-hero]");
  let raf = 0, lastIdx = -1;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
    if (hero) {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--hp", clamp(-r.top / r.height, 0, 1).toFixed(3));
    }
    let idx = 0;
    chapters.forEach((c, i) => {
      if (c.getBoundingClientRect().top < innerHeight * 0.5) idx = i;
    });
    if (idx !== lastIdx && chapters[idx]) {
      lastIdx = idx;
      if (label) label.textContent = chapters[idx].dataset.chapter ?? "";
      if (count) count.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(chapters.length).padStart(2, "0")}`;
    }
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
