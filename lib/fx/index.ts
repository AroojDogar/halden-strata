import { mountCarScene } from "./car-scene";
import { mountRipple } from "./ripple";
import { mountSound } from "./sound";
import { mountClocks, mountConfigurator, mountHotspots, mountUnits } from "./configurator";
import {
  mountCursor,
  mountMagnetic,
  mountMarquee,
  mountParallax,
  mountProgress,
  mountSmoothScroll,
  mountTilt,
} from "./motion";

type Cleanup = () => void;

/**
 * Finds every effect on the page by its data attribute and starts it.
 * Returns one function that stops all of them (React calls it on unmount).
 * Order matters: the 3D scene starts before the configurator so it hears the first edition.
 */
export function mountAll(root: Document): Cleanup {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cleanups: Cleanup[] = [];

  cleanups.push(mountSmoothScroll(reduce));
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-fx="car"]').forEach((c) => cleanups.push(mountCarScene(c, reduce)));
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-fx="ripple"]').forEach((c) => cleanups.push(mountRipple(c, reduce)));
  cleanups.push(
    mountConfigurator(root),
    mountHotspots(root),
    mountUnits(root),
    mountClocks(root),
    mountSound(),
    mountParallax(root, reduce),
    mountCursor(),
    mountTilt(root, reduce),
    mountMagnetic(root, reduce),
    mountMarquee(root, reduce),
    mountProgress(root),
  );

  return () => cleanups.reverse().forEach((stop) => stop());
}
