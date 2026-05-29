import { record } from "rrweb";
import { HayaState } from "../core/types";
import { log } from "../utils/logger";

type StopFn = () => void;

/**
 * Starts rrweb recording and pipes snapshots into the event buffer.
 * Automatically stops recording once the configured replayMaxDuration is reached.
 *
 * Recording is deferred until document.readyState === "complete" so that
 * external stylesheets (common in React/Vite apps) are fully loaded before
 * rrweb takes the initial FullSnapshot. Without this, sheet.cssRules is empty
 * for unloaded <link> tags and the replay renders with no styles.
 */
export const initReplayEngine = (
  state: HayaState,
  pushSnapshot: (snapshot: unknown) => void
): StopFn => {
  const maxMs = state.config.replayMaxDuration * 1000;
  let stopped = false;
  let stopRecording: (() => void) | undefined;

  const startRecording = () => {
    if (stopped) return;

    const startTime = Date.now();
    log(`Session replay started (cap: ${state.config.replayMaxDuration}s)`);

    stopRecording = record({
      emit(event) {
        if (stopped) return;

        // Enforce the duration cap on the client side.
        // Stop and immediately restart so the next 40-second chunk begins.
        // The new FullSnapshot triggers the backend to reset the session
        // and store a fresh replay — the same session ID is reused.
        if (Date.now() - startTime >= maxMs) {
          log("Replay cap reached — restarting for next chunk");
          stopRecording?.();
          setTimeout(startRecording, 0);
          return;
        }

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

      // Sample mousemove for replay separately from heatmap tracking
      sampling: {
        mousemove: 50,
        mouseInteraction: true,
        scroll: 150,
        input: "last",
      },

      checkoutEveryNth: 200,
    });
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
    stopped = true;
    stopRecording?.();
    log("Session replay stopped");
  };
};
