/* storage.js — localStorage-backed persistence for tasks, logs, links, settings. */
(function () {
  'use strict';

  const KEYS = {
    tasks: 'smd.tasks',
    logs: 'smd.logs',
    links: 'smd.links',
    settings: 'smd.settings',
    seeded: 'smd.seeded'
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const Store = {
    /* ---- tasks: {id, title, description, due_date, status, category} ---- */
    getTasks() { return read(KEYS.tasks, []); },
    getTask(id) { return this.getTasks().find(t => t.id === id) || null; },
    saveTask(task) {
      const tasks = this.getTasks();
      if (!task.id) {
        task.id = uid();
        tasks.push(task);
      } else {
        const i = tasks.findIndex(t => t.id === task.id);
        if (i >= 0) tasks[i] = task; else tasks.push(task);
      }
      write(KEYS.tasks, tasks);
      return task;
    },
    deleteTask(id) {
      write(KEYS.tasks, this.getTasks().filter(t => t.id !== id));
    },

    /* ---- logs: {id, entry_date, content, category} ---- */
    getLogs() { return read(KEYS.logs, []); },
    addLog(log) {
      log.id = uid();
      const logs = this.getLogs();
      logs.unshift(log);
      write(KEYS.logs, logs);
      return log;
    },
    deleteLog(id) {
      write(KEYS.logs, this.getLogs().filter(l => l.id !== id));
    },

    /* ---- links: {id, url, display_mode, display_name, icon_reference} ---- */
    getLinks() { return read(KEYS.links, []); },
    saveLink(link) {
      const links = this.getLinks();
      if (!link.id) {
        link.id = uid();
        links.push(link);
      } else {
        const i = links.findIndex(l => l.id === link.id);
        if (i >= 0) links[i] = link; else links.push(link);
      }
      write(KEYS.links, links);
      return link;
    },
    deleteLink(id) {
      write(KEYS.links, this.getLinks().filter(l => l.id !== id));
    },
    moveLink(id, dir) {
      const links = this.getLinks();
      const i = links.findIndex(l => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= links.length) return;
      [links[i], links[j]] = [links[j], links[i]];
      write(KEYS.links, links);
    },
    reorderLink(id, beforeId) {
      const links = this.getLinks();
      const i = links.findIndex(l => l.id === id);
      if (i < 0) return;
      const [moved] = links.splice(i, 1);
      const j = beforeId ? links.findIndex(l => l.id === beforeId) : -1;
      if (j < 0) links.push(moved); else links.splice(j, 0, moved);
      write(KEYS.links, links);
    },

    /* ---- settings ---- */
    getSettings() { return read(KEYS.settings, { weeklyTarget: 20 }); },
    saveSettings(patch) {
      write(KEYS.settings, Object.assign(this.getSettings(), patch));
    },

    /* ---- first-run demo data ---- */
    seedIfEmpty(todayStr, addDays) {
      if (read(KEYS.seeded, false)) return;
      write(KEYS.seeded, true);
      if (this.getTasks().length || this.getLinks().length || this.getLogs().length) return;

      const t = (offset, title, category, status) => this.saveTask({
        id: '', title, description: '', category, status,
        due_date: addDays(todayStr, offset)
      });
      t(-2, 'Safety cross review', 'Safety Audit', 'finished');
      t(-1, 'Gemba walk – Line 1', 'Gemba Walk', 'current');
      t(0, 'Shift handover meeting', 'Meeting', 'current');
      t(0, 'Coach team lead on 5S', 'Coaching', 'current');
      t(1, 'Gemba walk – Line 2', 'Gemba Walk', 'current');
      t(2, 'Weekly KPI report', 'Reporting', 'current');

      const l = (url, name, icon, mode) => this.saveLink({
        id: '', url, display_name: name, icon_reference: icon, display_mode: mode
      });
      l('https://example.com/andon', 'Andon Board', '🚨', 'thumbnail');
      l('https://example.com/kpi', 'KPI Tracker', '📈', 'symbol');
      l('https://example.com/handbook', 'Shift Handbook', '📘', 'name');

      this.addLog({ entry_date: todayStr, category: 'Safety', content: 'Near-miss reported at packing station; area taped off and ticket raised.' });
      this.addLog({ entry_date: todayStr, category: 'Delivery', content: 'Line 2 output back on plan after morning changeover delay.' });
    }
  };

  window.Store = Store;
})();
