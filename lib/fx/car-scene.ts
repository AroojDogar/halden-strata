import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildCar, lookController } from "./car-model";
import { EDITIONS, HOTSPOTS } from "../editions";
import { telemetry } from "./bus";

/**
 * The fixed 3D background. As you scroll, each section marked data-cam="name"
 * pulls the camera toward its "shot". Between sections the shots are blended,
 * so the camera flies smoothly around the car.
 */
type Shot = {
  az: number; // camera angle around the car (0 = looking at the nose)
  el: number; // camera height angle
  dist: number;
  ty: number; // look-at height
  carX: number; // push the car left (-) or right (+) on screen to make room for text
  speed: number; // 0 = parked, 1 = cruising, 2 = warp
  lights: number; // headlight strength
  fov: number;
};

const SHOTS: Record<string, Shot> = {
  hero: { az: 0.62, el: 0.11, dist: 8.4, ty: 0.92, carX: 0, speed: 1, lights: 1, fov: 32 },
  design: { az: Math.PI / 2, el: 0.04, dist: 11, ty: 0.72, carX: 2.1, speed: 0.25, lights: 0.35, fov: 28 },
  power: { az: 2.55, el: 0.07, dist: 6.8, ty: 0.55, carX: -1.3, speed: 2.2, lights: 1, fov: 40 },
  configure: { az: 0.8, el: 0.3, dist: 8.6, ty: 0.55, carX: 1.1, speed: 0, lights: 0.25, fov: 30 },
};
const KEYS = Object.keys(SHOTS.hero) as (keyof Shot)[];

/** Lighting moods for the whole scene */
type Mood = { bg: string; warm: string; warmI: number; cool: string; coolI: number; env: number; grid: string; exposure: number; bloom: number };
const MOODS: Record<string, Mood> = {
  night: { bg: "#06080b", warm: "#ffb46b", warmI: 2.4, cool: "#7fb6ff", coolI: 1.3, env: 0.55, grid: "#2f5a7a", exposure: 1, bloom: 0.5 },
  studio: { bg: "#161b20", warm: "#fff4e6", warmI: 1.1, cool: "#dfe9ff", coolI: 0.9, env: 0.8, grid: "#3c4752", exposure: 0.92, bloom: 0.18 },
  golden: { bg: "#24130a", warm: "#ffae5c", warmI: 3.0, cool: "#ff7a59", coolI: 0.8, env: 0.65, grid: "#7a4a2a", exposure: 0.98, bloom: 0.35 },
};

const GROUND_VS = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const GROUND_FS = /* glsl */ `
  uniform float uOffset;
  uniform float uGlow;
  uniform vec3 uBase;
  uniform vec3 uLine;
  varying vec3 vW;
  float grid(vec2 p, float size) {
    vec2 q = p / size;
    vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    vec2 p = vW.xz;
    vec2 q = vec2(p.x + uOffset, p.y);
    float g = grid(q, 1.0) * 0.5 + grid(q, 6.0) * 0.6;
    float fade = exp(-length(p) * 0.07);
    vec3 col = uBase + uLine * g * fade;
    float pool = exp(-pow((p.x - 3.6) / 2.4, 2.0) - pow(p.y / 1.5, 2.0)) * uGlow;
    col += vec3(1.0, 0.8, 0.6) * pool * 0.12;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function mountCarScene(canvas: HTMLCanvasElement, reduce: boolean): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    canvas.dataset.failed = "true";
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const bg = new THREE.Color(MOODS.night.bg);
  const scene = new THREE.Scene();
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 16, 60);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  const rimWarm = new THREE.DirectionalLight("#ffb46b", 2.4);
  rimWarm.position.set(-6, 3, -4);
  const rimCool = new THREE.DirectionalLight("#7fb6ff", 1.3);
  rimCool.position.set(4, 4, 6);
  scene.add(rimWarm, rimCool);

  // ---- Ground: a glowing grid that scrolls under the car ("virtual space")
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VS,
    fragmentShader: GROUND_FS,
    uniforms: {
      uOffset: { value: 0 },
      uGlow: { value: 1 },
      uBase: { value: new THREE.Color("#040608") },
      uLine: { value: new THREE.Color("#2f5a7a") },
    },
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ---- Car + soft contact shadow
  const car = buildCar("#d8661f");
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 256;
  shadowCanvas.height = 128;
  const sg = shadowCanvas.getContext("2d")!;
  const grad = sg.createRadialGradient(128, 64, 4, 128, 64, 128);
  grad.addColorStop(0, "rgba(0,0,0,0.9)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 256, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 2.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  const carRig = new THREE.Group();
  carRig.add(car.group, shadow);
  scene.add(carRig);

  // ---- Light streaks flying past (one InstancedMesh = one draw call for 260 streaks)
  const N = 260;
  const streakMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true });
  const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.018, 0.018), streakMat, N);
  const sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N), sv = new Float32Array(N);
  const palette = [
    new THREE.Color("#ffb066").multiplyScalar(2.4),
    new THREE.Color("#9ec8ff").multiplyScalar(2),
    new THREE.Color("#ff4a3a").multiplyScalar(2),
  ];
  for (let i = 0; i < N; i++) {
    sx[i] = (Math.random() - 0.5) * 90;
    // keep streaks in two lanes beside the car and a far band, never right next to the camera
    sz[i] = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.6 ? 2.6 + Math.random() * 1.4 : 11 + Math.random() * 8);
    sy[i] = 0.15 + Math.random() ** 2 * 5;
    sv[i] = 0.6 + Math.random() * 0.8;
    streaks.setColorAt(i, palette[i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0]);
  }
  scene.add(streaks);

  // ---- Distant stars
  const starPos = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.45;
    starPos.set([Math.cos(th) * Math.cos(ph) * 70, Math.sin(ph) * 70 + 2, Math.sin(th) * Math.cos(ph) * 70], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fb3c8, size: 0.14, fog: false })));

  // ---- Post-processing: bloom makes the lights glow
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.45, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- Sizing
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---- Input: mouse parallax, drag to rotate, paint changes
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    mouse.tx = (e.clientX / innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove);

  let userYaw = 0;
  const dragZones = [...document.querySelectorAll<HTMLElement>("[data-drag]")];
  const dragOff: (() => void)[] = [];
  for (const z of dragZones) {
    let down = false, lx = 0;
    const pd = (e: PointerEvent) => { down = true; lx = e.clientX; z.setPointerCapture(e.pointerId); };
    const pm = (e: PointerEvent) => { if (!down) return; userYaw += (e.clientX - lx) * 0.01; lx = e.clientX; };
    const pu = () => { down = false; };
    const kd = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { userYaw -= 0.2; e.preventDefault(); }
      if (e.key === "ArrowRight") { userYaw += 0.2; e.preventDefault(); }
    };
    z.addEventListener("pointerdown", pd);
    z.addEventListener("pointermove", pm);
    z.addEventListener("pointerup", pu);
    z.addEventListener("pointercancel", pu);
    z.addEventListener("keydown", kd);
    dragOff.push(() => {
      z.removeEventListener("pointerdown", pd);
      z.removeEventListener("pointermove", pm);
      z.removeEventListener("pointerup", pu);
      z.removeEventListener("pointercancel", pu);
      z.removeEventListener("keydown", kd);
    });
  }

  // ---- Paint editions: the configurator fires "halden:look" with an edition id
  const look = lookController(car);
  look.set(EDITIONS[0], 0);
  const onLook = (e: Event) => {
    const ed = EDITIONS.find((x) => x.id === (e as CustomEvent<string>).detail);
    if (ed) look.set(ed);
  };
  window.addEventListener("halden:look", onLook);

  // ---- Lighting moods: "halden:mood" with night / studio / golden
  let mood = MOODS.night;
  const tmpC = new THREE.Color();
  const onMood = (e: Event) => {
    mood = MOODS[(e as CustomEvent<string>).detail] ?? MOODS.night;
  };
  window.addEventListener("halden:mood", onMood);

  // ---- Hotspots: HTML buttons pinned to points on the car
  const hotspotEls = HOTSPOTS.map((h) => ({
    el: document.querySelector<HTMLElement>(`[data-hotspot="${h.id}"]`),
    pos: new THREE.Vector3(...h.pos),
  }));
  const hotLayer = document.querySelector<HTMLElement>("[data-hotspots]");
  const hp = new THREE.Vector3(), hn = new THREE.Vector3(), toCam = new THREE.Vector3();
  const carCentre = new THREE.Vector3(0, 0.6, 0);

  // ---- Which shot is the camera on? Blend the two sections nearest the screen centre.
  const anchors = [...document.querySelectorAll<HTMLElement>("[data-cam]")];
  const onScreen = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) onScreen.add(en.target);
      else onScreen.delete(en.target);
    }
  });
  anchors.forEach((a) => io.observe(a));

  function targetShot(): { shot: Shot; wConfig: number } {
    const vh = innerHeight;
    let before: { d: number; k: string } | null = null;
    let after: { d: number; k: string } | null = null;
    for (const a of anchors) {
      const r = a.getBoundingClientRect();
      const d = (r.top + r.height / 2 - vh / 2) / vh; // 0 = section centred on screen
      const k = a.dataset.cam ?? "hero";
      if (d <= 0 && (!before || d > before.d)) before = { d, k };
      if (d > 0 && (!after || d < after.d)) after = { d, k };
    }
    const A = SHOTS[before?.k ?? after?.k ?? "hero"] ?? SHOTS.hero;
    const B = SHOTS[after?.k ?? before?.k ?? "hero"] ?? SHOTS.hero;
    let t = before && after ? -before.d / (after.d - before.d) : 0;
    t = t * t * (3 - 2 * t); // smoothstep
    const shot = {} as Shot;
    for (const key of KEYS) shot[key] = A[key] + (B[key] - A[key]) * t;
    const wConfig = (A === SHOTS.configure ? 1 - t : 0) + (B === SHOTS.configure ? t : 0);
    return { shot, wConfig };
  }

  const cur: Shot = { ...SHOTS.hero };
  let gridOffset = 0;
  let last = performance.now();
  let raf = 0;
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const aim = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (onScreen.size === 0) {
      // an opaque section covers the canvas: skip the work and hide the hotspots
      if (hotLayer) {
        hotLayer.style.opacity = "0";
        hotLayer.style.visibility = "hidden";
      }
      return;
    }

    const { shot, wConfig } = targetShot();
    const k = 1 - Math.exp(-dt * (reduce ? 20 : 4.5));
    for (const key of KEYS) cur[key] += (shot[key] - cur[key]) * k;
    if (reduce) cur.speed = Math.min(cur.speed, 0.3);
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));

    // Car: drag rotation only counts in the configure section
    if (wConfig < 0.1) userYaw *= Math.exp(-dt * 2);
    carRig.rotation.y = userYaw * wConfig;
    car.group.position.y = cur.speed > 0.1 && !reduce ? Math.sin(now / 90) * 0.004 * Math.min(1, cur.speed) : 0;
    const ms = cur.speed * 14;
    for (const w of car.wheels) w.spin.rotation.z -= (w.sgn * ms * dt) / 0.36;
    look.update(now);
    telemetry.speed = cur.speed;

    // Mood blend
    const mk = 1 - Math.exp(-dt * 3);
    bg.lerp(tmpC.set(mood.bg), mk);
    rimWarm.color.lerp(tmpC.set(mood.warm), mk);
    rimWarm.intensity += (mood.warmI - rimWarm.intensity) * mk;
    rimCool.color.lerp(tmpC.set(mood.cool), mk);
    rimCool.intensity += (mood.coolI - rimCool.intensity) * mk;
    scene.environmentIntensity += (mood.env - scene.environmentIntensity) * mk;
    groundMat.uniforms.uLine.value.lerp(tmpC.set(mood.grid), mk);
    renderer.toneMappingExposure += (mood.exposure - renderer.toneMappingExposure) * mk;
    bloom.strength += (mood.bloom - bloom.strength) * mk;
    car.head.emissiveIntensity = 1.5 + cur.lights * 7;
    car.tail.emissiveIntensity = 1.5 + cur.lights * 5;
    for (const b of car.beams) b.intensity = cur.lights * 40;

    // Ground and streaks move with speed
    gridOffset = (gridOffset + cur.speed * 18 * dt) % 600;
    groundMat.uniforms.uOffset.value = gridOffset;
    groundMat.uniforms.uGlow.value = cur.lights;
    streakMat.opacity = 0.2 + Math.min(1, cur.speed) * 0.8;
    for (let i = 0; i < N; i++) {
      sx[i] -= (0.8 + cur.speed * 45) * sv[i] * dt;
      if (sx[i] < -45) sx[i] += 90;
      tmpP.set(sx[i], sy[i], sz[i]);
      tmpS.set(0.3 + cur.speed * 3.2 * sv[i], 1, 1);
      streaks.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    streaks.instanceMatrix.needsUpdate = true;

    // Camera on a sphere around the car, nudged by the mouse
    const asp = camera.aspect;
    const narrow = asp < 1;
    const d = cur.dist * (narrow ? 1 + (1 - asp) * 1.3 : 1);
    const az = cur.az + mouse.x * 0.09;
    const el = Math.max(0.02, cur.el - mouse.y * 0.04);
    camera.position.set(Math.cos(el) * Math.cos(az) * d, Math.sin(el) * d + cur.ty, Math.cos(el) * Math.sin(az) * d);
    aim.set(0, cur.ty, 0);
    fwd.subVectors(aim, camera.position).normalize();
    right.crossVectors(fwd, up).normalize();
    aim.addScaledVector(right, -cur.carX * (narrow ? 0 : 1));
    camera.lookAt(aim);
    camera.fov = cur.fov * (narrow ? 1.15 : 1);
    camera.updateProjectionMatrix();

    composer.render(dt);

    // Hotspots follow the car (after render, so the matrices are current)
    if (hotLayer) {
      const show = wConfig > 0.65;
      hotLayer.style.opacity = show ? "1" : "0";
      hotLayer.style.visibility = show ? "visible" : "hidden";
      if (show) {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        for (const s of hotspotEls) {
          if (!s.el) continue;
          hp.copy(s.pos).applyMatrix4(car.group.matrixWorld);
          hn.copy(s.pos).sub(carCentre).transformDirection(car.group.matrixWorld);
          const facing = hn.dot(toCam.subVectors(camera.position, hp).normalize()) > -0.05;
          hp.project(camera);
          s.el.style.transform = `translate3d(${((hp.x + 1) / 2) * w}px, ${((1 - hp.y) / 2) * h}px, 0)`;
          s.el.dataset.hidden = facing ? "false" : "true";
          s.el.dataset.side = (hp.x + 1) / 2 > 0.6 ? "left" : "right"; // open the card toward the middle
        }
      }
    }
  };
  raf = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("halden:look", onLook);
    window.removeEventListener("halden:mood", onMood);
    dragOff.forEach((f) => f());
    composer.dispose();
    pmrem.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
    renderer.dispose();
  };
}
