/* skins.js — Tapotron-inspired skin system. Each skin swaps the CSS custom
   properties that drive the whole UI; the choice persists in settings.
   Load order: after storage.js and haptics.js. */
(function () {
  'use strict';

  const SKINS = [
    { id: 'neon',   name: 'Neon Rush',      icon: '💚', desc: 'Electric green on black' },
    { id: 'lcd',    name: 'LCD Classic',    icon: '🧮', desc: 'Pocket-calculator segments' },
    { id: 'amber',  name: 'Amber Terminal', icon: '🟠', desc: 'Warm phosphor CRT' },
    { id: 'piano',  name: 'Grand Piano',    icon: '🎹', desc: 'Ivory, ebony and gold' },
    { id: 'vapor',  name: 'Vaporwave',      icon: '🌴', desc: 'Miami dusk neon' },
    { id: 'arcade', name: '8-Bit Arcade',   icon: '🕹️', desc: 'Insert coin to continue' }
  ];

  function apply(id, opts) {
    if (!SKINS.some(s => s.id === id)) id = 'neon';
    document.documentElement.dataset.skin = id;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg').trim() || '#070b09';
    }
    if (!opts || !opts.silent) Store.saveSettings({ skin: id });
  }

  window.Skins = {
    list: SKINS,
    current() { return document.documentElement.dataset.skin || 'neon'; },
    apply
  };

  apply(Store.getSettings().skin || 'neon', { silent: true });

  /* ---- picker UI (markup lives in index.html) ---- */
  const modal = document.getElementById('skin-modal');
  const grid = document.getElementById('skin-grid');
  const toggle = document.getElementById('skin-toggle');
  if (!modal || !grid || !toggle) return;

  function render() {
    grid.innerHTML = '';
    SKINS.forEach(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'skin-swatch' + (window.Skins.current() === s.id ? ' active' : '');
      b.dataset.skin = s.id; // scopes that skin's CSS vars to the preview tile
      b.innerHTML =
        '<span class="swatch-preview"><i></i><i></i><i></i></span>' +
        `<span class="swatch-name">${s.icon} ${s.name}</span>` +
        `<span class="swatch-desc">${s.desc}</span>`;
      b.addEventListener('click', () => {
        window.Haptics.selection();
        apply(s.id);
        render();
        window.Haptics.notify('SUCCESS');
      });
      grid.appendChild(b);
    });
  }

  toggle.addEventListener('click', () => { render(); modal.showModal(); });
  document.getElementById('skin-close').addEventListener('click', () => modal.close());
})();
