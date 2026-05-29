import { HayaConfig, HayaState } from "./types";

const DEVICE_ID_KEY = "haya_device_id";


const generateId = (prefix: string): string => {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
};

// Device ID persists forever in localStorage
const getOrCreateDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateId("dev");
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId("dev");
  }
};

// Session ID is generated fresh on every init() call. Each page load = one
// recording = one backend session that can be finalized independently.
// The device ID (localStorage) links all sessions from the same browser.

export const DEFAULT_CONFIG: HayaConfig = {
  sessionReplay: true,
  heatmaps: true,
  autoTrack: { clicks: true, scrolls: true, pageviews: true },
  trackMousemove: false,
  maskInputs: true,
  ignoreSelectors: [],
  endpoint: "https://api.usehaya.io/e",
  flushInterval: 3000,
  flushSize: 50,
  debug: false,
  replayMaxDuration: 40,
};

export const createState = (
  projectId: string,
  userConfig: Partial<HayaConfig>
): HayaState => {
  const config: HayaConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    autoTrack: {
      ...DEFAULT_CONFIG.autoTrack,
      ...(userConfig.autoTrack ?? {}),
    },
  };

  return {
    projectId,
    sessionId: generateId("sess"),
    deviceId: getOrCreateDeviceId(),
    config,
    userAgent: navigator.userAgent,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    initialized: false,
  };
};
