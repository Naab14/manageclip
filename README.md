# manageclip — Shift Management Dashboard

A local-first internal tool for shift managers to track Leadership Standard Work (LSW):
scheduling, activity logging, quick-access links, and weekly reporting — all in the browser,
no server or build step required.

## Running (web)

Open `www/index.html` directly in a browser, or serve the folder:

```sh
npm run serve          # python3 -m http.server 8000 -d www
# → http://localhost:8000
```

All data is persisted in `localStorage`, so the app works fully offline. A small set of
sample tasks, links, and log entries is seeded on first run (only once — clear them freely).

## Screens

- **Shift Command Center** — monthly/weekly calendar grid with drag-and-drop rescheduling
  and color-coded status (overdue / in progress / completed). Click a day's `+` to add a
  task, click a chip to edit, or hit its `✓` to toggle completion.
- **Activity Logger** — quick date/category/text form for shift events with instant feedback.
- **Link Configuration Hub** — add/edit external links, choose a display style per link
  (Thumbnail, Symbol, or Text Label), and reorder by dragging rows or using ▲▼.
- **Quick Action Clipboard** — sidebar rendering the configured links (opens in new tabs).
- **Weekly Review Dashboard** — completed-vs-target stats, category breakdown, week's shift
  log, and one-click **Export to PDF**.

## Running (iOS)

The `ios/` directory is a Capacitor iOS app wrapping the same `www/` code. On a Mac with
Xcode installed:

```sh
npm install
npx cap sync ios       # copies www/ into the iOS project and wires the plugins
npx cap open ios       # opens Xcode — pick a simulator or device and Run
```

The iOS build adds **haptic feedback on as much movement as possible**, driven by the
native Taptic Engine (`@capacitor/haptics`):

- light impact on every tap of a button, link, chip, field, or calendar cell
- selection ticks while scrolling and when any input value changes
- drag-and-drop: a medium "pick-up" buzz, a tick for **every calendar cell crossed**
  while dragging, and a heavy thud on drop (same for link-row reordering)
- success notifications on saves/completions/exports, warning buzzes on deletes
- long-press touch drag for task chips (HTML5 drag events don't fire from touch on iOS) —
  a ghost chip follows your finger with haptic ticks along the way
- a 📳 toggle in the header turns haptics on/off (persisted)

On the plain web the same code falls back to the Vibration API where available (e.g.
Android Chrome) and is silent elsewhere. PDF export inside the iOS app writes the file
natively and opens the share sheet.

## Tech notes

- Vanilla HTML/CSS/JS in `www/` — no build step; Capacitor only wraps it for iOS.
- `www/js/storage.js` — localStorage persistence for the Tasks / Logs / Links data models.
- `www/js/pdf.js` — MiniPDF, a tiny dependency-free client-side PDF writer used for the
  weekly report export (works offline; no CDN).
- `www/js/native.js` / `www/js/haptics.js` — Capacitor plugin bridge and the haptics engine.
- `www/js/app.js` — views, calendar, drag-and-drop (mouse + touch), and review aggregation.
- `www/css/styles.css` — the **Neon Rush** theme: dark background, `#00FFB4` electric-green
  accent, monospace type. Responsive down to tablet/phone widths, iOS safe-area aware.
