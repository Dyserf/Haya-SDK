import { HayaEvent, HayaState } from "../core/types";
import { getPath } from "../utils/dom";

const THROTTLE_MS = 100;

export const initMousemoveTracker = (
  _state: HayaState,
  push: (event: HayaEvent) => void
): (() => void) => {
  let lastFired = 0;

  const handler = (e: MouseEvent) => {
    const now = Date.now();
    if (now - lastFired < THROTTLE_MS) return;
    lastFired = now;

    push({
      type: "mousemove",
      pageUrl: getPath(),
      timestamp: now,
      payload: {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      },
    });
  };

  document.addEventListener("mousemove", handler, { passive: true });
  return () => document.removeEventListener("mousemove", handler);
};
