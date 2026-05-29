let _debug = false;

export const setDebug = (val: boolean): void => {
  _debug = val;
};

export const log = (...args: unknown[]): void => {
  if (_debug) console.log("[Haya]", ...args);
};

export const warn = (...args: unknown[]): void => {
  if (_debug) console.warn("[Haya]", ...args);
};

export const error = (...args: unknown[]): void => {
  // Always log errors in debug mode; suppress in production
  if (_debug) console.error("[Haya]", ...args);
};
