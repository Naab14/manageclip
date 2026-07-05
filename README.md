# manageclip — Shift Management Dashboard

A local-first internal tool for shift managers to track Leadership Standard Work (LSW):
scheduling, activity logging, quick-access links, and weekly reporting — all in the browser,
no server or build step required.

## Running

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8000
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

## Tech notes

- Vanilla HTML/CSS/JS — no dependencies, no build.
- `js/storage.js` — localStorage persistence for the Tasks / Logs / Links data models.
- `js/pdf.js` — MiniPDF, a tiny dependency-free client-side PDF writer used for the weekly
  report export (works offline; no CDN).
- `js/app.js` — views, calendar, drag-and-drop, and review aggregation.
- `css/styles.css` — the **Neon Rush** theme: dark background, `#00FFB4` electric-green
  accent, monospace type. Responsive down to tablet widths.
