import NightRun from "@/components/NightRun";
import { BASE_PRICE_EUR, CURRENCIES, EDITIONS, HOTSPOTS, MOODS, STUDIOS } from "@/lib/editions";

/** Each spec has a metric and an imperial version; the page shows one at a time */
const SPECS = [
  { l: ["0–100 km/h", "0–60 mph"], m: ["2.9", "s"], i: ["2.8", "s"], n: "Launch Control, Track Pack" },
  { l: ["Peak power", "Peak power"], m: ["580", "kW"], i: ["778", "hp"], n: "Two motors, all-wheel drive" },
  { l: ["Range", "Range"], m: ["690", "km"], i: ["429", "mi"], n: "WLTP, 105 kWh usable battery" },
  { l: ["10–80% charge", "10–80% charge"], m: ["18", "min"], i: ["18", "min"], n: "800 V at 350 kW" },
  { l: ["Downforce", "Downforce"], m: ["640", "kg"], i: ["1,411", "lb"], n: "Swan-neck wing and diffuser" },
  { l: ["Torque", "Torque"], m: ["1,180", "Nm"], i: ["870", "lb-ft"], n: "Torque vectoring, rear axle" },
];

const TICKER = ["9 luxury editions", "800-volt", "580 kW", "0–100 in 2.9 s", "690 km WLTP", "640 kg downforce"];

const START = EDITIONS[0];
const eur = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function Title() {
  const word = "STRATA".split("");
  return (
    <h1 className="font-display text-[clamp(5.5rem,21vw,19rem)] leading-[0.78] font-black tracking-tight">
      <span className="sr-only">Strata GT</span>
      <span aria-hidden="true" className="flex">
        {word.map((ch, i) => (
          <span key={i} className="char-drift" style={{ "--k": (i - 2.5) * 70 } as React.CSSProperties}>
            <span className="char-mask">
              <span className="char" style={{ "--i": i } as React.CSSProperties}>
                {ch}
              </span>
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}

export default function Home() {
  return (
    <>
      {/* The 3D world: fixed behind everything, visible through transparent sections */}
      <canvas data-fx="car" className="pointer-events-none fixed inset-x-0 top-0 h-lvh w-full" aria-hidden="true" />

      {/* Hotspots pinned to the 3D car; the scene moves them every frame */}
      <div data-hotspots className="hotspots pointer-events-none fixed inset-x-0 top-0 z-30 h-lvh">
        {HOTSPOTS.map((h) => (
          <div key={h.id} data-hotspot={h.id} data-hidden="true" className="hotspot">
            <button type="button" aria-expanded="false" aria-label={h.label}>
              <span />
            </button>
            <div className="hs-card" role="note">
              <p className="font-display text-xl leading-none font-extrabold uppercase">{h.label}</p>
              <p className="mt-2 text-sm text-mist">{h.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* HUD: nav + scroll progress */}
      <header className="fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="h-0.5 origin-left scale-x-0 bg-amber" data-progress-bar />
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 md:px-10" aria-label="Main">
          <a href="#top" className="flex items-center gap-3 font-display text-xl font-extrabold tracking-[0.2em]">
            <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
              <path d="M4 22 L16 6 L28 22" fill="none" stroke="#ffa443" strokeWidth="2.4" />
              <path d="M9 22 L16 13 L23 22" fill="none" stroke="#f1ece2" strokeWidth="2.4" />
              <path d="M3 26 H29" stroke="#f1ece2" strokeWidth="2" />
            </svg>
            HALDEN
          </a>
          <p className="label hidden items-center gap-3 md:flex">
            <span data-chapter-count className="text-bone tabular-nums">01 / 09</span>
            <span data-chapter-label>Arrival</span>
          </p>
          <div className="flex items-center gap-2">
            <button type="button" data-sound aria-pressed="false" aria-label="Engine sound" className="sound-btn flex items-center gap-2 rounded-full border border-bone/20 px-4 py-2.5 font-label text-sm font-semibold tracking-[0.16em] uppercase backdrop-blur hover:border-amber">
              <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span>
              <span data-sound-label className="hidden sm:inline">Sound off</span>
            </button>
            <a href="#reserve" data-magnetic className="rounded-full border border-bone/30 px-5 py-2.5 font-label text-sm font-semibold tracking-[0.16em] uppercase backdrop-blur hover:border-amber">
              Reserve
            </a>
          </div>
        </nav>
      </header>

      <main id="top" className="relative z-10">
        {/* 01 HERO */}
        <section data-cam="hero" data-hero data-chapter="Arrival" className="relative flex min-h-svh flex-col justify-between px-4 pt-24 pb-10 md:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <p className="label">Halden Motors · No. 27 · Electric GT Racer</p>
            <Title />
            <p className="-mt-1 font-display text-[clamp(2.5rem,7vw,6rem)] leading-none font-black outline-text">GT</p>
          </div>
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-6">
            <p className="max-w-sm text-lg text-mist">
              An electric GT racer built for endurance racing, then made legal for the road. Move your mouse, then scroll to drive.
            </p>
            <a href="#design" className="label flex items-center gap-3 text-bone">
              <span className="relative block h-12 w-7 rounded-full border border-bone/40">
                <span className="absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 animate-bounce rounded-full bg-amber" />
              </span>
              Scroll to drive
            </a>
          </div>
        </section>

        {/* Speed-reactive ticker */}
        <div className="relative overflow-hidden border-y border-line bg-night py-5" data-marquee aria-label="Key figures">
          <div className="flex w-max gap-10 whitespace-nowrap will-change-transform">
            {[0, 1].map((copy) =>
              TICKER.map((t, i) => (
                <span key={`${copy}-${i}`} aria-hidden={copy === 1} className="flex items-center gap-10 font-display text-4xl font-extrabold uppercase md:text-6xl">
                  {t}
                  <span className="size-3 rounded-full bg-amber" />
                </span>
              )),
            )}
          </div>
        </div>

        {/* 02 DESIGN: camera swings to the side profile */}
        <section id="design" data-cam="design" data-chapter="Shaped by air" className="flex min-h-[130svh] items-center px-4 md:px-10">
          <div className="mx-auto w-full max-w-7xl">
            <div className="max-w-md rounded-2xl bg-night/60 p-6 backdrop-blur-sm md:bg-transparent md:p-0 md:backdrop-blur-none">
              <p className="label">Chapter 02 · Design</p>
              <h2 className="mt-4 font-display text-6xl leading-[0.9] font-extrabold uppercase md:text-8xl">Shaped by air</h2>
              <p className="mt-6 text-lg text-mist">
                The fenders rise above the bonnet like a Le Mans racer, and the teardrop canopy sits low between them. A swan-neck wing and a shark fin press the car into the road at speed.
              </p>
            </div>
          </div>
        </section>

        {/* 03 POWER: low rear angle at warp speed */}
        <section data-cam="power" data-chapter="Power" className="flex min-h-[130svh] items-center px-4 md:px-10">
          <div className="mx-auto flex w-full max-w-7xl justify-end">
            <div className="max-w-md rounded-2xl bg-night/60 p-6 text-right backdrop-blur-sm md:bg-transparent md:p-0 md:backdrop-blur-none">
              <p className="label">Chapter 03 · Power</p>
              <h2 className="mt-4 font-display text-6xl leading-[0.9] font-extrabold uppercase md:text-8xl">
                Two motors. <span className="text-amber">One surge.</span>
              </h2>
              <p className="mt-6 text-lg text-mist">580 kW arrives the moment you ask for it. No gears, no pause, no noise. 0 to 100 km/h takes 2.9 seconds.</p>
            </div>
          </div>
        </section>

        {/* 04 NIGHT RUN: layered parallax */}
        <NightRun />

        {/* 05 RAIN: GPU water ripples */}
        <section id="rain" data-chapter="Rain" className="relative h-[90svh] min-h-[560px] overflow-hidden bg-ink">
          <canvas data-fx="ripple" data-cursor="water" data-cursor-label="RIPPLE" className="absolute inset-0 size-full touch-pan-y" aria-hidden="true" />
          <h2 className="sr-only">Built for the wet</h2>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 pb-10 md:px-10">
            <p className="max-w-md text-lg text-bone/80">
              Torque vectoring reads every wheel 1,000 times a second, so grip holds when the road turns to glass.
            </p>
            <p className="label">Move across the water · Click or tap to drop rain</p>
          </div>
        </section>

        {/* 06 CONFIGURE: car parks in the studio, drag to turn it */}
        <section id="configure" data-cam="configure" data-chapter="Configure" className="relative min-h-[130svh] px-4 md:px-10">
          <div data-drag data-cursor="drag" data-cursor-label="DRAG" tabIndex={0} aria-label="Rotate the car. Drag, or use the left and right arrow keys." className="absolute inset-0 touch-pan-y focus-visible:outline-none" />
          <div className="pointer-events-none mx-auto flex w-full max-w-7xl items-center pt-[62svh] pb-10 md:sticky md:top-0 md:min-h-svh md:pt-20 md:pb-6">
            <div data-config className="pointer-events-auto w-full max-w-md rounded-2xl border border-line bg-night/75 p-6 backdrop-blur-md">
              <p className="label">Chapter 06 · Configure</p>
              <h2 className="mt-2 font-display text-4xl leading-none font-extrabold uppercase md:text-5xl">Choose your edition</h2>

              <div className="mt-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p data-ed-name className="font-display text-3xl leading-none font-extrabold">{START.name}</p>
                  <p className="label mt-2 flex items-center gap-2">
                    <span data-ed-dot className="size-2 rounded-full" style={{ background: START.accent }} />
                    <span data-ed-tag>{START.tag}</span>
                  </p>
                </div>
                <span data-ed-finish className="shrink-0 rounded-full border border-line px-3 py-1 font-label text-xs font-semibold tracking-[0.14em] text-bone uppercase">
                  {START.finish}
                </span>
              </div>
              <p data-ed-story className="mt-3 min-h-[3lh] text-sm text-mist">{START.story}</p>

              <div className="mt-4 grid grid-cols-9 gap-2" role="group" aria-label="Paint edition">
                {EDITIONS.map((e, i) => (
                  <button
                    key={e.id}
                    type="button"
                    data-edition={e.id}
                    aria-pressed={i === 0}
                    aria-label={`${e.name}, ${e.finish}`}
                    title={e.name}
                    className="swatch aspect-square rounded-full"
                    style={{ background: e.swatch }}
                  />
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="label">Light</span>
                <div className="seg" role="group" aria-label="Lighting mood">
                  {MOODS.map((m, i) => (
                    <button key={m.id} type="button" data-mood={m.id} aria-pressed={i === 0}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-line pt-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="label">Your Strata GT</p>
                    <p data-ed-total className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">{eur(BASE_PRICE_EUR + START.price)}</p>
                    <p className="mt-1 text-sm text-mist">
                      Edition <span data-ed-option className="text-bone tabular-nums">Included</span>
                    </p>
                  </div>
                  <div className="seg" role="group" aria-label="Currency">
                    {CURRENCIES.map((c, i) => (
                      <button key={c.code} type="button" data-currency={c.code} aria-pressed={i === 0}>
                        {c.code}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <code data-ed-code className="min-w-0 flex-1 truncate rounded-lg border border-dashed border-line px-3 py-2 font-label text-sm tracking-[0.12em] text-bone select-all">
                    HS27-KINNOW-EUR
                  </code>
                  <button type="button" data-copy className="rounded-lg border border-line px-3 py-2 font-label text-xs font-semibold tracking-[0.14em] uppercase hover:border-amber">
                    Copy
                  </button>
                </div>
                <p className="mt-3 text-xs text-mist">Indicative exchange rates, before local taxes. Drag the car to turn it and tap the amber points to explore.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 07 SPECS: 3D tilt cards, metric or imperial */}
        <section id="specs" data-chapter="Specs" data-units="metric" className="relative bg-night px-4 py-28 md:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="label">Chapter 07 · Technical data</p>
                <h2 className="mt-4 max-w-2xl font-display text-6xl leading-[0.9] font-extrabold uppercase md:text-8xl">The numbers</h2>
              </div>
              <div className="seg" role="group" aria-label="Units">
                <button type="button" data-unit-btn="metric" aria-pressed="true">Metric</button>
                <button type="button" data-unit-btn="imperial" aria-pressed="false">Imperial</button>
              </div>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SPECS.map((s) => (
                <article key={s.l[0]} data-tilt className="relative rounded-2xl border border-line bg-ink p-7">
                  <div className="glare" />
                  <div data-tilt-depth>
                    <p className="label">
                      <span className="u-metric">{s.l[0]}</span>
                      <span className="u-imperial">{s.l[1]}</span>
                    </p>
                    <p className="mt-4 font-display text-7xl font-black tabular-nums">
                      <span className="u-metric">
                        {s.m[0]}
                        <span className="ml-2 font-label text-2xl font-semibold text-amber">{s.m[1]}</span>
                      </span>
                      <span className="u-imperial">
                        {s.i[0]}
                        <span className="ml-2 font-label text-2xl font-semibold text-amber">{s.i[1]}</span>
                      </span>
                    </p>
                    <p className="mt-3 text-mist">{s.n}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 08 STUDIOS: live local time in six cities */}
        <section id="studios" data-chapter="Studios" className="relative bg-night px-4 pb-28 md:px-10">
          <div className="mx-auto max-w-7xl border-t border-line pt-24">
            <p className="label">Chapter 08 · Private viewings</p>
            <h2 className="mt-4 max-w-3xl font-display text-6xl leading-[0.9] font-extrabold uppercase md:text-8xl">Six cities, one car</h2>
            <p className="mt-6 max-w-lg text-lg text-mist">See the Strata GT in person. Every studio is open from 10:00 to 20:00 local time, and the clocks below are live.</p>
            <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {STUDIOS.map((st) => (
                <article key={st.city} data-studio={st.city} className="flex flex-col gap-6 bg-ink p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-4xl leading-none font-extrabold uppercase">{st.city}</h3>
                      <p className="label mt-2">{st.area}</p>
                    </div>
                    <span data-status data-open="false" className="status-pill">Local time</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <p data-clock className="font-display text-6xl leading-none font-black tabular-nums">--:--</p>
                    <a href="#reserve" className="label text-bone underline decoration-amber decoration-2 underline-offset-4 hover:text-amber">Book a viewing</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 09 RESERVE */}
        <footer id="reserve" data-chapter="Reserve" className="relative overflow-hidden bg-night px-4 pt-24 pb-12 md:px-10">
          <div className="mx-auto max-w-7xl">
            <p className="label">Chapter 09 · First production run</p>
            <h2 className="mt-4 font-display text-[clamp(4rem,13vw,12rem)] leading-[0.82] font-black uppercase">
              Reserve <span className="outline-text">the night</span>
            </h2>
            <div className="mt-12 flex flex-wrap items-center gap-8">
              <a href="#configure" data-magnetic className="grid size-40 place-items-center rounded-full bg-amber text-center font-label text-lg font-semibold tracking-[0.14em] text-night uppercase">
                Build
                <br />
                yours
              </a>
              <p className="max-w-sm text-mist">A €2,500 refundable deposit holds a build slot. Deliveries start in Q2 2027 across Europe, the UK, the Gulf, Japan and Pakistan.</p>
            </div>
            <div className="mt-24 flex flex-wrap justify-between gap-4 border-t border-line pt-6 text-sm text-mist">
              <span>Halden Motors and the Strata GT are a fictional brand and concept car.</span>
              <span>Designed and built by Arooj Dogar · Next.js, TypeScript, Tailwind CSS, Three.js</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
