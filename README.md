# @tryhaya/analytics

**Heatmaps, Session Replay, and Event Tracking for your website.**

Haya is a lightweight analytics SDK that records what users actually do — clicks, scrolls, navigations, and full DOM replays — without sending any video. It works with any JavaScript framework and adds under 5 KB to your bundle after compression.

---

## Installation

```bash
npm install @tryhaya/analytics
# or
yarn add @tryhaya/analytics
# or
pnpm add @tryhaya/analytics
```

---

## Quick Start

```js
import haya from '@tryhaya/analytics';

haya.init('YOUR_SDK_KEY', {
  sessionReplay: true,
  heatmaps: true,
  autoTrack: { clicks: true, scrolls: true, pageviews: true },
  maskInputs: true,
});
```

Get your SDK key from the [Haya dashboard](https://usehaya.io).

---

## Framework Setup

### React

```jsx
// src/main.jsx
import haya from '@tryhaya/analytics';

haya.init('YOUR_SDK_KEY', { sessionReplay: true, maskInputs: true });

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

### Next.js (App Router)

```tsx
// components/HayaProvider.tsx
'use client';
import { useEffect } from 'react';
import haya from '@tryhaya/analytics';

export function HayaProvider() {
  useEffect(() => {
    haya.init(process.env.NEXT_PUBLIC_HAYA_SDK_KEY!, {
      sessionReplay: true,
      maskInputs: true,
    });
  }, []);
  return null;
}
```

Add `<HayaProvider />` to your root `layout.tsx`. Also add to `next.config.ts`:

```ts
const nextConfig = {
  transpilePackages: ['@tryhaya/analytics'],
};
```

### Vue 3

```ts
// src/main.ts
import haya from '@tryhaya/analytics';

haya.init(import.meta.env.VITE_HAYA_SDK_KEY, {
  sessionReplay: true,
  maskInputs: true,
});

createApp(App).use(router).mount('#app');
```

### Plain HTML (CDN)

```html
<script src="https://cdn.usehaya.io/haya.min.js"></script>
<script>
  haya.init('YOUR_SDK_KEY', { sessionReplay: true, maskInputs: true });
</script>
```

---

## Configuration

```js
haya.init('YOUR_SDK_KEY', {
  // Features
  sessionReplay: true,        // Record DOM replay in 40s chunks
  heatmaps: true,             // Collect click + scroll heatmap data

  // Auto-tracking
  autoTrack: {
    clicks: true,             // Track every click
    scrolls: true,            // Track scroll depth
    pageviews: true,          // Track page loads + SPA navigation
  },
  trackMousemove: false,      // Mouse position tracking (high volume)

  // Privacy
  maskInputs: true,           // Mask all input values in replays
  ignoreSelectors: [],        // CSS selectors to exclude from tracking

  // Transport
  endpoint: 'https://api.usehaya.io/e',  // Override for self-hosted backends
  flushInterval: 3000,        // ms between batch sends
  flushSize: 50,              // Flush early at this event count

  // Replay
  replayMaxDuration: 40,      // Seconds per replay chunk

  // Debug
  debug: false,               // Log SDK activity to console
});
```

---

## Tracking Custom Events

```js
haya.track('signup_completed', {
  plan: 'pro',
  source: 'pricing_page',
});
```

---

## Session Replay

Haya records DOM snapshots using [rrweb](https://github.com/rrweb-io/rrweb). Recording works in continuous 40-second chunks — each chunk is uploaded to storage and a new recording starts automatically.

**Privacy defaults:**
- `maskInputs: true` masks all `<input>`, `<textarea>`, and `<select>` values (including `type="text"`) as `***` in replays
- Add `class="haya-block"` to any element to block it from appearing in replays entirely

```js
haya.init('YOUR_SDK_KEY', {
  sessionReplay: true,
  maskInputs: true,
  ignoreSelectors: ['.sensitive-widget', '#credit-card-form'],
});
```

---

## API Reference

| Method | Description |
|---|---|
| `haya.init(key, config)` | Initialize the SDK |
| `haya.track(name, props)` | Track a custom event |
| `haya.flush()` | Flush the event buffer immediately |
| `haya.reset()` | Tear down all listeners and flush remaining events |
| `haya.setDebug(true)` | Toggle verbose console logging at runtime |

---

## Offline Support

Batches that fail to send are saved to `localStorage` with a 72-hour TTL. When the user comes back online, the queue drains automatically with exponential backoff retry (up to 5 attempts).

---

## How It Works

```
User action → SDK collector → Event buffer (3s flush interval)
                                      ↓
                              POST /e (HMAC signed)
                                      ↓
                           Haya Backend → MongoDB
                                      ↓
                      BullMQ worker → Cloudinary (replay storage)
```

- **Events** (clicks, scrolls, pageviews) are batched and sent every 3 seconds
- **Replay snapshots** are flushed immediately when a FullSnapshot is captured
- **Session finalization** runs in a background worker — the ingest endpoint never blocks on Cloudinary uploads

---

## TypeScript

Full TypeScript types are included. No separate `@types` package needed:

```ts
import haya, { HayaConfig } from '@tryhaya/analytics';

const config: Partial<HayaConfig> = {
  sessionReplay: true,
  replayMaxDuration: 60,
};

haya.init('YOUR_SDK_KEY', config);
```

---

## License

MIT © [Haya](https://usehaya.io)
