/* app.js — views, calendar drag-and-drop, link hub, logger, weekly review. */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* ================= date helpers (all local time, YYYY-MM-DD strings) ================= */

  function fmtDate(d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  function parseDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function addDaysStr(s, n) {
    const d = parseDate(s);
    d.setDate(d.getDate() + n);
    return fmtDate(d);
  }
  function todayStr() { return fmtDate(new Date()); }
  function startOfWeek(d) { // Monday
    const out = new Date(d);
    out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
    out.setHours(0, 0, 0, 0);
    return out;
  }
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function niceDate(s) {
    const d = parseDate(s);
    return `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  }

  /* ================= state ================= */

  const state = {
    calMode: 'month',
    calAnchor: new Date(),
    reviewAnchor: new Date()
  };

  /* Effective status: 'finished' sticks; anything unfinished past due is overdue. */
  function effStatus(task) {
    if (task.status === 'finished') return 'finished';
    return task.due_date < todayStr() ? 'overdue' : 'current';
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ================= navigation ================= */

  function showView(name) {
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
    if (name === 'center') renderCalendar();
    if (name === 'logger') renderLogs();
    if (name === 'links') renderLinkConfig();
    if (name === 'review') renderReview();
  }

  /* ================= Shift Command Center (calendar) ================= */

  function calTitle() {
    if (state.calMode === 'month') {
      return `${MONTHS[state.calAnchor.getMonth()]} ${state.calAnchor.getFullYear()}`;
    }
    const start = startOfWeek(state.calAnchor);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return `${niceDate(fmtDate(start))} – ${niceDate(fmtDate(end))} ${end.getFullYear()}`;
  }

  function tasksByDate() {
    const map = {};
    Store.getTasks().forEach(t => {
      (map[t.due_date] = map[t.due_date] || []).push(t);
    });
    Object.values(map).forEach(list =>
      list.sort((a, b) => a.title.localeCompare(b.title)));
    return map;
  }

  function taskChip(task) {
    const st = effStatus(task);
    const chip = document.createElement('div');
    chip.className = `task-chip st-${st}`;
    chip.draggable = true;
    chip.dataset.id = task.id;
    chip.title = `${task.title}${task.description ? ' — ' + task.description : ''} [${task.category}]`;
    chip.innerHTML = `<i class="dot st-${st}"></i><span class="chip-title">${escapeHtml(task.title)}</span>` +
      `<button class="chip-done" title="${st === 'finished' ? 'Reopen' : 'Mark completed'}">✓</button>`;
    chip.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
      chip.classList.add('dragging');
    });
    chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    chip.addEventListener('click', e => {
      if (e.target.classList.contains('chip-done')) {
        task.status = task.status === 'finished' ? 'current' : 'finished';
        Store.saveTask(task);
        renderCalendar();
        toast(task.status === 'finished' ? 'Task completed ✔' : 'Task reopened');
      } else {
        openTaskModal(task);
      }
    });
    return chip;
  }

  function dayCell(dateStr, opts) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (opts.otherMonth) cell.classList.add('other-month');
    if (dateStr === todayStr()) cell.classList.add('today');
    cell.dataset.date = dateStr;

    const head = document.createElement('div');
    head.className = 'cell-head';
    head.innerHTML = `<span class="cell-date">${parseDate(dateStr).getDate()}</span>` +
      `<button class="cell-add" title="Add task on ${dateStr}">+</button>`;
    head.querySelector('.cell-add').addEventListener('click', () =>
      openTaskModal({ due_date: dateStr }));
    cell.appendChild(head);

    const body = document.createElement('div');
    body.className = 'cell-body';
    (opts.tasks || []).forEach(t => body.appendChild(taskChip(t)));
    cell.appendChild(body);

    cell.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      cell.classList.add('drop-target');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-target'));
    cell.addEventListener('drop', e => {
      e.preventDefault();
      cell.classList.remove('drop-target');
      const id = e.dataTransfer.getData('text/plain');
      const task = Store.getTask(id);
      if (task && task.due_date !== dateStr) {
        task.due_date = dateStr;
        Store.saveTask(task);
        renderCalendar();
        toast(`Rescheduled to ${niceDate(dateStr)}`);
      }
    });
    return cell;
  }

  function renderCalendar() {
    $('#cal-label').textContent = calTitle();
    const grid = $('#calendar-grid');
    grid.innerHTML = '';
    grid.classList.toggle('week-mode', state.calMode === 'week');

    DOW.forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-dow';
      h.textContent = d;
      grid.appendChild(h);
    });

    const byDate = tasksByDate();

    if (state.calMode === 'month') {
      const y = state.calAnchor.getFullYear();
      const m = state.calAnchor.getMonth();
      const first = startOfWeek(new Date(y, m, 1));
      for (let i = 0; i < 42; i++) {
        const d = new Date(first);
        d.setDate(d.getDate() + i);
        if (i === 35 && d.getMonth() !== m) break; // skip an all-overflow last row
        const ds = fmtDate(d);
        grid.appendChild(dayCell(ds, { otherMonth: d.getMonth() !== m, tasks: byDate[ds] }));
      }
    } else {
      const start = startOfWeek(state.calAnchor);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const ds = fmtDate(d);
        grid.appendChild(dayCell(ds, { tasks: byDate[ds] }));
      }
    }
  }

  function shiftCalendar(dir) {
    const a = state.calAnchor;
    if (state.calMode === 'month') {
      state.calAnchor = new Date(a.getFullYear(), a.getMonth() + dir, 1);
    } else {
      const d = new Date(a);
      d.setDate(d.getDate() + dir * 7);
      state.calAnchor = d;
    }
    renderCalendar();
  }

  /* ---- task modal ---- */

  const taskModal = $('#task-modal');
  const taskForm = $('#task-form');

  function openTaskModal(task) {
    const isNew = !task.id;
    $('#task-modal-title').textContent = isNew ? 'New Task' : 'Edit Task';
    $('#task-delete').hidden = isNew;
    taskForm.elements.id.value = task.id || '';
    taskForm.elements.title.value = task.title || '';
    taskForm.elements.description.value = task.description || '';
    taskForm.elements.due_date.value = task.due_date || todayStr();
    taskForm.elements.category.value = task.category || 'Gemba Walk';
    taskForm.elements.status.value = task.status === 'finished' ? 'finished' : 'current';
    taskModal.showModal();
  }

  taskForm.addEventListener('submit', () => {
    const f = taskForm.elements;
    Store.saveTask({
      id: f.id.value,
      title: f.title.value.trim(),
      description: f.description.value.trim(),
      due_date: f.due_date.value,
      status: f.status.value,
      category: f.category.value
    });
    renderCalendar();
    toast('Task saved');
  });
  $('#task-cancel').addEventListener('click', () => taskModal.close());
  $('#task-delete').addEventListener('click', () => {
    const id = taskForm.elements.id.value;
    if (id && confirm('Delete this task?')) {
      Store.deleteTask(id);
      taskModal.close();
      renderCalendar();
      toast('Task deleted');
    }
  });

  /* ================= Activity Logger ================= */

  function renderLogs() {
    const list = $('#log-list');
    const logs = Store.getLogs().slice(0, 30);
    list.innerHTML = logs.length ? '' : '<p class="empty">No entries yet — log your first shift event above.</p>';
    logs.forEach(log => {
      const row = document.createElement('div');
      row.className = 'log-row';
      row.innerHTML =
        `<span class="log-date">${escapeHtml(log.entry_date)}</span>` +
        `<span class="log-cat cat-${escapeHtml(log.category)}">${escapeHtml(log.category)}</span>` +
        `<span class="log-content">${escapeHtml(log.content)}</span>` +
        `<button class="mini-btn log-del" title="Delete entry">✕</button>`;
      row.querySelector('.log-del').addEventListener('click', () => {
        Store.deleteLog(log.id);
        renderLogs();
        toast('Entry deleted');
      });
      list.appendChild(row);
    });
  }

  $('#log-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.elements;
    Store.addLog({
      entry_date: f.entry_date.value,
      category: f.category.value,
      content: f.content.value.trim()
    });
    f.content.value = '';
    const fb = $('#log-feedback');
    fb.textContent = '✔ Entry logged';
    fb.classList.add('show');
    setTimeout(() => fb.classList.remove('show'), 2000);
    renderLogs();
  });

  /* ================= Link Configuration Hub ================= */

  const linkForm = $('#link-form');

  function resetLinkForm() {
    linkForm.reset();
    linkForm.elements.id.value = '';
    $('#link-save').textContent = 'Add Link';
    $('#link-cancel').hidden = true;
  }

  linkForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = linkForm.elements;
    Store.saveLink({
      id: f.id.value,
      url: f.url.value.trim(),
      display_name: f.display_name.value.trim(),
      icon_reference: f.icon_reference.value.trim(),
      display_mode: f.display_mode.value
    });
    resetLinkForm();
    renderLinkConfig();
    renderClipboard();
    toast('Link saved');
  });
  $('#link-cancel').addEventListener('click', resetLinkForm);

  const MODE_LABELS = { thumbnail: 'Thumbnail', symbol: 'Symbol', name: 'Text Label' };
  let dragLinkId = null;

  function renderLinkConfig() {
    const list = $('#link-config-list');
    const links = Store.getLinks();
    list.innerHTML = links.length ? '' : '<p class="empty">No links yet — add your first shortcut above.</p>';
    links.forEach((link, idx) => {
      const row = document.createElement('div');
      row.className = 'link-row';
      row.draggable = true;
      row.dataset.id = link.id;
      row.innerHTML =
        `<span class="drag-handle" title="Drag to reorder">⋮⋮</span>` +
        `<span class="link-icon">${escapeHtml(link.icon_reference || link.display_name.charAt(0).toUpperCase())}</span>` +
        `<span class="link-name">${escapeHtml(link.display_name)}</span>` +
        `<span class="link-url">${escapeHtml(link.url)}</span>` +
        `<span class="link-mode">${MODE_LABELS[link.display_mode] || link.display_mode}</span>` +
        `<span class="link-actions">` +
        `<button class="mini-btn lk-up" title="Move up" ${idx === 0 ? 'disabled' : ''}>▲</button>` +
        `<button class="mini-btn lk-down" title="Move down" ${idx === links.length - 1 ? 'disabled' : ''}>▼</button>` +
        `<button class="mini-btn lk-edit" title="Edit">✎</button>` +
        `<button class="mini-btn lk-del" title="Delete">✕</button>` +
        `</span>`;

      row.querySelector('.lk-up').addEventListener('click', () => {
        Store.moveLink(link.id, -1); renderLinkConfig(); renderClipboard();
      });
      row.querySelector('.lk-down').addEventListener('click', () => {
        Store.moveLink(link.id, 1); renderLinkConfig(); renderClipboard();
      });
      row.querySelector('.lk-edit').addEventListener('click', () => {
        const f = linkForm.elements;
        f.id.value = link.id;
        f.url.value = link.url;
        f.display_name.value = link.display_name;
        f.icon_reference.value = link.icon_reference || '';
        f.display_mode.value = link.display_mode;
        $('#link-save').textContent = 'Update Link';
        $('#link-cancel').hidden = false;
        f.url.focus();
      });
      row.querySelector('.lk-del').addEventListener('click', () => {
        if (confirm(`Delete link "${link.display_name}"?`)) {
          Store.deleteLink(link.id);
          renderLinkConfig();
          renderClipboard();
          toast('Link deleted');
        }
      });

      row.addEventListener('dragstart', e => {
        dragLinkId = link.id;
        e.dataTransfer.effectAllowed = 'move';
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => { dragLinkId = null; row.classList.remove('dragging'); });
      row.addEventListener('dragover', e => {
        if (!dragLinkId || dragLinkId === link.id) return;
        e.preventDefault();
        row.classList.add('drop-target');
      });
      row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.classList.remove('drop-target');
        if (dragLinkId && dragLinkId !== link.id) {
          Store.reorderLink(dragLinkId, link.id);
          renderLinkConfig();
          renderClipboard();
        }
      });

      list.appendChild(row);
    });
  }

  /* ================= Quick Action Clipboard ================= */

  function renderClipboard() {
    const list = $('#clipboard-list');
    const links = Store.getLinks();
    $('#clipboard-empty').hidden = links.length > 0;
    list.innerHTML = '';
    links.forEach(link => {
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const icon = escapeHtml(link.icon_reference || link.display_name.charAt(0).toUpperCase());
      const name = escapeHtml(link.display_name);
      if (link.display_mode === 'thumbnail') {
        a.className = 'clip-link clip-thumb';
        a.innerHTML = `<span class="thumb-tile">${icon}</span><span class="thumb-name">${name}</span>`;
      } else if (link.display_mode === 'symbol') {
        a.className = 'clip-link clip-symbol';
        a.title = link.display_name;
        a.innerHTML = `<span class="symbol-tile">${icon}</span>`;
      } else {
        a.className = 'clip-link clip-name';
        a.innerHTML = `<span class="name-arrow">›</span>${name}`;
      }
      list.appendChild(a);
    });
  }

  /* ================= Weekly Review Dashboard ================= */

  function reviewRange() {
    const start = startOfWeek(state.reviewAnchor);
    const startStr = fmtDate(start);
    return { startStr, endStr: addDaysStr(startStr, 6) };
  }

  function reviewData() {
    const { startStr, endStr } = reviewRange();
    const inWeek = s => s >= startStr && s <= endStr;
    const tasks = Store.getTasks().filter(t => inWeek(t.due_date));
    const completed = tasks.filter(t => t.status === 'finished');
    const overdue = tasks.filter(t => effStatus(t) === 'overdue');
    const logs = Store.getLogs().filter(l => inWeek(l.entry_date))
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    const target = Store.getSettings().weeklyTarget || 20;

    const cats = {};
    tasks.forEach(t => {
      const c = cats[t.category] = cats[t.category] || { scheduled: 0, completed: 0 };
      c.scheduled++;
      if (t.status === 'finished') c.completed++;
    });
    return { startStr, endStr, tasks, completed, overdue, logs, target, cats };
  }

  function renderReview() {
    const d = reviewData();
    $('#review-label').textContent = `${niceDate(d.startStr)} – ${niceDate(d.endStr)}`;
    $('#review-target').value = d.target;

    const pct = d.tasks.length ? Math.round(d.completed.length / d.tasks.length * 100) : 0;
    const tiles = [
      ['Scheduled', d.tasks.length, ''],
      ['Completed', d.completed.length, 'accent'],
      ['Completion', pct + '%', 'accent'],
      ['Overdue Open', d.overdue.length, d.overdue.length ? 'danger' : ''],
      ['Log Entries', d.logs.length, '']
    ];
    $('#review-stats').innerHTML = tiles.map(([label, val, cls]) =>
      `<div class="stat-tile ${cls}"><div class="stat-value">${val}</div><div class="stat-label">${label}</div></div>`
    ).join('');

    const ratio = Math.min(d.completed.length / d.target, 1);
    $('#progress-fill').style.width = (ratio * 100) + '%';
    $('#progress-fill').classList.toggle('met', d.completed.length >= d.target);
    $('#progress-text').textContent = `${d.completed.length} / ${d.target}`;

    const rows = Object.entries(d.cats)
      .sort((a, b) => b[1].scheduled - a[1].scheduled)
      .map(([cat, c]) =>
        `<tr><td>${escapeHtml(cat)}</td><td>${c.completed}</td><td>${c.scheduled}</td>` +
        `<td>${c.scheduled ? Math.round(c.completed / c.scheduled * 100) : 0}%</td></tr>`);
    $('#review-breakdown').innerHTML =
      '<thead><tr><th>Category</th><th>Done</th><th>Planned</th><th>%</th></tr></thead>' +
      `<tbody>${rows.join('') || '<tr><td colspan="4" class="empty">No tasks scheduled this week.</td></tr>'}</tbody>`;

    const logList = $('#review-logs');
    logList.innerHTML = d.logs.length ? '' : '<p class="empty">No log entries this week.</p>';
    d.logs.forEach(log => {
      const row = document.createElement('div');
      row.className = 'log-row';
      row.innerHTML =
        `<span class="log-date">${escapeHtml(log.entry_date)}</span>` +
        `<span class="log-cat">${escapeHtml(log.category)}</span>` +
        `<span class="log-content">${escapeHtml(log.content)}</span>`;
      logList.appendChild(row);
    });
  }

  /* ---- PDF export ---- */

  function exportReviewPdf() {
    const d = reviewData();
    const pdf = MiniPDF.doc();
    const M = 48;                    // page margin
    let y = 0;

    function ensureRoom(needed) {
      if (y + needed > MiniPDF.H - M) {
        pdf.addPage();
        y = M;
      }
    }

    // Header band
    pdf.rect(0, 0, MiniPDF.W, 86, '#0d1512');
    pdf.rect(0, 86, MiniPDF.W, 3, '#00FFB4');
    pdf.text(M, 40, 'SHIFT_COMMAND // WEEKLY REVIEW', { size: 18, bold: true, color: '#00FFB4' });
    pdf.text(M, 62, `Week of ${d.startStr} to ${d.endStr}`, { size: 11, color: '#d7e6df' });
    pdf.text(MiniPDF.W - M - 150, 62, `Generated ${todayStr()}`, { size: 9, color: '#7d948a' });
    y = 120;

    // Stat summary
    const pct = d.tasks.length ? Math.round(d.completed.length / d.tasks.length * 100) : 0;
    const stats = [
      ['Tasks scheduled', d.tasks.length],
      ['Tasks completed', d.completed.length],
      ['Completion rate', pct + '%'],
      ['Weekly target', d.target],
      ['Target progress', `${d.completed.length} / ${d.target}`],
      ['Overdue open', d.overdue.length],
      ['Log entries', d.logs.length]
    ];
    pdf.text(M, y, 'SUMMARY', { size: 12, bold: true }); y += 18;
    stats.forEach(([label, val]) => {
      pdf.text(M, y, label + ':', { size: 10 });
      pdf.text(M + 140, y, String(val), { size: 10, bold: true });
      y += 15;
    });
    y += 10;

    // Category breakdown
    pdf.text(M, y, 'CATEGORY BREAKDOWN', { size: 12, bold: true }); y += 18;
    pdf.text(M, y, 'Category', { size: 9, bold: true });
    pdf.text(M + 180, y, 'Done', { size: 9, bold: true });
    pdf.text(M + 240, y, 'Planned', { size: 9, bold: true });
    pdf.text(M + 310, y, 'Rate', { size: 9, bold: true });
    y += 6; pdf.line(M, y, MiniPDF.W - M, y, '#00FFB4', 0.8); y += 14;
    const cats = Object.entries(d.cats);
    if (!cats.length) { pdf.text(M, y, 'No tasks scheduled this week.', { size: 10 }); y += 15; }
    cats.forEach(([cat, c]) => {
      ensureRoom(15);
      pdf.text(M, y, cat, { size: 10 });
      pdf.text(M + 180, y, String(c.completed), { size: 10 });
      pdf.text(M + 240, y, String(c.scheduled), { size: 10 });
      pdf.text(M + 310, y, (c.scheduled ? Math.round(c.completed / c.scheduled * 100) : 0) + '%', { size: 10 });
      y += 15;
    });
    y += 10;

    // Completed tasks
    ensureRoom(40);
    pdf.text(M, y, 'COMPLETED TASKS', { size: 12, bold: true }); y += 18;
    if (!d.completed.length) { pdf.text(M, y, 'None completed this week.', { size: 10 }); y += 15; }
    d.completed.forEach(t => {
      ensureRoom(15);
      pdf.text(M, y, `[x] ${t.due_date}  ${t.title} (${t.category})`, { size: 10 });
      y += 15;
    });
    y += 10;

    // Shift log
    ensureRoom(40);
    pdf.text(M, y, 'SHIFT LOG', { size: 12, bold: true }); y += 18;
    if (!d.logs.length) { pdf.text(M, y, 'No log entries this week.', { size: 10 }); y += 15; }
    d.logs.forEach(log => {
      const line = `${log.entry_date} [${log.category}] ${log.content}`;
      // naive wrap at ~95 chars
      for (let i = 0; i < line.length; i += 95) {
        ensureRoom(13);
        pdf.text(M + (i ? 14 : 0), y, line.slice(i, i + 95), { size: 9 });
        y += 13;
      }
      y += 3;
    });

    pdf.download(`weekly-review-${d.startStr}.pdf`);
    toast('PDF exported');
  }

  /* ================= wiring ================= */

  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#clipboard-manage').addEventListener('click', () => showView('links'));

  $('#cal-prev').addEventListener('click', () => shiftCalendar(-1));
  $('#cal-next').addEventListener('click', () => shiftCalendar(1));
  $('#cal-today').addEventListener('click', () => { state.calAnchor = new Date(); renderCalendar(); });
  $$('#cal-mode .seg').forEach(b => b.addEventListener('click', () => {
    state.calMode = b.dataset.mode;
    $$('#cal-mode .seg').forEach(s => s.classList.toggle('active', s === b));
    renderCalendar();
  }));
  $('#task-new').addEventListener('click', () => openTaskModal({ due_date: todayStr() }));

  $('#review-prev').addEventListener('click', () => {
    state.reviewAnchor.setDate(state.reviewAnchor.getDate() - 7); renderReview();
  });
  $('#review-next').addEventListener('click', () => {
    state.reviewAnchor.setDate(state.reviewAnchor.getDate() + 7); renderReview();
  });
  $('#review-this').addEventListener('click', () => { state.reviewAnchor = new Date(); renderReview(); });
  $('#review-target').addEventListener('change', e => {
    const v = Math.max(1, parseInt(e.target.value, 10) || 20);
    Store.saveSettings({ weeklyTarget: v });
    renderReview();
  });
  $('#review-export').addEventListener('click', exportReviewPdf);

  /* ================= init ================= */

  Store.seedIfEmpty(todayStr(), addDaysStr);
  $('#log-form').elements.entry_date.value = todayStr();
  renderClipboard();
  renderCalendar();
})();
