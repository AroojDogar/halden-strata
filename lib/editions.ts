/**
 * Shared data for the configurator. Used by the server-rendered page
 * (swatches, text) and by the browser code (3D car, prices, clocks).
 */

export type Finish = "Gloss" | "Pearl" | "Satin" | "Liquid chrome" | "Colour-shift";

export interface Edition {
  id: string;
  name: string;
  tag: string; // where the palette comes from
  story: string;
  finish: Finish;
  price: number; // option price in EUR
  body: string; // paint colour
  stripe: string | null; // racing stripe colour, null = no stripes
  accent: string; // calipers, centre-lock nut, gurney flap, side line, tyre band
  wheel: string; // wheel spokes and barrel
  wheelMetal: number;
  metal: number;
  rough: number;
  clearcoat: number;
  iridescence: number; // 0 = none, 1 = full colour shift
  swatch: string; // CSS background for the swatch button
}

const stripes = (body: string, stripe: string) =>
  `radial-gradient(circle at 30% 22%, rgba(255,255,255,.5), transparent 42%), linear-gradient(90deg, ${body} 0 36%, ${stripe} 36% 44%, ${body} 44% 56%, ${stripe} 56% 64%, ${body} 64%)`;

export const EDITIONS: Edition[] = [
  {
    id: "kinnow",
    name: "Kinnow Heritage",
    tag: "Sargodha, Pakistan",
    story: "The launch colour, named after the kinnow citrus grown around Sargodha. Charcoal stripes and amber details.",
    finish: "Gloss",
    price: 0,
    body: "#d8661f", stripe: "#2a2a2a", accent: "#ffa443", wheel: "#2c3136", wheelMetal: 0.9,
    metal: 0.55, rough: 0.26, clearcoat: 1, iridescence: 0,
    swatch: stripes("#d8661f", "#2a2a2a"),
  },
  {
    id: "monaco",
    name: "Monaco Midnight",
    tag: "Monte Carlo",
    story: "Deep midnight blue with platinum stripes, for night laps past the harbour. Graphite wheels, platinum details.",
    finish: "Gloss",
    price: 8400,
    body: "#0c1a3c", stripe: "#d5dbe1", accent: "#e5e4e2", wheel: "#262a30", wheelMetal: 0.9,
    metal: 0.75, rough: 0.22, clearcoat: 1, iridescence: 0,
    swatch: stripes("#0c1a3c", "#d5dbe1"),
  },
  {
    id: "noir",
    name: "Noir Or",
    tag: "Endurance classic",
    story: "Piano black with gold stripes and gold wheels, the colours of the great 1970s endurance racers.",
    finish: "Gloss",
    price: 12500,
    body: "#08090b", stripe: "#c9a45c", accent: "#d4af37", wheel: "#b8913e", wheelMetal: 1,
    metal: 0.6, rough: 0.16, clearcoat: 1, iridescence: 0,
    swatch: stripes("#08090b", "#c9a45c"),
  },
  {
    id: "rosso",
    name: "Rosso Imola",
    tag: "Emilia-Romagna",
    story: "A deep racing red with ivory stripes and polished silver wheels.",
    finish: "Gloss",
    price: 4900,
    body: "#8c0d14", stripe: "#efe8da", accent: "#dfe3e7", wheel: "#c4c9ce", wheelMetal: 1,
    metal: 0.5, rough: 0.22, clearcoat: 1, iridescence: 0,
    swatch: stripes("#8c0d14", "#efe8da"),
  },
  {
    id: "goodwood",
    name: "Goodwood Green",
    tag: "West Sussex",
    story: "British racing green with cream stripes and bronze wheels, made for summer hill climbs.",
    finish: "Gloss",
    price: 6200,
    body: "#0e3a29", stripe: "#e9dcbd", accent: "#c08a4a", wheel: "#8c6a3f", wheelMetal: 1,
    metal: 0.6, rough: 0.24, clearcoat: 1, iridescence: 0,
    swatch: stripes("#0e3a29", "#e9dcbd"),
  },
  {
    id: "pearl",
    name: "Champagne Pearl",
    tag: "Dubai",
    story: "A warm pearl white that shimmers pink and gold as you walk around it. Bronze stripes, champagne wheels.",
    finish: "Pearl",
    price: 9600,
    body: "#e9e0cf", stripe: "#9b7b4f", accent: "#c9a46a", wheel: "#cdb48a", wheelMetal: 1,
    metal: 0.3, rough: 0.2, clearcoat: 1, iridescence: 0.45,
    swatch: `radial-gradient(circle at 30% 22%, rgba(255,255,255,.7), transparent 45%), conic-gradient(from 200deg, #f3ead8, #f0d9d0, #e9e0cf, #efe3c2, #f3ead8)`,
  },
  {
    id: "satin",
    name: "Graphite Satin",
    tag: "Nürburgring",
    story: "Satin graphite with no shine at all. Amber stripes and black wheels for a stealth track look.",
    finish: "Satin",
    price: 7200,
    body: "#41464c", stripe: "#ffa443", accent: "#ffa443", wheel: "#121416", wheelMetal: 0.6,
    metal: 0.35, rough: 0.58, clearcoat: 0.05, iridescence: 0,
    swatch: stripes("#41464c", "#ffa443").replace("rgba(255,255,255,.5)", "rgba(255,255,255,.15)"),
  },
  {
    id: "mercury",
    name: "Liquid Mercury",
    tag: "Concours edition",
    story: "Polished liquid chrome that mirrors everything around it. Black stripes, red details. Limited to 27 cars.",
    finish: "Liquid chrome",
    price: 24000,
    body: "#dfe3e8", stripe: "#0b0d10", accent: "#ff3b30", wheel: "#15171a", wheelMetal: 0.8,
    metal: 1, rough: 0.05, clearcoat: 1, iridescence: 0,
    swatch: `linear-gradient(135deg, #f7f9fb 0%, #9aa3ad 30%, #f2f4f6 48%, #5d6670 70%, #e9edf1 100%)`,
  },
  {
    id: "aurora",
    name: "Aurora Flip",
    tag: "Tromsø",
    story: "A colour-shift paint that turns from violet to teal to gold depending on where you stand.",
    finish: "Colour-shift",
    price: 18500,
    body: "#3b1f63", stripe: null, accent: "#4fd1c5", wheel: "#1a1c20", wheelMetal: 0.85,
    metal: 0.7, rough: 0.18, clearcoat: 1, iridescence: 1,
    swatch: `radial-gradient(circle at 30% 22%, rgba(255,255,255,.45), transparent 42%), conic-gradient(from 120deg, #3b1f63, #2a7f8f, #4fd1c5, #c9a45c, #7a2f7a, #3b1f63)`,
  },
];

export const BASE_PRICE_EUR = 189000;

export const CURRENCIES = [
  { code: "EUR", rate: 1, locale: "en-IE" },
  { code: "USD", rate: 1.08, locale: "en-US" },
  { code: "GBP", rate: 0.85, locale: "en-GB" },
  { code: "AED", rate: 3.97, locale: "en-AE" },
  { code: "PKR", rate: 302, locale: "en-PK" },
] as const;

export const MOODS = [
  { id: "night", name: "Night" },
  { id: "studio", name: "Studio" },
  { id: "golden", name: "Golden hour" },
] as const;

export const HOTSPOTS = [
  { id: "wing", label: "Swan-neck wing", text: "Mounted from above so air under the wing stays clean. Adds 640 kg of downforce at 250 km/h.", pos: [-2.05, 1.45, 0.62] },
  { id: "lights", label: "Tri-slash lights", text: "Three LED blades per side, the Halden signature. Matrix high beams reach 600 m.", pos: [2.32, 0.56, 0.6] },
  { id: "splitter", label: "Carbon splitter", text: "One piece of pre-preg carbon fibre. It seals the floor so the diffuser can pull the car down.", pos: [2.62, 0.24, -0.45] },
  { id: "wheels", label: "Centre-lock wheels", text: "Forged magnesium, one nut each, like a race car. A full set changes in under 30 seconds.", pos: [1.5, 0.37, 1.02] },
  { id: "canopy", label: "Teardrop canopy", text: "The glass roof sits low between the fenders. Headroom for a 1.95 m driver wearing a helmet.", pos: [0.15, 1.27, 0] },
  { id: "battery", label: "800 V battery", text: "105 kWh sits under the floor, between the axles, for a 48:52 weight balance.", pos: [0.2, 0.36, -1.0] },
] as const;

export const STUDIOS = [
  { city: "Monaco", area: "Port Hercule", tz: "Europe/Monaco" },
  { city: "London", area: "Mayfair", tz: "Europe/London" },
  { city: "Munich", area: "Maxvorstadt", tz: "Europe/Berlin" },
  { city: "Dubai", area: "DIFC", tz: "Asia/Dubai" },
  { city: "Lahore", area: "Gulberg", tz: "Asia/Karachi" },
  { city: "Tokyo", area: "Ginza", tz: "Asia/Tokyo" },
] as const;
