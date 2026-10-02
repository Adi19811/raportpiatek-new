/* Lista dyżurów - przełącznik widoku, edycja listy, przesuwanie kolejki i zapis (localStorage). */
(function () {
  'use strict';

  var KEY = 'app_duty_list';
  var WEEKS_SHOWN = 16; // 2 ostatnie miniete piatki + nadchodzace
  var DAY = 86400000;
  var PAST = '#9ca3af';
  var DEFAULT_COLORS = ['#4a7bc0', '#d0393e', '#e8b32c', '#3f9462', '#8b5cf6', '#0ea5e9', '#f97316', '#64748b'];
  var DEFAULT_STATE = {
    anchor: '2026-05-22', // piątek, od którego liczona jest rotacja (osoba nr 1 w kolejce)
    people: [
      { id: 'p0', name: 'Adam', color: DEFAULT_COLORS[0] },
      { id: 'p1', name: 'Ania', color: DEFAULT_COLORS[1] },
      { id: 'p2', name: 'Dagmara', color: DEFAULT_COLORS[2] },
      { id: 'p3', name: 'Justyna', color: DEFAULT_COLORS[3] }
    ],
    overrides: {} // { 'RRRR-MM-DD': idOsoby } - ręczne zmiany w konkretnych piątkach
  };

  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var mod = function (a, n) { return ((a % n) + n) % n; };
  var seq = 0;
  function uid() { return 'p' + Date.now().toString(36) + (seq++); }

  function normalize(s) {
    s.overrides = s.overrides || {};
    var ids = {};
    s.people.forEach(function (p, i) { if (!p.id) p.id = 'p' + i; ids[p.id] = 1; });
    Object.keys(s.overrides).forEach(function (k) { if (!ids[s.overrides[k]]) delete s.overrides[k]; });
    return s;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.people) && s.people.length && /^\d{4}-\d{2}-\d{2}$/.test(s.anchor)) return normalize(s);
      }
    } catch (e) { /* brak/uszkodzony zapis - użyj domyślnych */ }
    return normalize(clone(DEFAULT_STATE));
  }

  var saved = load();        // ostatnio zapisany stan
  var draft = clone(saved);  // stan edytowany (zapisywany przyciskiem)
  var dragRow = null, dragPerson = null;

  // --- daty (UTC, żeby zmiana czasu nie psuła różnicy tygodni) ---
  function parseISO(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function todayUTC() { var n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); }
  function nextFriday(t) { return t + ((5 - new Date(t).getUTCDay() + 7) % 7) * DAY; }
  function fmt(t) {
    var d = new Date(t);
    return String(d.getUTCDate()).padStart(2, '0') + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + d.getUTCFullYear();
  }

  function isDirty() { return JSON.stringify(draft) !== JSON.stringify(saved); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function byId(id) {
    for (var i = 0; i < draft.people.length; i++) if (draft.people[i].id === id) return draft.people[i];
    return null;
  }

  // kto ma dyżur w danym piątku: ręczna zmiana albo rotacja z kolejki
  function personAt(t) {
    var o = draft.overrides[iso(t)];
    if (o && byId(o)) return byId(o);
    var named = draft.people.filter(function (p) { return p.name.trim(); });
    if (!named.length) return null;
    var w = Math.round((t - parseISO(draft.anchor)) / (7 * DAY));
    return named[mod(w, named.length)];
  }

  var view, peopleBox, listBox, statusEl, saveBtn, tabReport, tabDuty;

  function buildShell() {
    var bar = el('div'); bar.id = 'dz-bar';
    tabReport = el('button', 'active', 'Raport rekrutacyjny');
    tabDuty = el('button', '', 'Lista dyżurów');
    tabReport.onclick = function () { setMode(false); };
    tabDuty.onclick = function () { setMode(true); };
    bar.appendChild(tabReport); bar.appendChild(tabDuty);

    view = el('div'); view.id = 'dz-view';
    var wrap = el('div', 'dz-wrap');
    var card = el('div', 'dz-card');
    card.appendChild(el('h2', '', 'Lista dyżurów (piątki)'));
    card.appendChild(el('p', 'dz-hint', 'Strzałki ↑↓ przy dacie zamieniają dyżur z sąsiednim piątkiem. Można też wybrać osobę z listy albo przeciągnąć wiersz na inny. Minione daty są szare.'));

    var tb = el('div', 'dz-toolbar');
    var back = el('button', 'dz-btn', '← Przesuń kolejkę wstecz');
    var fwd = el('button', 'dz-btn', 'Przesuń kolejkę dalej →');
    var clr = el('button', 'dz-btn', 'Wyczyść ręczne zmiany');
    saveBtn = el('button', 'dz-btn primary', 'Zapisz');
    statusEl = el('span', 'dz-status');
    back.onclick = function () { draft.people.unshift(draft.people.pop()); render(); };
    fwd.onclick = function () { draft.people.push(draft.people.shift()); render(); };
    clr.onclick = function () { draft.overrides = {}; render(); };
    saveBtn.onclick = save;
    [back, fwd, clr, saveBtn, statusEl].forEach(function (n) { tb.appendChild(n); });

    peopleBox = el('div', 'dz-people');
    listBox = el('div', 'dz-grid');
    card.appendChild(tb); card.appendChild(peopleBox); card.appendChild(listBox);
    wrap.appendChild(card);
    view.appendChild(wrap);
    document.body.appendChild(bar);
    document.body.appendChild(view);
    document.body.classList.add('dz-ready');
  }

  function setMode(duty) {
    document.body.classList.toggle('dz-duty', duty);
    tabDuty.classList.toggle('active', duty);
    tabReport.classList.toggle('active', !duty);
    try { sessionStorage.setItem('dz_mode', duty ? 'duty' : 'report'); } catch (e) { /* ignore */ }
    if (duty) render();
  }

  function save() {
    draft.people = draft.people.filter(function (p) { return p.name.trim(); })
      .map(function (p) { return { id: p.id, name: p.name.trim(), color: p.color }; });
    if (!draft.people.length) draft = clone(DEFAULT_STATE);
    normalize(draft);
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
      saved = clone(draft);
    } catch (e) {
      statusEl.textContent = 'Nie udało się zapisać (zablokowany localStorage)';
      return;
    }
    render();
  }

  function movePerson(from, to) {
    if (from === to || to < 0 || to >= draft.people.length) return;
    draft.people.splice(to, 0, draft.people.splice(from, 1)[0]);
    render();
  }

  function swapDays(a, b) {
    if (a === b) return;
    var pa = personAt(a), pb = personAt(b);
    if (!pa || !pb) return;
    draft.overrides[iso(b)] = pa.id;
    draft.overrides[iso(a)] = pb.id;
    render();
  }

  // pasek osób: imię / kolor / kolejność (przeciąganie) / usuwanie / dodawanie
  function renderPeople() {
    peopleBox.textContent = '';
    peopleBox.appendChild(el('span', 'dz-people-label', 'Kolejka:'));
    draft.people.forEach(function (p, idx) {
      var chip = el('div', 'dz-pchip');
      chip.draggable = true;
      chip.style.background = p.color;
      chip.addEventListener('dragstart', function (e) { dragPerson = idx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'p' + idx); });
      chip.addEventListener('dragend', function () { dragPerson = null; });
      chip.addEventListener('dragover', function (e) { if (dragPerson != null) { e.preventDefault(); chip.classList.add('over'); } });
      chip.addEventListener('dragleave', function () { chip.classList.remove('over'); });
      chip.addEventListener('drop', function (e) { e.preventDefault(); chip.classList.remove('over'); if (dragPerson != null) movePerson(dragPerson, idx); });

      var n = el('input');
      n.type = 'text'; n.value = p.name; n.placeholder = 'Imię'; n.maxLength = 30; n.size = Math.max(4, p.name.length + 1);
      n.addEventListener('input', function () { p.name = n.value; n.size = Math.max(4, n.value.length + 1); renderList(); updateStatus(); });
      var c = el('input');
      c.type = 'color'; c.value = p.color; c.title = 'Kolor';
      c.addEventListener('input', function () { p.color = c.value; chip.style.background = c.value; renderList(); updateStatus(); });
      var del = el('button', '', '✕');
      del.title = 'Usuń'; del.disabled = draft.people.length <= 1;
      del.onclick = function () { draft.people.splice(idx, 1); render(); };
      chip.appendChild(n); chip.appendChild(c); chip.appendChild(del);
      peopleBox.appendChild(chip);
    });
    var add = el('button', 'dz-btn', '+ Osoba');
    add.onclick = function () {
      draft.people.push({ id: uid(), name: '', color: DEFAULT_COLORS[draft.people.length % DEFAULT_COLORS.length] });
      render();
      var inputs = peopleBox.querySelectorAll('.dz-pchip input[type=text]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    };
    peopleBox.appendChild(add);
  }

  function renderList() {
    listBox.textContent = '';
    var named = draft.people.filter(function (p) { return p.name.trim(); });
    if (!named.length) { listBox.appendChild(el('p', 'dz-hint', 'Kolejka jest pusta.')); return; }
    var today = todayUTC();
    var cur = nextFriday(today);
    var start = cur - 2 * 7 * DAY;
    for (var i = 0; i < WEEKS_SHOWN; i++) {
      (function (t, i) {
        var past = t < today, isCur = t === cur;
        var p = personAt(t);
        var row = el('div', 'dz-row' + (past ? ' past' : '') + (isCur ? ' today' : ''));
        if (!past) {
          row.draggable = true;
          row.addEventListener('dragstart', function (e) { dragRow = t; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'r' + t); });
          row.addEventListener('dragend', function () { dragRow = null; row.classList.remove('dragging'); });
          row.addEventListener('dragover', function (e) { if (dragRow != null) { e.preventDefault(); row.classList.add('over'); } });
          row.addEventListener('dragleave', function () { row.classList.remove('over'); });
          row.addEventListener('drop', function (e) { e.preventDefault(); row.classList.remove('over'); if (dragRow != null) swapDays(dragRow, t); });
        }
        if (!past) {
          var arrows = el('span', 'dz-move');
          var up = el('button', '', '↑');
          up.title = 'Zamień z poprzednim piątkiem'; up.disabled = t - 7 * DAY < today;
          up.onclick = function () { swapDays(t, t - 7 * DAY); };
          var down = el('button', '', '↓');
          down.title = 'Zamień z następnym piątkiem'; down.disabled = i === WEEKS_SHOWN - 1;
          down.onclick = function () { swapDays(t, t + 7 * DAY); };
          arrows.appendChild(up); arrows.appendChild(down);
          row.appendChild(arrows);
        }
        row.appendChild(el('span', 'dz-date', fmt(t)));
        row.appendChild(el('span', 'dz-arrow', '→'));
        if (past) {
          var chip = el('span', 'dz-chip', p.name);
          chip.style.background = PAST;
          row.appendChild(chip);
        } else {
          var sel = el('select', 'dz-chip dz-select');
          sel.style.background = p.color;
          named.forEach(function (q) {
            var o = el('option', '', q.name);
            o.value = q.id; if (q.id === p.id) o.selected = true;
            sel.appendChild(o);
          });
          sel.addEventListener('change', function () { draft.overrides[iso(t)] = sel.value; render(); });
          row.appendChild(sel);
        }
        if (draft.overrides[iso(t)] && !past) row.appendChild(el('span', 'dz-tag manual', 'ręcznie'));
        else if (isCur) row.appendChild(el('span', 'dz-tag', 'najbliższy'));
        listBox.appendChild(row);
      })(start + i * 7 * DAY, i);
    }
  }

  function updateStatus() {
    var dirty = isDirty();
    statusEl.textContent = dirty ? 'Niezapisane zmiany' : 'Zapisano';
    statusEl.className = 'dz-status' + (dirty ? ' dirty' : '');
    saveBtn.disabled = !dirty;
  }

  function render() { renderPeople(); renderList(); updateStatus(); }

  function init() {
    buildShell();
    render();
    var mode = null;
    try { mode = sessionStorage.getItem('dz_mode'); } catch (e) { /* ignore */ }
    if (mode === 'duty') setMode(true);
    window.addEventListener('beforeunload', function (e) { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
