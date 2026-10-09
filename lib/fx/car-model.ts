import * as THREE from "three";

/**
 * Halden Strata GT, a procedural GT race car. No 3D files are downloaded.
 *
 * How the body is made (a "loft"):
 *   The car is sliced into ~220 cross-sections from tail to nose. Each slice is a
 *   rounded-box shape (a superellipse) whose width and height come from smooth
 *   curves along the length. Stitching the slices together gives one smooth skin
 *   with a narrow waist, wide hips, fenders that rise above the bonnet, and wheel
 *   arches cut into the bottom edge.
 *
 * Coordinates: +X is the front of the car, +Y is up, Z is across the car.
 */
export interface CarParts {
  group: THREE.Group;
  paint: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshStandardMaterial;
  wheel: THREE.MeshStandardMaterial;
  stripe: { color: { value: THREE.Color }; amount: { value: number } };
  head: THREE.MeshStandardMaterial;
  tail: THREE.MeshStandardMaterial;
  wheels: { spin: THREE.Group; sgn: number }[];
  beams: THREE.SpotLight[];
}

// ---------- smooth curves through control points (monotone cubic, no overshoot)
function curve(pts: [number, number][]) {
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    d[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h[i] * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h[i] * m[i + 1]
    );
  };
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- the body's design curves (metres)
const X_TAIL = -2.42;
const X_NOSE = 2.55;
const WHEEL_X = [1.5, -1.45];
const WHEEL_R = 0.37;
const TRACK = 0.84; // wheel centre distance from the middle

/** Half width seen from above: narrow waist between wide front fenders and wider rear hips */
const halfWidth = curve([
  [-2.42, 0.95], [-2.2, 1.02], [-1.45, 1.08], [-0.6, 0.97], [0.3, 0.92],
  [1.0, 0.99], [1.5, 1.04], [2.0, 0.98], [2.3, 0.87], [2.47, 0.66], [2.55, 0.3],
]);
/** Height along the centre line: low nose, bonnet dips between the fenders, high Kamm tail */
const topCentre = curve([
  [-2.42, 0.9], [-2.0, 0.95], [-1.2, 0.9], [-0.4, 0.86], [0.6, 0.83], [1.0, 0.78],
  [1.5, 0.68], [2.0, 0.57], [2.3, 0.46], [2.47, 0.37], [2.55, 0.3],
]);
/** Height of the fender peaks: they rise above the bonnet, like a Le Mans racer */
const topFender = curve([
  [-2.42, 0.92], [-2.0, 0.99], [-1.45, 1.05], [-0.8, 0.9], [0.0, 0.84], [0.8, 0.86],
  [1.5, 0.95], [2.0, 0.78], [2.3, 0.59], [2.47, 0.42], [2.55, 0.31],
]);
/** Sill height (bottom edge) */
const sill = curve([[-2.42, 0.29], [-2.2, 0.2], [2.2, 0.2], [2.47, 0.22], [2.55, 0.25]]);
/** Superellipse exponent: higher = boxier slice, lower = rounder */
const squareness = curve([[-2.42, 3.4], [0, 3.0], [2.3, 2.6], [2.55, 2.2]]);

function station(x: number) {
  const yb = sill(x);
  let arch = yb;
  for (const wx of WHEEL_X) {
    const dx = (x - wx) / 0.5;
    if (Math.abs(dx) < 1) arch = Math.max(arch, yb + (0.81 - yb) * Math.sqrt(1 - dx * dx));
  }
  return { W: halfWidth(x), ytc: topCentre(x), yts: topFender(x), yb, arch, n: squareness(x) };
}

/**
 * A point on the body skin. t runs around the slice:
 * -PI/2 = underneath, 0 = right side (+Z), PI/2 = top, PI = left side.
 */
function bodyPoint(x: number, t: number, out = new THREE.Vector3()) {
  const s = station(x);
  const e = 2 / s.n;
  const c = Math.cos(t);
  const sn = Math.sin(t);
  const zr = Math.sign(c) * Math.pow(Math.abs(c), e);
  const yn = Math.sign(sn) * Math.pow(Math.abs(sn), e);
  const a = Math.abs(zr);
  const top = s.ytc + (s.yts - s.ytc) * smooth(0.3, 0.8, a);
  // The arch only lifts the outer part of the slice, so the centre stays a closed floor
  const bottom = s.yb + (s.arch - s.yb) * smooth(0.46, 0.6, a);
  return out.set(x, bottom + ((top - bottom) * (yn + 1)) / 2, zr * s.W);
}

/** Outward surface normal at (x, t), used to stick lights and decals onto the skin */
function bodyNormal(x: number, t: number) {
  const p = bodyPoint(x, t);
  const dx = bodyPoint(x + 1e-3, t).sub(p);
  const dt = bodyPoint(x, t + 1e-3).sub(p);
  return dx.cross(dt).normalize();
}

// ---------- loft builder shared by body and canopy
type Loft = {
  x0: number;
  x1: number;
  stations: number;
  t0: number;
  t1: number;
  segments: number;
  point: (x: number, t: number, out: THREE.Vector3) => THREE.Vector3;
  /** returns the material index for a face centred at (x, t) */
  group: (x: number, t: number) => number;
  groups: number;
};

function loft(o: Loft) {
  const cols = o.segments + 1;
  const pos = new Float32Array(o.stations * cols * 3);
  const uv = new Float32Array(o.stations * cols * 2);
  const p = new THREE.Vector3();
  const prev = new THREE.Vector3();
  const topT = Math.PI / 2;
  for (let i = 0; i < o.stations; i++) {
    const x = o.x0 + ((o.x1 - o.x0) * i) / (o.stations - 1);
    // arc length around the slice, measured from the top centre, so stripes keep a constant width
    const arcs: number[] = [];
    let arc = 0;
    let arcTop = 0;
    for (let j = 0; j < cols; j++) {
      const t = o.t0 + ((o.t1 - o.t0) * j) / o.segments;
      o.point(x, t, p);
      if (j > 0) arc += p.distanceTo(prev);
      prev.copy(p);
      arcs.push(arc);
      if (Math.abs(t - topT) < ((o.t1 - o.t0) / o.segments) * 0.5) arcTop = arc;
      pos.set([p.x, p.y, p.z], (i * cols + j) * 3);
    }
    for (let j = 0; j < cols; j++) {
      uv.set([(x - X_TAIL) / (X_NOSE - X_TAIL), 0.5 + (arcs[j] - arcTop) / 4], (i * cols + j) * 2);
    }
  }
  const buckets: number[][] = Array.from({ length: o.groups }, () => []);
  for (let i = 0; i < o.stations - 1; i++) {
    const xm = o.x0 + ((o.x1 - o.x0) * (i + 0.5)) / (o.stations - 1);
    for (let j = 0; j < o.segments; j++) {
      const tm = o.t0 + ((o.t1 - o.t0) * (j + 0.5)) / o.segments;
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      buckets[o.group(xm, tm)].push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(buckets.flat());
  let start = 0;
  buckets.forEach((b, k) => {
    geo.addGroup(start, b.length, k);
    start += b.length;
  });
  geo.computeVertexNormals(); // computed on the whole skin, so no seam between paint and carbon
  return geo;
}

// ---------- canvas textures
function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, redraw: () => { draw(c.getContext("2d")!); tex.needsUpdate = true; } };
}

/**
 * Livery mask. It is not a picture: the red channel marks the racing stripes and the
 * green channel marks door shut lines. A small shader edit (below) turns the red area
 * into the stripe colour, so stripes can be any colour and animate between editions.
 */
function liveryTexture() {
  const { tex } = canvasTexture(1024, 1024, (g) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = "#f00";
    const band = (from: number, to: number) => {
      g.fillRect(0, (0.5 - to) * 1024, 1024, (to - from) * 1024);
      g.fillRect(0, (0.5 + from) * 1024, 1024, (to - from) * 1024);
    };
    band(0.012, 0.04); // stripes 5 to 16 cm either side of the centre line
    g.fillStyle = "#0f0";
    for (const x of [0.97, -0.6]) {
      const u = ((x - X_TAIL) / (X_NOSE - X_TAIL)) * 1024;
      g.fillRect(u, 0.08 * 1024, 2, 0.17 * 1024);
      g.fillRect(u, 0.75 * 1024, 2, 0.17 * 1024);
    }
  }, false);
  return tex;
}

/** Carbon-fibre twill weave */
function carbonTexture(repeatX: number, repeatY: number) {
  const { tex } = canvasTexture(64, 64, (g) => {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const on = (x + y) % 4 < 2;
        g.fillStyle = on ? "#22262b" : "#121518";
        g.fillRect(x * 8, y * 8, 8, 8);
      }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

/** Racing number roundel */
function roundelTexture() {
  const r = canvasTexture(512, 512, (g) => {
    g.clearRect(0, 0, 512, 512);
    g.fillStyle = "#f1ece2";
    g.beginPath();
    g.arc(256, 256, 250, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#ffa443";
    g.lineWidth = 18;
    g.beginPath();
    g.arc(256, 256, 226, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#0b0d10";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = '900 300px "Big Shoulders Display", Impact, "Arial Black", sans-serif';
    g.fillText("27", 256, 272);
  });
  document.fonts?.load('900 300px "Big Shoulders Display"').then(r.redraw).catch(() => {});
  return r.tex;
}

// ---------- 2D helpers
function airfoil(chord: number, thick: number, camber: number) {
  const N = 40;
  const up: THREE.Vector2[] = [];
  const lo: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) {
    const c = (1 - Math.cos((Math.PI * i) / N)) / 2;
    const yt = 5 * thick * (0.2969 * Math.sqrt(c) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1036 * c ** 4);
    const p = 0.4;
    // camber is negative: an upside-down wing pushes the car down instead of lifting it
    const yc = -(c < p ? (camber / (p * p)) * (2 * p * c - c * c) : (camber / (1 - p) ** 2) * (1 - 2 * p + 2 * p * c - c * c));
    up.push(new THREE.Vector2(-c * chord, (yc + yt) * chord));
    lo.push(new THREE.Vector2(-c * chord, (yc - yt) * chord));
  }
  return new THREE.Shape([...up, ...lo.reverse()]);
}

/** A blade of constant width that follows a curve (for the swan-neck wing mounts) */
function blade(points: [number, number][], width: number) {
  const c = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const p = c.getPoint(u);
    const tg = c.getTangent(u);
    const nrm = new THREE.Vector2(-tg.y, tg.x).multiplyScalar(width / 2);
    left.push(p.clone().add(nrm));
    right.push(p.clone().sub(nrm));
  }
  return new THREE.Shape([...left, ...right.reverse()]);
}

const v2 = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

// =====================================================================
export function buildCar(hex: string): CarParts {
  const group = new THREE.Group();

  // ---- materials
  const stripe = { color: { value: new THREE.Color("#2a2a2a") }, amount: { value: 1 } };
  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    map: liveryTexture(),
    metalness: 0.55,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 0,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [200, 900],
  });
  // Shader edit: use the livery mask to paint stripes in their own colour
  paint.onBeforeCompile = (shader) => {
    shader.uniforms.uStripe = stripe.color;
    shader.uniforms.uStripeAmt = stripe.amount;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform vec3 uStripe;\nuniform float uStripeAmt;\nvoid main() {")
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec4 livery = texture2D( map, vMapUv );
          diffuseColor.rgb = mix( diffuseColor.rgb, uStripe, livery.r * uStripeAmt );
          diffuseColor.rgb *= 1.0 - livery.g * 0.75;
        #endif`,
      );
  };
  const carbonBody = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: carbonTexture(160, 110),
    roughness: 0.42,
    metalness: 0.25,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const carbon = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: carbonTexture(14, 14),
    roughness: 0.42,
    metalness: 0.25,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.6 });
  const blackPanel = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.5, side: THREE.DoubleSide });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x04070a, metalness: 0.2, roughness: 0.03, clearcoat: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.92 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0x2c3136, metalness: 0.9, roughness: 0.28 });
  const polished = new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 1, roughness: 0.18 });
  const disc = new THREE.MeshStandardMaterial({ color: 0x3a3d40, metalness: 0.8, roughness: 0.45 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffa443, roughness: 0.35, emissive: 0xff8a20, emissiveIntensity: 0.15 });
  const head = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe8f0ff, emissiveIntensity: 2 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3a24, emissiveIntensity: 2 });

  // ---- body skin: paint on top, carbon below the side line
  const body = loft({
    x0: X_TAIL,
    x1: X_NOSE,
    stations: 220,
    t0: -Math.PI / 2,
    t1: (3 * Math.PI) / 2,
    segments: 160,
    point: bodyPoint,
    group: (_x, t) => (Math.sin(t) < -0.5 ? 1 : 0),
    groups: 2,
  });
  group.add(new THREE.Mesh(body, [paint, carbonBody]));

  // ---- end caps: flat Kamm tail panel and the tip of the nose
  for (const [x, dir] of [[X_TAIL, -1], [X_NOSE, 1]] as const) {
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < 96; j++) ring.push(bodyPoint(x, -Math.PI / 2 + (j / 96) * Math.PI * 2));
    const centre = ring.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / ring.length);
    const pts = [centre, ...ring];
    const idx: number[] = [];
    for (let j = 0; j < 96; j++) {
      const a = 1 + j;
      const b = 1 + ((j + 1) % 96);
      if (dir > 0) idx.push(0, a, b);
      else idx.push(0, b, a);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setIndex(idx);
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, blackPanel));
  }

  // ---- teardrop canopy: glass with a body-colour roof that becomes a fastback
  const canopyTop = curve([[-1.32, 0.9], [-1.1, 1.0], [-0.8, 1.14], [-0.4, 1.24], [0.0, 1.25], [0.3, 1.17], [0.7, 0.98], [1.05, 0.8]]);
  const canopyHalf = curve([[-1.32, 0.12], [-1.1, 0.32], [-0.8, 0.5], [-0.3, 0.66], [0.2, 0.68], [0.7, 0.6], [1.05, 0.45]]);
  const CANOPY_BASE = 0.76;
  const canopyPoint = (x: number, t: number, out: THREE.Vector3) => {
    const e = 2 / 2.6;
    const c = Math.cos(t);
    const s = Math.max(0, Math.sin(t));
    return out.set(
      x,
      CANOPY_BASE + (canopyTop(x) - CANOPY_BASE) * Math.pow(s, e),
      Math.sign(c) * Math.pow(Math.abs(c), e) * canopyHalf(x),
    );
  };
  const roofHalfAngle = (x: number) => (x > -0.35 ? 0.62 : Math.min(Math.PI / 2 + 0.1, 0.62 + ((-0.35 - x) / 0.5) * (Math.PI / 2 - 0.52)));
  const canopy = loft({
    x0: -1.32,
    x1: 1.05,
    stations: 110,
    t0: 0,
    t1: Math.PI,
    segments: 80,
    point: canopyPoint,
    group: (x, t) => (x < 0.42 && Math.abs(t - Math.PI / 2) < roofHalfAngle(x) ? 0 : 1),
    groups: 2,
  });
  group.add(new THREE.Mesh(canopy, [paint, glass]));

  // ---- helpers to place parts on the skin
  const onSkin = (obj: THREE.Object3D, x: number, t: number, lift = 0.006) => {
    const n = bodyNormal(x, t);
    obj.position.copy(bodyPoint(x, t)).addScaledVector(n, lift);
    group.add(obj);
    obj.lookAt(obj.position.clone().add(n));
    return obj;
  };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };

  // ---- lights: the "tri-slash" signature, three angled LED blades each side
  for (const side of [1, -1]) {
    const t = Math.PI / 2 - side * 0.95;
    const g = onSkin(new THREE.Group(), 2.3, t, 0.004);
    for (let k = 0; k < 3; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.012), head);
      bar.position.set(side * (k * 0.045 - 0.045), 0.04 - k * 0.04, 0);
      bar.rotation.z = side * 0.42;
      g.add(bar);
    }
  }
  const tailBar = add(new THREE.BoxGeometry(0.02, 0.035, 1.66), tail, X_TAIL - 0.006, 0.8, 0);
  tailBar.name = "tail-bar";
  for (const side of [1, -1]) {
    for (let k = 0; k < 3; k++) {
      const s = add(new THREE.BoxGeometry(0.02, 0.1, 0.02), tail, X_TAIL - 0.006, 0.7 - k * 0.01, side * (0.78 - k * 0.05));
      s.rotation.x = side * 0.5;
    }
  }
  add(new THREE.BoxGeometry(0.02, 0.06, 0.06), tail, X_TAIL - 0.04, 0.36, 0); // FIA rain light

  // ---- headlight beams for the night scenes
  const beams: THREE.SpotLight[] = [];
  for (const z of [-0.6, 0.6]) {
    const l = new THREE.SpotLight(0xeef3ff, 0, 18, 0.45, 0.6, 2);
    l.position.set(2.35, 0.5, z);
    l.target.position.set(7, 0, z * 1.4);
    group.add(l, l.target);
    beams.push(l);
  }

  // ---- aero: front splitter, canards, diffuser
  const splitter = new THREE.ExtrudeGeometry(
    new THREE.Shape(v2([[1.9, -0.99], [2.45, -0.95], [2.64, -0.72], [2.7, 0], [2.64, 0.72], [2.45, 0.95], [1.9, 0.99]])),
    { depth: 0.028, bevelEnabled: false },
  );
  splitter.rotateX(Math.PI / 2);
  add(splitter, carbon, 0, 0.2, 0);
  for (const side of [1, -1]) {
    for (const [x, y, z] of [[2.28, 0.34, 0.93], [2.14, 0.45, 0.98]]) {
      const c = add(new THREE.BoxGeometry(0.24, 0.012, 0.12), carbon, x, y, side * z);
      c.rotation.set(0, side * 0.35, 0.16);
    }
  }
  add(new THREE.BoxGeometry(0.62, 0.05, 1.56), carbon, -2.13, 0.16, 0);
  for (let k = -2; k <= 2; k++) {
    const fin = add(new THREE.BoxGeometry(0.6, 0.16, 0.012), carbon, -2.2, 0.22, k * 0.3);
    fin.rotation.z = -0.12;
  }

  // ---- rear wing on swan-neck mounts, with endplates and a gurney flap
  const SPAN = 1.96;
  const wingMain = new THREE.ExtrudeGeometry(airfoil(0.5, 0.12, 0.07), { depth: SPAN, bevelEnabled: false });
  wingMain.translate(0, 0, -SPAN / 2);
  const wing = add(wingMain, carbon, -1.8, 1.3, 0);
  wing.rotation.z = -0.1;
  const flapGeo = new THREE.ExtrudeGeometry(airfoil(0.2, 0.1, 0.05), { depth: SPAN, bevelEnabled: false });
  flapGeo.translate(0, 0, -SPAN / 2);
  const flap = add(flapGeo, carbon, -2.19, 1.38, 0);
  flap.rotation.z = -0.5;
  const gurney = add(new THREE.BoxGeometry(0.008, 0.035, SPAN), amber, -2.37, 1.47, 0);
  gurney.rotation.z = -0.5;
  for (const side of [1, -1]) {
    const neck = new THREE.ExtrudeGeometry(
      blade([[-1.5, 0.88], [-1.56, 1.2], [-1.74, 1.47], [-1.95, 1.45], [-2.02, 1.37]], 0.07),
      { depth: 0.022, bevelEnabled: false },
    );
    neck.translate(0, 0, -0.011);
    add(neck, carbon, 0, 0, side * 0.42);
    const plate = new THREE.ExtrudeGeometry(
      new THREE.Shape(v2([[-1.7, 1.12], [-2.44, 1.1], [-2.47, 1.58], [-1.95, 1.54], [-1.7, 1.36]])),
      { depth: 0.016, bevelEnabled: false },
    );
    plate.translate(0, 0, -0.008);
    add(plate, carbon, 0, 0, side * (SPAN / 2 + 0.008));
  }

  // ---- shark fin from the roof to the wing
  const fin = new THREE.ExtrudeGeometry(
    new THREE.Shape(v2([[-0.5, 1.2], [-1.0, 1.08], [-1.32, 0.88], [-2.0, 0.93], [-2.0, 1.2], [-1.3, 1.22], [-0.5, 1.26]])),
    { depth: 0.016, bevelEnabled: false },
  );
  fin.translate(0, 0, -0.008);
  add(fin, carbon);

  // ---- mirrors on carbon stalks
  for (const side of [1, -1]) {
    const pod = add(new THREE.SphereGeometry(0.075, 24, 16), carbon, 0.68, 1.0, side * 0.88);
    pod.scale.set(1.5, 0.75, 1);
    const stalk = add(new THREE.BoxGeometry(0.05, 0.13, 0.018), carbon, 0.72, 0.92, side * 0.82);
    stalk.rotation.x = side * 0.5;
  }

  // ---- details on the skin: bonnet vents, side intakes, number roundels, amber side line
  const vent = new THREE.PlaneGeometry(0.3, 0.12);
  for (const side of [1, -1]) {
    const v = onSkin(new THREE.Mesh(vent, black), 1.95, Math.PI / 2 - side * 0.3);
    v.rotateZ(side * 0.2);
    const intake = onSkin(new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.16), black), -0.85, side > 0 ? 0.05 : Math.PI - 0.05, 0.008);
    intake.rotateZ(-0.18);
  }
  const roundelMat = new THREE.MeshStandardMaterial({
    map: roundelTexture(),
    color: 0xc8c4bc,
    transparent: true,
    roughness: 0.35,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  for (const t of [0.14, Math.PI - 0.14]) onSkin(new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), roundelMat), -0.08, t, 0.012);

  for (const t of [-Math.PI / 6, Math.PI + Math.PI / 6]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -0.92 + (1.84 * i) / 40;
      pts.push(bodyPoint(x, t).addScaledVector(bodyNormal(x, t), 0.006));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.007, 6), amber);
  }

  // ---- wheels: centre-lock racing wheels, slick tyres with an amber sidewall band
  const wheels: CarParts["wheels"] = [];
  for (const wx of WHEEL_X) {
    for (const side of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(wx, WHEEL_R, side * TRACK);
      if (side < 0) w.rotation.y = Math.PI;
      const spin = new THREE.Group();
      w.add(spin);

      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.3, 64, 1, true), rubber);
      tyre.rotation.x = Math.PI / 2;
      spin.add(tyre);
      for (const zf of [1, -1]) {
        const wall = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.055, 14, 64), rubber);
        wall.position.z = zf * 0.12;
        spin.add(wall);
      }
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.006, 6, 80), amber);
      band.position.z = 0.168;
      spin.add(band);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.26, 48, 1, true), alloy);
      barrel.rotation.x = Math.PI / 2;
      spin.add(barrel);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.012, 8, 64), polished);
      lip.position.z = 0.13;
      spin.add(lip);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 48), disc);
      rotor.rotation.x = Math.PI / 2;
      rotor.position.z = 0.0;
      spin.add(rotor);
      // five twin spokes
      for (let i = 0; i < 5; i++) {
        for (const off of [-0.13, 0.13]) {
          const a = (i * 2 * Math.PI) / 5 + off;
          const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.026, 0.035), alloy);
          sp.position.set(Math.cos(a) * 0.155, Math.sin(a) * 0.155, 0.11);
          sp.rotation.z = a - off * 0.6;
          spin.add(sp);
        }
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32), polished);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = 0.12;
      spin.add(hub);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6), amber);
      nut.rotation.x = Math.PI / 2;
      nut.position.z = 0.15;
      spin.add(nut);

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.06), amber);
      caliper.position.set(-0.17, 0.12, 0.045);
      caliper.rotation.z = 0.65;
      w.add(caliper);

      wheels.push({ spin, sgn: side });
      group.add(w);
    }
  }

  group.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  return { group, paint, accent: amber, wheel: alloy, stripe, head, tail, wheels, beams };
}

/** What a paint edition sets on the car (a subset of the Edition data) */
export interface Look {
  body: string;
  stripe: string | null;
  accent: string;
  wheel: string;
  wheelMetal: number;
  metal: number;
  rough: number;
  clearcoat: number;
  iridescence: number;
}

/**
 * Blends the car from its current look to a new one over 0.9 seconds.
 * The blend is timed (not per-frame), so it always finishes exactly, even on a slow device.
 * Call set() when the edition changes and update(now) every frame.
 */
export function lookController(car: CarParts) {
  const snap = () => ({
    body: car.paint.color.clone(),
    stripe: car.stripe.color.value.clone(),
    stripeAmt: car.stripe.amount.value,
    accent: car.accent.color.clone(),
    wheel: car.wheel.color.clone(),
    wheelMetal: car.wheel.metalness,
    metal: car.paint.metalness,
    rough: car.paint.roughness,
    clearcoat: car.paint.clearcoat,
    iridescence: car.paint.iridescence,
  });
  let from = snap();
  let to = snap();
  let start = -1e9;
  const DURATION = 900;
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return {
    set(l: Look, now = performance.now()) {
      from = snap();
      to = {
        body: new THREE.Color(l.body),
        stripe: l.stripe ? new THREE.Color(l.stripe) : from.stripe.clone(),
        stripeAmt: l.stripe ? 1 : 0,
        accent: new THREE.Color(l.accent),
        wheel: new THREE.Color(l.wheel),
        wheelMetal: l.wheelMetal,
        metal: l.metal,
        rough: l.rough,
        clearcoat: l.clearcoat,
        iridescence: l.iridescence,
      };
      start = now;
    },
    update(now: number) {
      const raw = Math.min(1, Math.max(0, (now - start) / DURATION));
      if (raw >= 1 && car.paint.color.equals(to.body)) return; // already there
      const t = raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2; // ease in-out
      const p = car.paint;
      p.color.lerpColors(from.body, to.body, t);
      p.metalness = mix(from.metal, to.metal, t);
      p.roughness = mix(from.rough, to.rough, t);
      p.clearcoat = mix(from.clearcoat, to.clearcoat, t);
      const ir = mix(from.iridescence, to.iridescence, t);
      p.iridescence = ir < 0.005 ? 0 : ir; // exactly 0 switches the effect off
      car.stripe.color.value.lerpColors(from.stripe, to.stripe, t);
      car.stripe.amount.value = mix(from.stripeAmt, to.stripeAmt, t);
      car.accent.color.lerpColors(from.accent, to.accent, t);
      car.accent.emissive.copy(car.accent.color).multiplyScalar(0.12);
      car.wheel.color.lerpColors(from.wheel, to.wheel, t);
      car.wheel.metalness = mix(from.wheelMetal, to.wheelMetal, t);
    },
  };
}
