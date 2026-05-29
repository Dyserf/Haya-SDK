export interface HayaConfig {
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
  flushInterval: number;   // ms between batch flushes (default 3000)
  flushSize: number;       // flush when buffer hits this count (default 50)
  debug: boolean;
  replayMaxDuration: number; // seconds, default 40
}

export interface HayaState {
  projectId: string;
  sessionId: string;
  deviceId: string;
  config: HayaConfig;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  initialized: boolean;
}

export type EventType =
  | "click"
  | "scroll"
  | "mousemove"
  | "pageview"
  | "form_interaction"
  | "custom";

export interface HayaEvent {
  type: EventType;
  pageUrl: string;
  timestamp: number;
  payload: Record<string, unknown>;
}
