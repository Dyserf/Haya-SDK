import { HayaEvent, HayaState } from "../core/types";
import { getPath } from "../utils/dom";

const THROTTLE_MS = 200;

export const initScrollTracker = (
  _state: HayaState,
  push: (event: HayaEvent) => void
): (() => void) => {
  let lastFired = 0;

  const handler = () => {
    const now = Date.now();
    if (now - lastFired < THROTTLE_MS) return;
    lastFired = now;

    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollY = window.scrollY;
    const depth =
      docHeight > 0 ? Math.round((scrollY / docHeight) * 100) : 0;

    push({
      type: "scroll",
      pageUrl: getPath(),
      timestamp: now,
      payload: {
        scrollDepth: Math.min(depth, 100),
        scrollY: Math.round(scrollY),
        scrollDirection: scrollY > (lastFired > 0 ? scrollY : 0) ? "down" : "up",
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
      },
    });
  };

  window.addEventListener("scroll", handler, { passive: true });
  return () => window.removeEventListener("scroll", handler);
};
