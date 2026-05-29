import { HayaEvent, HayaState } from "../core/types";
import { log, warn, error } from "../utils/logger";

const OFFLINE_STORAGE_KEY = "haya_offline_queue";
const OFFLINE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

interface OfflineEntry {
  batch: object;
  savedAt: number;
}

interface BatchPayload {
  projectId: string;
  sessionId: string;
  deviceId: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  events: HayaEvent[];
  snapshots?: unknown[];
}

export class EventBuffer {
  private events: HayaEvent[] = [];
  private snapshots: unknown[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: HayaState;
  private retryDelays = [1000, 2000, 4000, 8000, 8000]; // exponential backoff

  constructor(state: HayaState) {
    this.state = state;
  }

  push(event: HayaEvent): void {
    this.events.push(event);
    if (this.events.length >= this.state.config.flushSize) {
      this.flush();
    }
  }

  pushSnapshot(snapshot: unknown): void {
    this.snapshots.push(snapshot);
    // rrweb FullSnapshot (type 2) is the single most critical event — flush it
    // immediately so it isn't lost if the tab closes before the next interval,
    // and so the backend receives it before any incremental events arrive.
    if ((snapshot as any)?.type === 2) {
      this.flush();
    }
  }

  start(): void {
    this.timer = setInterval(
      () => this.flush(),
      this.state.config.flushInterval
    );

    // Flush on page unload
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flush(true);
    });
    window.addEventListener("pagehide", () => this.flush(true));

    // Drain offline queue
    this.drainOfflineQueue();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(true);
  }

  private buildBatch(): BatchPayload | null {
    if (this.events.length === 0 && this.snapshots.length === 0) return null;

    const batch: BatchPayload = {
      projectId: this.state.projectId,
      sessionId: this.state.sessionId,
      deviceId: this.state.deviceId,
      userAgent: this.state.userAgent,
      viewportWidth: this.state.viewportWidth,
      viewportHeight: this.state.viewportHeight,
      events: [...this.events],
    };

    if (this.snapshots.length > 0) {
      batch.snapshots = [...this.snapshots];
    }

    return batch;
  }

  flush(sync = false): void {
    const batch = this.buildBatch();
    if (!batch) return;

    this.events = [];
    this.snapshots = [];

    if (sync && navigator.sendBeacon) {
      // Best-effort on page close — no signature possible (sync)
      const body = JSON.stringify(batch);
      const sent = navigator.sendBeacon(
        this.state.config.endpoint,
        new Blob([body], { type: "application/json" })
      );
      if (!sent) this.saveOffline(batch);
      return;
    }

    this.sendWithRetry(batch, 0);
  }

  private sendWithRetry(batch: BatchPayload, attempt: number): void {
    if (!navigator.onLine) {
      this.saveOffline(batch);
      return;
    }

    const body = JSON.stringify(batch);

    fetch(this.state.config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      // keepalive intentionally omitted — it caps request body at 64 KB which
      // silently kills large FullSnapshot payloads. Page-unload flushes already
      // use sendBeacon (the sync path above), so keepalive isn't needed here.
    })
      .then((res) => {
        if (res.status === 429 || res.status >= 500) {
          // Retry on rate limit or server error
          this.scheduleRetry(batch, attempt);
        } else if (res.status === 413) {
          // Payload too large — retrying with the same payload won't help,
          // but we must not silently treat this as success
          warn(`Batch too large (413) — dropping ${batch.events.length} events and ${batch.snapshots?.length ?? 0} snapshots`);
        } else if (!res.ok) {
          // 400 / 401 / 403 and any other 4xx — discard, retrying won't help
          warn(`Batch rejected with ${res.status} — discarding`);
        } else {
          log(`Batch sent (${batch.events.length} events)`);
        }
      })
      .catch(() => {
        this.scheduleRetry(batch, attempt);
      });
  }

  private scheduleRetry(batch: BatchPayload, attempt: number): void {
    const maxAttempts = this.retryDelays.length;
    if (attempt >= maxAttempts) {
      this.saveOffline(batch);
      return;
    }
    const delay = this.retryDelays[attempt];
    setTimeout(() => this.sendWithRetry(batch, attempt + 1), delay);
  }

  private saveOffline(batch: object): void {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      const queue: OfflineEntry[] = raw ? JSON.parse(raw) : [];
      queue.push({ batch, savedAt: Date.now() });
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(queue));
      log("Batch saved to offline queue");
    } catch {
      error("Failed to save batch to offline queue");
    }
  }

  private drainOfflineQueue(): void {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!raw) return;

      const queue: OfflineEntry[] = JSON.parse(raw);
      const now = Date.now();

      // Drop entries older than 72h
      const fresh = queue.filter((e) => now - e.savedAt < OFFLINE_TTL_MS);
      localStorage.removeItem(OFFLINE_STORAGE_KEY);

      fresh.forEach((entry) =>
        this.sendWithRetry(entry.batch as BatchPayload, 0)
      );
      log(`Drained ${fresh.length} offline batches`);
    } catch {
      // Silent — corrupt storage
    }
  }
}
