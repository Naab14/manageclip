/* haptics.js — haptic feedback on as much movement as possible.
   Uses the native Capacitor Haptics plugin inside the iOS app
   (UIImpactFeedbackGenerator / UISelectionFeedbackGenerator /
   UINotificationFeedbackGenerator) and falls back to the Vibration API
   elsewhere. Everything is a silent no-op when neither is available.

   Load order: after storage.js (reads the persisted on/off setting). */
(function () {
  'use strict';

  const N = window.Native || {};
  let enabled = window.Store ? Store.getSettings().haptics !== false : true;

  const VIB = { LIGHT: 8, MEDIUM: 16, HEAVY: 28 };

  function buzz(pattern) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ } }
  }
  function quiet(p) { if (p && p.catch) p.catch(() => {}); }

  const H = {
    get enabled() { return enabled; },
    setEnabled(v) {
      enabled = v;
      if (window.Store) Store.saveSettings({ haptics: v });
      if (v) H.impact('MEDIUM'); // confirm re-enabling with a buzz
    },

    /* Discrete tap — LIGHT | MEDIUM | HEAVY */
    impact(style) {
      if (!enabled) return;
      style = style || 'LIGHT';
      if (N.Haptics) quiet(N.Haptics.impact({ style }));
      else buzz(VIB[style] || VIB.LIGHT);
    },

    /* Outcome cue — SUCCESS | WARNING | ERROR */
    notify(type) {
      if (!enabled) return;
      type = type || 'SUCCESS';
      if (N.Haptics) quiet(N.Haptics.notification({ type }));
      else buzz(type === 'SUCCESS' ? [12, 40, 18] : type === 'WARNING' ? [20, 50, 20, 50, 20] : [30, 70, 30, 70, 30]);
    },

    /* Fine tick for value changes, scrolling, hovering during drags */
    selection() {
      if (!enabled) return;
      if (N.Haptics) quiet(N.Haptics.selectionChanged());
      else buzz(5);
    },

    /* Drag lifecycle: pick-up buzz, tick per cell crossed, thud on drop */
    dragStart() {
      if (!enabled) return;
      if (N.Haptics) { quiet(N.Haptics.selectionStart()); quiet(N.Haptics.impact({ style: 'MEDIUM' })); }
      else buzz(VIB.MEDIUM);
    },
    dragMove() { H.selection(); },
    dragEnd(dropped) {
      if (!enabled) return;
      if (N.Haptics) {
        quiet(N.Haptics.selectionEnd());
        if (dropped) quiet(N.Haptics.impact({ style: 'HEAVY' }));
      } else if (dropped) buzz(VIB.HEAVY);
    }
  };

  /* ---- ambient wiring: every press, adjustment, and scroll ticks ---- */

  document.addEventListener('pointerdown', e => {
    if (e.target.closest('button, a, select, input, textarea, .task-chip, .link-row, .cal-cell, .seg'))
      H.impact('LIGHT');
  }, { capture: true, passive: true });

  document.addEventListener('change', e => {
    if (e.target.matches('select, input, textarea')) H.selection();
  }, true);

  let lastScrollTick = 0;
  document.addEventListener('scroll', () => {
    const now = Date.now();
    if (now - lastScrollTick > 180) { lastScrollTick = now; H.selection(); }
  }, { capture: true, passive: true });

  window.Haptics = H;
})();
