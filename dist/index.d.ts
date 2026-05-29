interface HayaConfig {
    sessionReplay: boolean;
    heatmaps: boolean;
    autoTrack: {
        clicks: boolean;
        scrolls: boolean;
        pageviews: boolean;
    };
    trackMousemove: boolean;
    maskInputs: boolean;
    ignoreSelectors: string[];
    endpoint: string;
    flushInterval: number;
    flushSize: number;
    debug: boolean;
    replayMaxDuration: number;
}

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
declare const init: (projectId: string, userConfig?: Partial<HayaConfig>) => void;
/**
 * Track a custom event manually.
 *
 * @example
 * haya.track("signup_button_clicked", { plan: "pro" });
 */
declare const track: (eventName: string, properties?: Record<string, unknown>) => void;
/**
 * Mask a specific CSS selector so its contents are hidden in session replays.
 *
 * @example
 * haya.mask(".credit-card-number");
 */
declare const mask: (selector: string) => void;
/**
 * Prevent tracking on elements matching a CSS selector.
 *
 * @example
 * haya.ignore(".no-track");
 */
declare const ignore: (selector: string) => void;
/** Enable verbose console logging. */
declare const setDebugMode: (val: boolean) => void;
/** Flush the event buffer immediately. */
declare const flush: () => void;
/** Tear down all listeners and flush remaining events. */
declare const reset: () => void;
declare const haya: {
    init: (projectId: string, userConfig?: Partial<HayaConfig>) => void;
    track: (eventName: string, properties?: Record<string, unknown>) => void;
    mask: (selector: string) => void;
    ignore: (selector: string) => void;
    setDebug: (val: boolean) => void;
    flush: () => void;
    reset: () => void;
};

export { haya as default, flush, ignore, init, mask, reset, setDebugMode as setDebug, track };
export type { HayaConfig };
