/**
 * Parallax night scene. Each SVG layer has a data-depth:
 * far layers move a little, near layers move a lot, which reads as depth.
 * The shapes come from a seeded random generator, so the server and browser
 * always draw the same skyline.
 */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function ridge(seed: number, base: number, amp: number, step: number) {
  const r = rng(seed);
  let d = `M0 500 L0 ${base}`;
  for (let x = 0; x <= 2000; x += step) d += ` L${x} ${(base - r() * amp).toFixed(1)}`;
  return d + " L2000 500 Z";
}

function city(seed: number) {
  const r = rng(seed);
  const towers: { x: number; w: number; h: number }[] = [];
  const windows: { x: number; y: number }[] = [];
  for (let x = 0; x < 2000; ) {
    const w = 30 + r() * 70;
    const h = 60 + r() ** 1.6 * 230;
    towers.push({ x, w, h });
    for (let wy = 500 - h + 14; wy < 470; wy += 16)
      for (let wx = x + 8; wx < x + w - 8; wx += 14) if (r() < 0.16) windows.push({ x: wx, y: wy });
    x += w + 4 + r() * 18;
  }
  return { towers, windows };
}

const { towers, windows } = city(42);

export default function NightRun() {
  return (
    <section
      id="night"
      data-chapter="Night run"
      data-parallax
      className="relative isolate h-[110svh] min-h-[640px] overflow-hidden"
      style={{ background: "linear-gradient(#0d1824 0%, #10202c 45%, #2a1d17 72%, #06080b 100%)" }}
    >
      {/* Moon and stars */}
      <div data-depth="0.05" className="parallax-layer absolute inset-0" aria-hidden="true">
        <div
          className="absolute right-[12%] top-[14%] size-24 rounded-full md:size-32"
          style={{ background: "radial-gradient(circle at 35% 35%, #fff6e4, #e9d6b4 55%, #c9b28d)", boxShadow: "0 0 80px 20px rgba(255,214,160,.18)" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-28 md:px-10 md:pt-36" data-depth="-0.15">
        <p className="label">Chapter 04 · Night run</p>
        <h2 className="mt-4 max-w-3xl font-display text-6xl leading-[0.9] font-extrabold uppercase text-balance md:text-8xl">
          Made for the long drive home
        </h2>
        <p className="mt-6 max-w-md text-lg text-mist">
          Matrix LED lights see 600 m down the road. The cabin stays at 58 dB at 130 km/h, quieter than a library.
        </p>
      </div>

      <svg className="parallax-layer absolute -inset-x-[10%] bottom-[18%] w-[120%]" data-depth="0.12" viewBox="0 0 2000 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d={ridge(3, 300, 140, 60)} fill="#1b2a38" />
      </svg>
      <svg className="parallax-layer absolute -inset-x-[10%] bottom-[12%] w-[120%]" data-depth="0.25" viewBox="0 0 2000 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d={ridge(11, 360, 110, 40)} fill="#131f2a" />
      </svg>
      <svg className="parallax-layer absolute -inset-x-[10%] bottom-[8%] w-[120%]" data-depth="0.4" viewBox="0 0 2000 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {towers.map((t, i) => (
          <rect key={i} x={t.x} y={500 - t.h} width={t.w} height={t.h} fill="#0b131b" />
        ))}
        {windows.map((w, i) => (
          <rect key={`w${i}`} x={w.x} y={w.y} width="6" height="8" fill={i % 5 === 0 ? "#9ec8ff" : "#ffbf6e"} opacity={0.55 + (i % 3) * 0.15} />
        ))}
      </svg>

      {/* Highway with light trails, nearest layer */}
      <svg className="parallax-layer absolute -inset-x-[10%] bottom-0 w-[120%]" data-depth="0.7" viewBox="0 0 2000 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d="M0 120 C 500 90, 1400 90, 2000 120 L2000 300 L0 300 Z" fill="#06080b" />
        <path className="trail" d="M-100 150 C 500 118, 1400 118, 2100 150" stroke="#ffa443" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path className="trail slow" d="M2100 175 C 1400 140, 500 140, -100 175" stroke="#ff4a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path className="trail" d="M-100 200 C 500 165, 1400 165, 2100 200" stroke="#fff1d6" strokeWidth="3" fill="none" strokeLinecap="round" style={{ animationDelay: "-1.2s" }} />
        <path d="M0 230 C 500 195, 1400 195, 2000 230" stroke="#26313b" strokeWidth="3" strokeDasharray="40 50" fill="none" />
      </svg>
    </section>
  );
}
