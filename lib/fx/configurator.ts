import { BASE_PRICE_EUR, CURRENCIES, EDITIONS, STUDIOS } from "../editions";

type Cleanup = () => void;
const qs = <T extends HTMLElement>(root: ParentNode, s: string) => root.querySelector<T>(s);
const qsa = <T extends HTMLElement>(root: ParentNode, s: string) => [...root.querySelectorAll<T>(s)];
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

/**
 * Configurator panel: paint editions, currency, lighting mood and the build code.
 * It updates the text on the page and tells the 3D scene through window events.
 */
export function mountConfigurator(root: ParentNode): Cleanup {
  const panel = qs<HTMLElement>(root, "[data-config]");
  if (!panel) return () => {};
  const state = {
    edition: store.get("halden-edition") ?? "kinnow",
    currency: store.get("halden-currency") ?? "EUR",
    mood: "night",
  };
  // A link like #ed-monaco opens that edition
  const fromHash = location.hash.match(/^#ed-([a-z]+)$/)?.[1];
  if (fromHash && EDITIONS.some((e) => e.id === fromHash)) state.edition = fromHash;

  const money = (eur: number) => {
    const c = CURRENCIES.find((x) => x.code === state.currency) ?? CURRENCIES[0];
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code, maximumFractionDigits: 0 }).format(eur * c.rate);
  };

  const render = () => {
    const ed = EDITIONS.find((e) => e.id === state.edition) ?? EDITIONS[0];
    qsa<HTMLButtonElement>(panel, "[data-edition]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.edition === ed.id)));
    qsa<HTMLButtonElement>(panel, "[data-currency]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.currency === state.currency)));
    qsa<HTMLButtonElement>(panel, "[data-mood]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mood === state.mood)));
    const set = (sel: string, v: string) => qsa(panel, sel).forEach((el) => (el.textContent = v));
    set("[data-ed-name]", ed.name);
    set("[data-ed-tag]", ed.tag);
    set("[data-ed-story]", ed.story);
    set("[data-ed-finish]", ed.finish);
    set("[data-ed-option]", ed.price ? `+ ${money(ed.price)}` : "Included");
    set("[data-ed-total]", money(BASE_PRICE_EUR + ed.price));
    set("[data-ed-code]", `HS27-${ed.id.toUpperCase()}-${state.currency}`);
    qsa(panel, "[data-ed-dot]").forEach((el) => (el.style.background = ed.accent));
    window.dispatchEvent(new CustomEvent("halden:look", { detail: ed.id }));
    store.set("halden-edition", state.edition);
    store.set("halden-currency", state.currency);
  };

  const onClick = (e: Event) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!t) return;
    if (t.dataset.edition) state.edition = t.dataset.edition;
    else if (t.dataset.currency) state.currency = t.dataset.currency;
    else if (t.dataset.mood) {
      state.mood = t.dataset.mood;
      window.dispatchEvent(new CustomEvent("halden:mood", { detail: state.mood }));
    } else if (t.hasAttribute("data-copy")) {
      const code = qs<HTMLElement>(panel, "[data-ed-code]");
      const text = code?.textContent ?? "";
      const done = (msg: string) => {
        t.textContent = msg;
        setTimeout(() => (t.textContent = "Copy"), 1600);
      };
      navigator.clipboard?.writeText(text).then(() => done("Copied"), () => {
        if (code) {
          const r = document.createRange();
          r.selectNodeContents(code);
          getSelection()?.removeAllRanges();
          getSelection()?.addRange(r);
        }
        done("Selected");
      });
      return;
    } else return;
    render();
  };
  panel.addEventListener("click", onClick);
  render();
  return () => panel.removeEventListener("click", onClick);
}

/** Hotspot buttons open a small card; only one is open at a time. */
export function mountHotspots(root: ParentNode): Cleanup {
  const btns = qsa<HTMLButtonElement>(root, "[data-hotspot] > button");
  const close = () => btns.forEach((b) => b.setAttribute("aria-expanded", "false"));
  const onClick = (e: Event) => {
    const b = e.currentTarget as HTMLButtonElement;
    const open = b.getAttribute("aria-expanded") === "true";
    close();
    b.setAttribute("aria-expanded", String(!open));
  };
  const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
  btns.forEach((b) => b.addEventListener("click", onClick));
  window.addEventListener("keydown", onKey);
  return () => {
    btns.forEach((b) => b.removeEventListener("click", onClick));
    window.removeEventListener("keydown", onKey);
  };
}

/** Metric / imperial switch for the spec cards. */
export function mountUnits(root: ParentNode): Cleanup {
  const host = qs<HTMLElement>(root, "[data-units]");
  if (!host) return () => {};
  const saved = store.get("halden-units");
  const apply = (u: string) => {
    host.dataset.units = u;
    qsa<HTMLButtonElement>(host, "[data-unit-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.unitBtn === u)));
    store.set("halden-units", u);
  };
  if (saved === "imperial" || saved === "metric") apply(saved);
  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-unit-btn]");
    if (b?.dataset.unitBtn) apply(b.dataset.unitBtn);
  };
  host.addEventListener("click", onClick);
  return () => host.removeEventListener("click", onClick);
}

/** Live local time and open/closed status for each studio (open 10:00 to 20:00 local time). */
export function mountClocks(root: ParentNode): Cleanup {
  const cards = qsa<HTMLElement>(root, "[data-studio]");
  if (!cards.length) return () => {};
  const tick = () => {
    const now = new Date();
    for (const card of cards) {
      const s = STUDIOS.find((x) => x.city === card.dataset.studio);
      if (!s) continue;
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: s.tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
      const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
      const m = parts.find((p) => p.type === "minute")?.value ?? "00";
      const clock = qs<HTMLElement>(card, "[data-clock]");
      const status = qs<HTMLElement>(card, "[data-status]");
      if (clock) clock.textContent = `${String(h).padStart(2, "0")}:${m}`;
      const open = h >= 10 && h < 20;
      if (status) {
        status.textContent = open ? "Open now" : "Opens 10:00";
        status.dataset.open = String(open);
      }
    }
  };
  tick();
  const id = window.setInterval(tick, 15000);
  return () => clearInterval(id);
}
