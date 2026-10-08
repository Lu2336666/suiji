(() => {
  const PRESETS = [
    { name: '1–100', min: 1, max: 100, count: 1, unique: true },
    { name: '1–10', min: 1, max: 10, count: 1, unique: true },
    { name: '骰子', min: 1, max: 6, count: 1, unique: true },
    { name: '抛硬币', min: 0, max: 1, count: 1, unique: true, coin: true },
    { name: '抽5个', min: 1, max: 100, count: 5, unique: true },
    { name: '双色球', special: 'ssq' },
  ];

  const $ = (id) => document.getElementById(id);
  const state = { unique: true, sort: false, coin: false, special: null };

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('on'), 1500);
  }

  function randInt(min, max) {
    const span = max - min + 1;
    if (span <= 0) return min;
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return min + (buf[0] % span);
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      const t = list[i];
      list[i] = list[j];
      list[j] = t;
    }
    return list;
  }

  function pick(min, max, count, unique) {
    if (max < min) { const t = min; min = max; max = t; }
    const span = max - min + 1;
    count = Math.max(1, Math.min(200, count));
    if (unique) {
      if (count > span) {
        toast(`这个范围最多 ${span} 个不重复`);
        count = span;
      }
      const bag = [];
      for (let n = min; n <= max; n++) bag.push(n);
      return shuffle(bag).slice(0, count);
    }
    const out = [];
    for (let i = 0; i < count; i++) out.push(randInt(min, max));
    return out;
  }

  function ssq() {
    const red = pick(1, 33, 6, true).sort((a, b) => a - b);
    const blue = pick(1, 16, 1, true);
    return { red, blue };
  }

  function show(list, extra) {
    const box = $('nums');
    const ph = $('placeholder');
    ph.classList.add('hidden');
    box.classList.remove('hidden');
    box.innerHTML = '';
    const many = list.length > 8;
    list.forEach((n) => {
      const d = document.createElement('div');
      d.className = 'num' + (many ? ' many' : '');
      d.textContent = extra && extra.coin ? (n === 1 ? '正' : '反') : String(n);
      box.appendChild(d);
    });
    if (extra && extra.blue) {
      extra.blue.forEach((n) => {
        const d = document.createElement('div');
        d.className = 'num';
        d.style.borderColor = '#5b8cff';
        d.textContent = String(n);
        box.appendChild(d);
      });
    }
    $('btnCopy').disabled = false;
    state.lastText = extra && extra.coin
      ? list.map((n) => (n === 1 ? '正' : '反')).join(' ')
      : extra && extra.blue
        ? `红 ${list.join(' ')}  蓝 ${extra.blue.join(' ')}`
        : list.join(' ');
  }

  function go() {
    if (state.special === 'ssq') {
      const { red, blue } = ssq();
      show(red, { blue });
      return;
    }
    const min = Number($('min').value);
    const max = Number($('max').value);
    const count = Number($('count').value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(count)) {
      toast('请填数字');
      return;
    }
    if (Math.abs(max - min) > 1e9) {
      toast('范围太大了');
      return;
    }
    let list = pick(Math.round(min), Math.round(max), Math.round(count), state.unique);
    if (state.sort && !state.coin) list = list.slice().sort((a, b) => a - b);
    show(list, { coin: state.coin });
  }

  function applyPreset(p) {
    state.special = p.special || null;
    state.coin = !!p.coin;
    [...$('presets').children].forEach((b) => b.classList.toggle('on', b.textContent === p.name));
    if (p.special === 'ssq') {
      $('min').value = 1;
      $('max').value = 33;
      $('count').value = 6;
      state.unique = true;
      $('btnUnique').classList.add('on');
      $('btnGo').textContent = '摇号';
      go();
      return;
    }
    $('min').value = p.min;
    $('max').value = p.max;
    $('count').value = p.count;
    state.unique = p.unique !== false;
    $('btnUnique').classList.toggle('on', state.unique);
    $('btnGo').textContent = p.count > 1 ? `抽 ${p.count} 个` : (p.coin ? '抛一次' : '抽一个');
    go();
  }

  function buildPresets() {
    const host = $('presets');
    PRESETS.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (i === 0 ? ' on' : '');
      b.textContent = p.name;
      b.addEventListener('click', () => applyPreset(p));
      host.appendChild(b);
    });
  }

  $('btnUnique').addEventListener('click', () => {
    state.unique = !state.unique;
    $('btnUnique').classList.toggle('on', state.unique);
    $('btnUnique').setAttribute('aria-pressed', state.unique ? 'true' : 'false');
  });
  $('btnSort').addEventListener('click', () => {
    state.sort = !state.sort;
    $('btnSort').classList.toggle('on', state.sort);
    $('btnSort').setAttribute('aria-pressed', state.sort ? 'true' : 'false');
  });
  $('btnGo').addEventListener('click', () => {
    state.special = state.special === 'ssq' && $('count').value === '6' ? 'ssq' : null;
    if ($('min').value !== '0' || $('max').value !== '1') state.coin = false;
    const n = Number($('count').value);
    if (!state.special && !state.coin) {
      $('btnGo').textContent = n > 1 ? `抽 ${n} 个` : '抽一个';
    }
    go();
  });
  $('btnCopy').addEventListener('click', async () => {
    if (!state.lastText) return;
    try {
      await navigator.clipboard.writeText(state.lastText);
      toast('已复制');
    } catch (_) {
      toast(state.lastText);
    }
  });
  ['min', 'max', 'count'].forEach((id) => {
    $(id).addEventListener('change', () => { state.special = null; state.coin = false; });
  });

  buildPresets();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
