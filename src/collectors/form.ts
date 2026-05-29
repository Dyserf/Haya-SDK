import { HayaEvent, HayaState } from "../core/types";
import { getSelector, isSensitiveElement, getPath } from "../utils/dom";

export const initFormTracker = (
  state: HayaState,
  push: (event: HayaEvent) => void
): (() => void) => {
  const onFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!isFormField(target)) return;
    if (state.config.ignoreSelectors.some((s) => target.closest(s))) return;

    push({
      type: "form_interaction",
      pageUrl: getPath(),
      timestamp: Date.now(),
      payload: {
        action: "focus",
        target: getSelector(target),
        fieldType: (target as HTMLInputElement).type ?? "unknown",
        masked: isSensitiveElement(target),
      },
    });
  };

  const onBlur = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!isFormField(target)) return;
    if (state.config.ignoreSelectors.some((s) => target.closest(s))) return;

    const value = isSensitiveElement(target)
      ? "[masked]"
      : (target as HTMLInputElement).value?.length
        ? `[${(target as HTMLInputElement).value.length} chars]`
        : "[empty]";

    push({
      type: "form_interaction",
      pageUrl: getPath(),
      timestamp: Date.now(),
      payload: {
        action: "blur",
        target: getSelector(target),
        fieldType: (target as HTMLInputElement).type ?? "unknown",
        value,
        masked: isSensitiveElement(target),
      },
    });
  };

  const onSubmit = (e: Event) => {
    const form = e.target as HTMLFormElement;
    push({
      type: "form_interaction",
      pageUrl: getPath(),
      timestamp: Date.now(),
      payload: {
        action: "submit",
        target: getSelector(form),
        formId: form.id || null,
      },
    });
  };

  document.addEventListener("focusin", onFocus, { passive: true });
  document.addEventListener("focusout", onBlur, { passive: true });
  document.addEventListener("submit", onSubmit, { passive: true });

  return () => {
    document.removeEventListener("focusin", onFocus);
    document.removeEventListener("focusout", onBlur);
    document.removeEventListener("submit", onSubmit);
  };
};

const isFormField = (el: HTMLElement): boolean =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement;
