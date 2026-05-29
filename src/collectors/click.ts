import { HayaEvent, HayaState } from "../core/types";
import { getSelector, isSensitiveElement, getPath } from "../utils/dom";

export const initClickTracker = (
  state: HayaState,
  push: (event: HayaEvent) => void
): (() => void) => {
  const handler = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target) return;

    // Skip masked / ignored selectors
    if (
      state.config.ignoreSelectors.some((sel) => target.closest(sel))
    ) return;

    push({
      type: "click",
      pageUrl: getPath(),
      timestamp: Date.now(),
      payload: {
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
        pageX: Math.round(e.pageX),
        pageY: Math.round(e.pageY),
        target: getSelector(target),
        text: isSensitiveElement(target)
          ? "[masked]"
          : (target as HTMLElement).innerText?.slice(0, 100) ?? "",
      },
    });
  };

  document.addEventListener("click", handler, { passive: true });
  return () => document.removeEventListener("click", handler);
};
