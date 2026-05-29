const SENSITIVE_TYPES = ["password", "email", "tel", "credit-card", "number"];
const SENSITIVE_NAMES = ["card", "cvv", "ssn", "pin", "secret", "token"];

/**
 * Returns true if the element contains sensitive data that should be masked.
 */
export const isSensitiveElement = (el: Element): boolean => {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement))
    return false;

  const type = (el as HTMLInputElement).type?.toLowerCase() ?? "";
  const name = (el.getAttribute("name") ?? "").toLowerCase();
  const autocomplete = (el.getAttribute("autocomplete") ?? "").toLowerCase();

  return (
    SENSITIVE_TYPES.includes(type) ||
    SENSITIVE_NAMES.some((s) => name.includes(s)) ||
    autocomplete.includes("cc-")
  );
};

/**
 * Returns a CSS-selector-like string identifying the element.
 * Used for click target reporting and top-element aggregation.
 */
export const getSelector = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = Array.from(el.classList)
    .slice(0, 3)
    .map((c) => `.${c}`)
    .join("");
  return `${tag}${id}${classes}`;
};

export const getCurrentUrl = (): string => window.location.href;
export const getPath = (): string =>
  window.location.pathname + window.location.search;
