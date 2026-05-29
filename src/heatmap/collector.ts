import { HayaEvent, HayaState } from "../core/types";
import { getPath } from "../utils/dom";

/**
 * The heatmap collector re-uses the click and scroll events already pushed
 * by the main collectors — no extra listeners needed here.
 *
 * This module provides helper utilities the dashboard can use to overlay
 * heatmap data on top of a page screenshot.
 *
 * On the client, we simply ensure click coordinates are normalised
 * relative to the document dimensions so the backend can group them
 * consistently regardless of the visitor's viewport size.
 */
export const normalizeClickEvent = (
  e: MouseEvent,
  state: HayaState
): HayaEvent => ({
  type: "click",
  pageUrl: getPath(),
  timestamp: Date.now(),
  payload: {
    // Absolute page coordinates (scroll-adjusted) for backend aggregation
    x: Math.round(e.pageX),
    y: Math.round(e.pageY),
    // Viewport-relative for overlay rendering
    clientX: Math.round(e.clientX),
    clientY: Math.round(e.clientY),
    // Normalize to 0–100% of viewport so heatmaps scale across resolutions
    xPct: parseFloat(((e.clientX / state.viewportWidth) * 100).toFixed(2)),
    yPct: parseFloat(((e.clientY / state.viewportHeight) * 100).toFixed(2)),
    viewportWidth: state.viewportWidth,
    viewportHeight: state.viewportHeight,
  },
});

export const normalizeScrollEvent = (state: HayaState): HayaEvent => {
  const docHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  const depth =
    docHeight > 0
      ? Math.round((window.scrollY / docHeight) * 100)
      : 0;

  return {
    type: "scroll",
    pageUrl: getPath(),
    timestamp: Date.now(),
    payload: {
      scrollDepth: Math.min(depth, 100),
      scrollY: Math.round(window.scrollY),
      viewportHeight: state.viewportHeight,
      documentHeight: document.documentElement.scrollHeight,
    },
  };
};
