/* native.js — bridge to Capacitor native plugins when running inside the iOS app.
   On the plain web, window.Capacitor is absent and everything degrades gracefully. */
(function () {
  'use strict';

  const C = window.Capacitor;
  const isNative = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());

  function plugin(name) {
    if (!isNative || typeof C.registerPlugin !== 'function') return null;
    try { return C.registerPlugin(name); } catch (e) { return null; }
  }

  window.Native = {
    isNative,
    Haptics: plugin('Haptics'),
    Filesystem: plugin('Filesystem'),
    Share: plugin('Share')
  };
})();
