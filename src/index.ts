import { createState } from "./core/runtime";
import { HayaConfig, HayaEvent } from "./core/types";
import { EventBuffer } from "./transport/buffer";
import { initClickTracker } from "./collectors/click";
import { initScrollTracker } from "./collectors/scroll";
import { initMousemoveTracker } from "./collectors/mousemove";
import { initRouteTracker } from "./collectors/route";
import { initFormTracker } from "./collectors/form";
import { initReplayEngine } from "./replay/engine";
import { setDebug, log, warn } from "./utils/logger";
import { getPath } from "./utils/dom";

type StopFn = () => void;

let buffer: EventBuffer | null = null;
let teardowns: StopFn[] = [];
let isInitialized = false;

/**
 * Initialise the Haya Analytics SDK.
 *
 * @param projectId  - Your SDK key from the Haya dashboard (public write key)
 * @param userConfig - Optional feature flags and settings
 *
 * @example
 * haya.init("proj_abc123", {
 *   sessionReplay: true,
 *   heatmaps: true,
 *   autoTrack: { clicks: true, scrolls: true, pageviews: true },
 *   maskInputs: true,
 * });
 */
const init = (
  projectId: string,
  userConfig: Partial<HayaConfig> = {}
): void => {
  if (isInitialized) {
    warn("Haya SDK is already initialized. Call haya.reset() first.");
    return;
  }

  if (!projectId) {
    warn("projectId is required to initialize Haya.");
    return;
  }

  if (userConfig.debug) setDebug(true);

  const state = createState(projectId, userConfig);
  buffer = new EventBuffer(state);

  const push = (event: HayaEvent) => buffer!.push(event);

  // ── Auto-tracking collectors ───────────────────────────────────────────

  if (state.config.autoTrack.clicks || state.config.heatmaps) {
    teardowns.push(initClickTracker(state, push));
  }

  if (state.config.autoTrack.scrolls || state.config.heatmaps) {
    teardowns.push(initScrollTracker(state, push));
  }

  if (state.config.trackMousemove) {
    teardowns.push(initMousemoveTracker(state, push));
  }

  if (state.config.autoTrack.pageviews) {
    teardowns.push(initRouteTracker(state, push));
  }

  teardowns.push(initFormTracker(state, push));

  // ── Session replay ─────────────────────────────────────────────────────

  if (state.config.sessionReplay) {
    teardowns.push(
      initReplayEngine(state, (snapshot) => buffer!.pushSnapshot(snapshot))
    );
  }

  // ── Fire initial pageview ──────────────────────────────────────────────

  if (state.config.autoTrack.pageviews) {
    push({
      type: "pageview",
      pageUrl: getPath(),
      timestamp: Date.now(),
      payload: { url: window.location.href, referrer: document.referrer },
    });
  }

  buffer.start();
  state.initialized = true;
  isInitialized = true;

  log(`Initialized for project ${projectId}`);
};

/**
 * Track a custom event manually.
 *
 * @example
 * haya.track("signup_button_clicked", { plan: "pro" });
 */
const track = (eventName: string, properties: Record<string, unknown> = {}): void => {
  if (!buffer) {
    warn("Call haya.init() before haya.track().");
    return;
  }
  buffer.push({
    type: "custom",
    pageUrl: getPath(),
    timestamp: Date.now(),
    payload: { name: eventName, ...properties },
  });
};

/**
 * Mask a specific CSS selector so its contents are hidden in session replays.
 *
 * @example
 * haya.mask(".credit-card-number");
 */
const mask = (selector: string): void => {
  warn(`haya.mask("${selector}") — call this before haya.init() to take effect.`);
};

/**
 * Prevent tracking on elements matching a CSS selector.
 *
 * @example
 * haya.ignore(".no-track");
 */
const ignore = (selector: string): void => {
  warn(`haya.ignore("${selector}") — call this before haya.init() to take effect.`);
};

/** Enable verbose console logging. */
const setDebugMode = (val: boolean): void => setDebug(val);

/** Flush the event buffer immediately. */
const flush = (): void => {
  if (buffer) buffer.flush();
};

/** Tear down all listeners and flush remaining events. */
const reset = (): void => {
  teardowns.forEach((fn) => fn());
  teardowns = [];
  buffer?.stop();
  buffer = null;
  isInitialized = false;
  log("SDK reset");
};

const haya = { init, track, mask, ignore, setDebug: setDebugMode, flush, reset };

export default haya;
export { init, track, mask, ignore, setDebugMode as setDebug, flush, reset };
export type { HayaConfig };
