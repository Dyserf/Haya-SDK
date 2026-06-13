import { record } from "rrweb";
import { HayaEvent, HayaState } from "../core/types";
import { log } from "../utils/logger";

type StopFn = () => void;

const INACTIVITY_MS = 60 * 1000;  // finalize after 1 min of no interaction
const MIN_RECORD_MS = 90 * 1000;  // discard sessions shorter than 1m 30s

/**
 * Starts rrweb recording and finalizes the session when the user goes idle.
 *
 * Finalization triggers (whichever fires first):
 *   1. No mouse/click/scroll/keyboard activity for 1 minute
 *   2. Hard cap (state.config.replayMaxDuration seconds, default 20 min)
 *   3. Page close / pagehide
 *
 * Sessions shorter than MIN_RECORD_MS are silently dropped — no session_end
 * event is pushed, so the backend discards the chunks.
 *
 * Recording is deferred until document.readyState === "complete" so that
 * external stylesheets (common in React/Vite apps) are fully loaded before
 * rrweb takes the initial FullSnapshot. Without this, sheet.cssRules is empty
 * for unloaded <link> tags and the replay renders with no styles.
 */
export const initReplayEngine = (
  state: HayaState,
  pushSnapshot: (snapshot: unknown) => void,
  pushEvent: (event: HayaEvent) => void,
  flushNow: (sync?: boolean) => void
): StopFn => {
  const hardCapMs = state.config.replayMaxDuration * 1000;

  let stopped = false;
  let stopRecording: (() => void) | undefined;
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  let hardCapTimer: ReturnType<typeof setTimeout> | null = null;
  let recordingStart = 0;

  const clearTimers = () => {
    if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
    if (hardCapTimer)    { clearTimeout(hardCapTimer);    hardCapTimer    = null; }
  };

  const finalize = (reason: string, sync = false) => {
    if (stopped) return;
    stopped = true;
    clearTimers();
    stopRecording?.();

    const elapsed = Date.now() - recordingStart;

    if (elapsed >= MIN_RECORD_MS) {
      log(`Session replay ending (${reason}) — ${Math.round(elapsed / 1000)}s recorded`);
      pushEvent({
        type: "custom",
        pageUrl: window.location.pathname,
        timestamp: Date.now(),
        payload: { action: "session_end", reason },
      });
      flushNow(sync);
    } else {
      log(`Session replay dropped (${reason}) — too short (${Math.round(elapsed / 1000)}s < 90s)`);
    }
  };

  const resetInactivityTimer = () => {
    if (stopped) return;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => finalize("inactivity"), INACTIVITY_MS);
  };

  const onUserActivity  = () => resetInactivityTimer();
  const onTabVisible    = () => resetInactivityTimer();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") onTabVisible();
    // hidden: let the inactivity timer run — if user doesn't return within
    // 1 min the timer fires naturally and finalizes the session
  };

  const ACTIVITY_EVENTS = ["mousemove", "mousedown", "click", "scroll", "keydown", "touchstart"] as const;

  const startRecording = () => {
    if (stopped) return;

    recordingStart = Date.now();
    log("Session replay started (inactivity-based, 20m max)");

    stopRecording = record({
      emit(event) {
        if (stopped) return;
        pushSnapshot(event);
      },

      // Inline stylesheet content so replays don't need the original server.
      // inlineImages is intentionally OFF — images inflate the FullSnapshot
      // past the backend body limit (10 MB) causing silent 413 drops.
      inlineStylesheet: true,
      collectFonts: true,

      // maskAllInputs covers type="text" and other generic inputs that
      // maskInputOptions alone misses. maskInputOptions fine-tunes per-type
      // (number fields left visible so quantity inputs aren't obscured).
      maskAllInputs: state.config.maskInputs,
      maskInputOptions: state.config.maskInputs
        ? { password: true, email: true, tel: true, text: true, number: false }
        : {},

      // Block elements matching ignore selectors from appearing in replay
      blockSelector: state.config.ignoreSelectors.join(", ") || undefined,

      // Reduce high-frequency events to cut file size.
      // Mousemoves are also stripped server-side before Cloudinary upload.
      sampling: {
        mousemove: 200,
        mouseInteraction: true,
        scroll: 300,
        input: "last",
      },

      // Strip non-essential DOM from the FullSnapshot — cuts initial snapshot size
      slimDOMOptions: {
        comment: true,
        headFavicon: true,
        headWhitespace: true,
        headMetaSocial: true,
        headMetaRobots: true,
        headMetaHttpEquiv: true,
        headMetaVerification: true,
      },

      checkoutEveryNth: 200,
    });

    // Hard cap — absolute maximum recording length
    hardCapTimer = setTimeout(() => finalize("hard_cap"), hardCapMs);

    // User activity listeners — each resets the inactivity countdown
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onUserActivity, { passive: true })
    );

    // Tab visibility — returning to the tab resets the countdown
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Page close — finalize immediately with sendBeacon
    window.addEventListener("pagehide", () => finalize("page_close", true), { once: true });

    // Start the initial inactivity countdown
    resetInactivityTimer();
  };

  // Wait for all external resources (CSS, fonts) to finish loading before
  // taking the initial FullSnapshot. React/Vite apps load CSS as <link> files;
  // if we snapshot before they parse, cssRules is empty and styles are lost.
  if (document.readyState === "complete") {
    startRecording();
  } else {
    window.addEventListener("load", startRecording, { once: true });
  }

  return () => {
    ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onUserActivity));
    document.removeEventListener("visibilitychange", onVisibilityChange);
    finalize("sdk_reset");
  };
};
