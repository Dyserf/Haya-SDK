import { HayaEvent, HayaState } from "../core/types";
import { getPath } from "../utils/dom";

/**
 * Tracks SPA route changes by patching History API and listening to popstate.
 * Works with React Router, Next.js, Vue Router, Angular Router.
 */
export const initRouteTracker = (
  _state: HayaState,
  push: (event: HayaEvent) => void
): (() => void) => {
  let currentPath = getPath();

  const firePageview = (url: string) => {
    if (url === currentPath) return;
    currentPath = url;
    push({
      type: "pageview",
      pageUrl: url,
      timestamp: Date.now(),
      payload: { url, referrer: document.referrer },
    });
  };

  // Patch pushState
  const originalPush = history.pushState.bind(history);
  history.pushState = function (...args) {
    originalPush(...args);
    firePageview(getPath());
  };

  // Patch replaceState
  const originalReplace = history.replaceState.bind(history);
  history.replaceState = function (...args) {
    originalReplace(...args);
    firePageview(getPath());
  };

  // Back / forward buttons
  const onPopState = () => firePageview(getPath());
  window.addEventListener("popstate", onPopState);

  return () => {
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    window.removeEventListener("popstate", onPopState);
  };
};
