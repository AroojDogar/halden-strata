import * as THREE from "three";

/**
 * Interactive water. A height-field simulation runs on the GPU in two
 * "ping-pong" render targets. Every frame each pixel looks at its four
 * neighbours and moves toward their average, so waves spread out.
 * The display shader bends a painted night-street picture through those waves.
 */
const VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const SIM_FS = /* glsl */ `
  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform vec4 uDrop;   // x, y, strength, radius
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec4 info = texture2D(uPrev, vUv);
    float avg = (
      texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r +
      texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r +
      texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r +
      texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r) * 0.25;
    info.g += (avg - info.r) * 2.0;   // velocity
    info.g *= 0.992;                  // damping
    info.r += info.g;                 // height
    info.r *= 0.999;
    if (uDrop.z != 0.0) {
      float dist = length((vUv - uDrop.xy) * vec2(uAspect, 1.0)) / uDrop.w;
      float drop = max(0.0, 1.0 - dist);
      info.r += (0.5 - cos(drop * 3.14159265) * 0.5) * uDrop.z;
    }
    gl_FragColor = info;
  }
`;

const DISPLAY_FS = /* glsl */ `
  uniform sampler2D uHeight;
  uniform sampler2D uBg;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    float hL = texture2D(uHeight, vUv - vec2(uTexel.x, 0.0)).r;
    float hR = texture2D(uHeight, vUv + vec2(uTexel.x, 0.0)).r;
    float hD = texture2D(uHeight, vUv - vec2(0.0, uTexel.y)).r;
    float hU = texture2D(uHeight, vUv + vec2(0.0, uTexel.y)).r;
    vec3 n = normalize(vec3(hL - hR, hD - hU, 0.02));
    vec3 col = texture2D(uBg, vUv + n.xy * 0.045).rgb;
    vec3 halfV = normalize(vec3(-0.35, 0.5, 1.0) + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, halfV), 0.0), 140.0);
    col += vec3(1.0, 0.86, 0.68) * spec * 0.8;
    col *= 0.9 + 0.1 * n.z;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Paints the scene under the water: wet street reflections and a headline. */
function paintBackground(c: HTMLCanvasElement, w: number, h: number) {
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0b1118");
  sky.addColorStop(1, "#04060a");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  // Long vertical light reflections, like street lamps on wet asphalt
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = ["255,164,67", "255,74,58", "120,180,255", "255,214,150"];
  for (let i = 0; i < 26; i++) {
    const x = rnd() * w;
    const cy = h * (0.35 + rnd() * 0.5);
    const rx = 6 + rnd() * 26;
    const ry = h * (0.12 + rnd() * 0.35);
    g.save();
    g.translate(x, cy);
    g.scale(1, ry / rx);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    const col = colors[Math.floor(rnd() * colors.length)];
    rg.addColorStop(0, `rgba(${col},${0.35 + rnd() * 0.4})`);
    rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg;
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Headline painted into the water
  const size = Math.min(w * 0.17, h * 0.34);
  g.fillStyle = "#f1ece2";
  g.textBaseline = "alphabetic";
  g.font = `800 ${size}px "Big Shoulders Display", "Arial Narrow", Impact, sans-serif`;
  g.fillText("BUILT FOR", w * 0.06, h * 0.46);
  g.fillStyle = "#ffa443";
  g.fillText("THE WET", w * 0.06, h * 0.46 + size * 0.92);
}

export function mountRipple(canvas: HTMLCanvasElement, reduce: boolean): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch {
    canvas.dataset.failed = "true";
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);

  const rtOptions = {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  };
  let read = new THREE.WebGLRenderTarget(4, 4, rtOptions);
  let write = new THREE.WebGLRenderTarget(4, 4, rtOptions);

  const simMat = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: SIM_FS,
    uniforms: {
      uPrev: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uDrop: { value: new THREE.Vector4() },
      uAspect: { value: 1 },
    },
  });
  const simScene = new THREE.Scene();
  simScene.add(new THREE.Mesh(quad, simMat));

  const bgCanvas = document.createElement("canvas");
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  bgTex.colorSpace = THREE.SRGBColorSpace;
  const dispMat = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: DISPLAY_FS,
    uniforms: { uHeight: { value: null }, uBg: { value: bgTex }, uTexel: { value: new THREE.Vector2() } },
  });
  const dispScene = new THREE.Scene();
  dispScene.add(new THREE.Mesh(quad, dispMat));

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const simW = Math.min(640, Math.round(w / 2.5));
    const simH = Math.max(2, Math.round((simW * h) / w));
    read.setSize(simW, simH);
    write.setSize(simW, simH);
    simMat.uniforms.uTexel.value.set(1 / simW, 1 / simH);
    dispMat.uniforms.uTexel.value.set(1 / simW, 1 / simH);
    simMat.uniforms.uAspect.value = w / h;
    paintBackground(bgCanvas, Math.min(1800, w), Math.round((Math.min(1800, w) * h) / w));
    bgTex.needsUpdate = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  // Repaint once the display font has loaded, so the headline uses it
  document.fonts?.load('800 100px "Big Shoulders Display"').then(resize).catch(() => {});

  // ---- Drops: pointer movement, clicks, and rain
  const drops: [number, number, number, number][] = [];
  const toUv = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
  };
  let lastMove = 0;
  const onMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - lastMove < 16) return;
    lastMove = now;
    const [x, y] = toUv(e);
    drops.push([x, y, 0.035, 0.03]);
  };
  const onDown = (e: PointerEvent) => {
    const [x, y] = toUv(e);
    drops.push([x, y, 0.16, 0.06]);
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);

  let visible = false;
  const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
  io.observe(canvas);

  const step = () => {
    const d = drops.shift();
    simMat.uniforms.uDrop.value.set(d?.[0] ?? 0, d?.[1] ?? 0, d?.[2] ?? 0, d?.[3] ?? 1);
    simMat.uniforms.uPrev.value = read.texture;
    renderer.setRenderTarget(write);
    renderer.render(simScene, camera);
    [read, write] = [write, read];
  };

  let raf = 0;
  let rainClock = 0;
  let last = performance.now();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    rainClock += dt;
    if (!reduce && rainClock > 0.09) {
      rainClock = 0;
      drops.push([Math.random(), Math.random(), 0.02 + Math.random() * 0.03, 0.008 + Math.random() * 0.01]);
    }
    if (drops.length > 12) drops.splice(0, drops.length - 12);
    step();
    step();
    renderer.setRenderTarget(null);
    dispMat.uniforms.uHeight.value = read.texture;
    renderer.render(dispScene, camera);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerdown", onDown);
    read.dispose();
    write.dispose();
    bgTex.dispose();
    quad.dispose();
    renderer.dispose();
  };
}
