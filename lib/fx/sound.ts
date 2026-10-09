import { telemetry } from "./bus";

/**
 * A synthesised electric-motor sound, made live with the Web Audio API (no audio files).
 * Three layers follow the car's speed: a motor whine, a low inverter hum, and wind.
 * Browsers only allow audio after a click, so it starts from the Sound button.
 */
export function mountSound(): () => void {
  const btn = document.querySelector<HTMLButtonElement>("[data-sound]");
  if (!btn) return () => {};
  let ctx: AudioContext | null = null;
  let raf = 0;
  let on = false;
  let nodes: {
    master: GainNode;
    whine: OscillatorNode;
    whine2: OscillatorNode;
    hum: OscillatorNode;
    windGain: GainNode;
    windFilter: BiquadFilterNode;
  } | null = null;

  const build = (c: AudioContext) => {
    const master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);

    const whineGain = c.createGain();
    whineGain.gain.value = 0.05;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 6;
    bp.frequency.value = 900;
    const whine = c.createOscillator();
    whine.type = "sine";
    const whine2 = c.createOscillator(); // a slightly detuned second whine gives the "electric" shimmer
    whine2.type = "triangle";
    whine.connect(whineGain);
    whine2.connect(bp).connect(whineGain);
    whineGain.connect(master);

    const humGain = c.createGain();
    humGain.gain.value = 0.12;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    const hum = c.createOscillator();
    hum.type = "sawtooth";
    hum.connect(lp).connect(humGain).connect(master);

    // wind: filtered noise
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = c.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const windFilter = c.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.Q.value = 0.7;
    const windGain = c.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter).connect(windGain).connect(master);

    whine.start();
    whine2.start();
    hum.start();
    noise.start();
    return { master, whine, whine2, hum, windGain, windFilter };
  };

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!ctx || !nodes) return;
    const s = Math.min(2.4, telemetry.speed);
    const t = ctx.currentTime;
    nodes.whine.frequency.setTargetAtTime(220 + s * 620, t, 0.15);
    nodes.whine2.frequency.setTargetAtTime(440 + s * 1250, t, 0.15);
    nodes.hum.frequency.setTargetAtTime(48 + s * 34, t, 0.2);
    nodes.windGain.gain.setTargetAtTime(Math.min(0.5, s * 0.22), t, 0.3);
    nodes.windFilter.frequency.setTargetAtTime(400 + s * 900, t, 0.3);
  };

  const label = btn.querySelector<HTMLElement>("[data-sound-label]");
  const onClick = async () => {
    on = !on;
    btn.setAttribute("aria-pressed", String(on));
    if (label) label.textContent = on ? "Sound on" : "Sound off";
    if (on) {
      if (!ctx) {
        ctx = new AudioContext();
        nodes = build(ctx);
        loop();
      }
      await ctx.resume();
      nodes!.master.gain.setTargetAtTime(0.35, ctx.currentTime, 0.4);
    } else if (ctx && nodes) {
      nodes.master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    }
  };
  btn.addEventListener("click", onClick);
  return () => {
    btn.removeEventListener("click", onClick);
    cancelAnimationFrame(raf);
    ctx?.close();
  };
}
