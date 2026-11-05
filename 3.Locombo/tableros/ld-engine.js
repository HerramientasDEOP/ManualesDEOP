/* =========================================================================
   Motor de tableros Locomboo (prefijo LD).
   Dibuja páginas estilo Power BI a partir de una definición declarativa:
   filtros, tablas, matrices, tablas dinámicas, gráficas y tarjetas.
   Todo sale de filas de datos: un filtro o un clic en una barra recalcula
   todos los visuales de la página.

   Usa del manual (primer <script> de index.html): hideTooltip, lbTipShow,
   lbTipHide, bindAllHotspots y hasHover.
   ========================================================================= */
(function () {
  'use strict';

  const LD = window.LD = { boards:{}, main:{} };
  const LOGO_CEMEX = '../Recursos/Locombo/Tablero/LogoCemexDO.png';
  const LOGO_LOCO = '../Recursos/Locombo/Tablero/LogoLocomboo.png';
  const IMG_UC = '../Recursos/Construccion.png';
  const INI_FILAS = 60;   // filas que se pintan al inicio; el resto llega al hacer scroll

  /* ---------------- Utilidades y formatos ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const num = (v, dec) => (v == null || v === '') ? '' : Number(v).toLocaleString('es-CO', { minimumFractionDigits:dec, maximumFractionDigits:dec });
  const isoTxt = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
  const dtTxt = ms => {
    if (ms == null || ms === '') return '';
    const d = new Date(ms);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${d.getHours()}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  const hmTxt = ms => {
    if (ms == null || ms === '') return '';
    const d = new Date(ms);
    return `${d.getHours()}:${pad(d.getMinutes())}`;
  };
  const F = LD.F = {
    n0:v => num(v, 0), n1:v => num(v, 1), n2:v => num(v, 2),
    pct:v => (v == null ? '' : num(v, 2) + '%'),
    d:isoTxt, dt:dtTxt, hm:hmTxt, cod:v => num(v, 2), txt:v => (v == null ? '' : v)
  };
  const sumBy = LD.sumBy = (rows, k) => rows.reduce((s, r) => s + (+(typeof k === 'function' ? k(r) : r[k]) || 0), 0);
  const avgBy = LD.avgBy = (rows, k) => rows.length ? sumBy(rows, k) / rows.length : 0;

  /* Agrupa filas por clave conservando el orden de aparición */
  LD.group = (rows, keyFn) => {
    const m = new Map();
    rows.forEach(r => { const k = keyFn(r); (m.get(k) || m.set(k, []).get(k)).push(r); });
    return m;
  };
  const cmp = (a, b) => {
    if (a === b) return 0;
    if (a == null || a === '') return 1;
    if (b == null || b === '') return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'es', { numeric:true });
  };
  const tipAttrs = (t, x) => (t || x) ? `data-tip-title="${esc(t || '')}" data-tip-text="${esc(x || '')}"` : '';
  const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';

  /* ---------------- Estado de una página: filtros + selección cruzada ---------------- */
  function newState(page) { return { sel:{}, cross:null, filters:page.filters || [], extra:{}, page }; }

  function passRow(r, st, noCross) {
    for (const f of st.filters) {
      const s = st.sel[f.key];
      if (s && r[f.field] !== undefined && !s.has(r[f.field])) return false;
    }
    if (st.cross && !noCross) {
      for (const k in st.cross) if (r[k] !== undefined && r[k] !== st.cross[k]) return false;
    }
    return true;
  }
  function ctxOf(st, rerender, goTo) {
    return {
      st,
      rows:(rows, opts) => rows.filter(r => passRow(r, st, opts && opts.noCross)),
      toggleCross(obj) {
        st.cross = (st.cross && JSON.stringify(st.cross) === JSON.stringify(obj)) ? null : obj;
        rerender();
      },
      isSel:(obj) => !!st.cross && Object.keys(st.cross).every(k => obj[k] === undefined ? true : st.cross[k] === obj[k]) ,
      rerender, goTo
    };
  }

  /* ---------------- Filtros (segmentadores) ---------------- */
  function flatValues(page, f) {
    const set = new Set();
    page.optRows().forEach(r => { const v = r[f.field]; if (v !== undefined && v !== null && v !== '') set.add(v); });
    const list = [...set];
    return f.order ? list.sort((a, b) => f.order.indexOf(a) - f.order.indexOf(b)) : list.sort(cmp);
  }
  /* Nodo de árbol: {label, full, value} o {label, full, kids:[...]} */
  const leavesOf = n => n.kids ? n.kids.flatMap(leavesOf) : [n.value];
  function treeOf(page, f) { return f.tree ? f.tree(page.optRows()) : null; }

  function initFilters(page, st) {
    st.filters.forEach(f => {
      if (st.sel[f.key] !== undefined) return;
      st.sel[f.key] = f.def ? new Set(typeof f.def === 'function' ? f.def(page.optRows()) : f.def) : null;
    });
  }
  function filterLabel(page, st, f) {
    const s = st.sel[f.key];
    if (!s) return f.allLabel || 'Todas';
    if (s.size === 1) {
      const only = [...s][0];
      return String(f.showValue ? f.showValue(only) : only);
    }
    const tree = treeOf(page, f);
    if (tree) {
      const walk = nodes => {
        for (const n of nodes) {
          if (!n.kids) continue;
          const deep = walk(n.kids);
          if (deep) return deep;
          const lv = leavesOf(n);
          if (lv.length === s.size && lv.every(v => s.has(v))) return n.full || n.label;
        }
        return null;
      };
      const name = walk(tree);
      if (name) return name;
    }
    return 'Selección múltiple';
  }
  function optHtml(attrs, label, sel, cls) {
    return `<div class="lb-opt${sel ? ' sel' : ''}${cls ? ' ' + cls : ''}" ${attrs}><span class="chk">✓</span>${esc(label)}</div>`;
  }
  function renderMenu(page, st, f, menu) {
    const s = st.sel[f.key];
    let html = '';
    const tree = treeOf(page, f);
    const values = tree ? tree.flatMap(leavesOf) : flatValues(page, f);
    if (values.length > 12) html += '<input class="lb-opt-search" type="text" placeholder="Buscar">';
    html += optHtml('data-all="1"', 'Seleccionar todo', !s);
    if (tree) {
      const walk = (nodes, depth) => nodes.forEach(n => {
        const lv = n.kids ? leavesOf(n) : [n.value];
        const sel = !!s && lv.every(v => s.has(v));
        const attr = `data-vals="${esc(JSON.stringify(lv))}" data-search="${esc(n.label)}"`;
        html += `<div style="padding-left:${depth * 14}px">${optHtml(attr, n.label, sel, n.kids ? 'grp' : '')}</div>`;
        if (n.kids) walk(n.kids, depth + 1);
      });
      walk(tree, 0);
    } else {
      values.forEach(v => {
        const lbl = f.showValue ? f.showValue(v) : v;
        html += optHtml(`data-vals="${esc(JSON.stringify([v]))}" data-search="${esc(lbl)}"`, lbl, !!s && s.has(v));
      });
    }
    menu.innerHTML = html;
    const search = menu.querySelector('.lb-opt-search');
    if (search) {
      search.addEventListener('click', e => e.stopPropagation());
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        menu.querySelectorAll('.lb-opt[data-search]').forEach(o => {
          o.parentElement.style.display = '';
          o.style.display = String(o.dataset.search).toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }
  }
  function closeMenus() { document.querySelectorAll('.ld-slicer.open').forEach(s => s.classList.remove('open')); }
  document.addEventListener('click', closeMenus);

  function renderFilters(box, page, st, onChange) {
    box.innerHTML = st.filters.map(f => `
      <div class="ld-slicer hotspot" data-key="${f.key}" ${tipAttrs(f.label, f.tip)}>
        <div class="lb-slicer-label">${esc(f.label)}</div>
        <div class="lb-slicer-box"><span class="lb-slicer-val"></span>${CHEVRON}</div>
        <div class="lb-slicer-menu"></div>
      </div>`).join('');
    box.style.setProperty('--ld-n', st.filters.length);
    box.querySelectorAll('.ld-slicer').forEach(sl => {
      const f = st.filters.find(x => x.key === sl.dataset.key);
      const menu = sl.querySelector('.lb-slicer-menu');
      sl.querySelector('.lb-slicer-box').addEventListener('click', e => {
        e.stopPropagation();
        hideTooltip();
        const wasOpen = sl.classList.contains('open');
        closeMenus();
        if (!wasOpen) { renderMenu(page, st, f, menu); sl.classList.add('open'); }
      });
      menu.addEventListener('mouseenter', hideTooltip);
      menu.addEventListener('click', e => {
        e.stopPropagation();
        const o = e.target.closest('.lb-opt');
        if (!o) return;
        if (o.dataset.all) st.sel[f.key] = null;
        else {
          const vals = JSON.parse(o.dataset.vals);
          const cur = st.sel[f.key] ? new Set(st.sel[f.key]) : new Set();
          const allOn = vals.every(v => cur.has(v));
          vals.forEach(v => { if (allOn) cur.delete(v); else cur.add(v); });
          st.sel[f.key] = cur.size ? cur : null;
        }
        renderMenu(page, st, f, menu);   // multi-selección: el menú queda abierto
        onChange();
      });
    });
    updateFilterLabels(box, page, st);
    bindAllHotspots(box);
  }
  function updateFilterLabels(box, page, st) {
    box.querySelectorAll('.ld-slicer').forEach(sl => {
      const f = st.filters.find(x => x.key === sl.dataset.key);
      sl.querySelector('.lb-slicer-val').textContent = filterLabel(page, st, f);
      sl.classList.toggle('filtered', !!st.sel[f.key] && !f.def);
    });
  }

  /* ---------------- Tabla: filas perezosas, orden por columna, total ---------------- */
  function cellHtml(col, r, blank) {
    const raw = r[col.k];
    const txt = blank ? '' : (col.f ? col.f(raw, r) : (raw == null ? '' : raw));
    const bg = !blank && col.cf ? col.cf(raw, r) : null;
    return `<td class="${col.num ? 'num' : ''}${col.wrap ? ' wrap' : ''}"${bg ? ` style="background:${bg}"` : ''}>${esc(txt)}</td>`;
  }
  function headHtml(cols, sort, sortable) {
    return cols.map(c => {
      const arrow = sort && sort.k === c.k ? `<span class="sort">${sort.dir > 0 ? '▲' : '▼'}</span>` : '';
      const bg = c.hdr ? ` style="background:${c.hdr}"` : '';
      return `<th class="${c.num ? 'num' : ''}"${bg}${sortable ? ` data-k="${c.k}" title="Clic para ordenar"` : ''}>${esc(c.l)}${arrow}</th>`;
    }).join('');
  }
  function totalsHtml(cols, rows, cfg) {
    if (!cfg) return '';
    let first = true;
    return `<tfoot><tr>${cols.map(c => {
      let txt = '';
      if (c.tot) {
        const v = typeof c.tot === 'function' ? c.tot(rows) : c.tot === 'avg' ? avgBy(rows, c.k) : sumBy(rows, c.k);
        txt = (c.totF || c.f || F.txt)(v);
      } else if (first) txt = 'Total';
      first = false;
      return `<td class="${c.num ? 'num' : ''}">${esc(txt)}</td>`;
    }).join('')}</tr></tfoot>`;
  }
  function renderTable(b, ctx, el) {
    const prevLeft = el.scrollLeft;
    let rows = b.rows(ctx);
    const sort = b._sort || b.sort;
    if (sort) {
      const vacio = v => v == null || v === '';
      rows = [...rows].sort((x, y) => {
        const a = x[sort.k], c = y[sort.k];
        if (vacio(a) !== vacio(c)) return vacio(a) ? 1 : -1;
        return cmp(a, c) * sort.dir || (x._i || 0) - (y._i || 0);
      });
    }
    const rowHtml = (r, i) => {
      const prev = rows[i - 1];
      let same = !!(b.merge && prev);
      return `<tr data-i="${i}">${b.cols.map(c => {
        const inMerge = b.merge && b.merge.includes(c.k);
        const blank = inMerge && same && prev[c.k] === r[c.k];
        if (inMerge && !blank) same = false;
        return cellHtml(c, r, blank);
      }).join('')}</tr>`;
    };
    let shown = Math.min(INI_FILAS, rows.length);
    el.innerHTML = `<table class="lb-table ld-t"><thead><tr>${headHtml(b.cols, sort, !b.noSort)}</tr></thead><tbody>${rows.slice(0, shown).map(rowHtml).join('')}</tbody>${totalsHtml(b.cols, rows, b.total)}</table>`;
    const tbody = el.querySelector('tbody');
    el.onscroll = () => {
      if (shown >= rows.length || el.scrollTop + el.clientHeight < el.scrollHeight - 60) return;
      const next = Math.min(shown + INI_FILAS, rows.length);
      tbody.insertAdjacentHTML('beforeend', rows.slice(shown, next).map((r, j) => rowHtml(r, shown + j)).join(''));
      shown = next;
    };
    el.onclick = e => {
      const th = e.target.closest('th[data-k]');
      if (th) {
        const k = th.dataset.k, cur = b._sort || b.sort;
        b._sort = cur && cur.k === k ? { k, dir:-cur.dir } : { k, dir:1 };
        renderTable(b, ctx, el);
        return;
      }
      if (b.selectable) {
        const tr = e.target.closest('tbody tr');
        if (!tr) return;
        const was = tr.classList.contains('ld-rowsel');
        el.querySelectorAll('.ld-rowsel').forEach(x => x.classList.remove('ld-rowsel'));
        if (!was) tr.classList.add('ld-rowsel');
      }
    };
    el.scrollLeft = prevLeft;
  }

  /* ---------------- Matriz con niveles que se expanden (⊞ / ⊟) ---------------- */
  function renderTree(b, ctx, el) {
    const prevLeft = el.scrollLeft, prevTop = el.scrollTop;
    const rows = b.rows(ctx);
    b._open = b._open || new Set();
    b._closed = b._closed || new Set();
    const isOpen = (path, depth) => depth < (b.openDepth || 0) ? !b._closed.has(path) : b._open.has(path);
    const measures = b.cols;
    const cellsOf = list => measures.map(c => {
      const v = c.calc ? c.calc(list) : sumBy(list, c.k);
      return `<td class="num">${esc((c.f || F.n2)(v))}</td>`;
    }).join('');
    const out = [];
    const walk = (list, depth, prefix) => {
      const key = b.levels[depth];
      const g = LD.group(list, r => r[key.k]);
      let keys = [...g.keys()];
      if (key.sort !== false) keys.sort(cmp);
      keys.forEach(kv => {
        const sub = g.get(kv), path = prefix + '|' + kv, leaf = depth === b.levels.length - 1;
        const open = !leaf && isOpen(path, depth);
        const icon = leaf ? '' : `<span class="ld-exp" data-path="${esc(path)}" data-depth="${depth}">${open ? '−' : '+'}</span>`;
        const lbl = key.f ? key.f(kv) : kv;
        out.push(`<tr class="ld-lv${depth}"><td class="ld-treecell" style="padding-left:${6 + depth * 14}px">${icon}${esc(lbl)}</td>${cellsOf(sub)}</tr>`);
        if (open) walk(sub, depth + 1, path);
      });
    };
    walk(rows, 0, '');
    let shown = Math.min(INI_FILAS, out.length);
    el.innerHTML = `<table class="lb-table ld-t ld-tree"><thead><tr><th>${esc(b.firstLabel)}</th>${measures.map(c => `<th class="num"${c.hdr ? ` style="background:${c.hdr}"` : ''}>${esc(c.l)}</th>`).join('')}</tr></thead>
      <tbody>${out.slice(0, shown).join('')}</tbody>
      <tfoot><tr><td>Total</td>${cellsOf(rows)}</tr></tfoot></table>`;
    const tbody = el.querySelector('tbody');
    el.onscroll = () => {
      if (shown >= out.length || el.scrollTop + el.clientHeight < el.scrollHeight - 60) return;
      const next = Math.min(shown + INI_FILAS, out.length);
      tbody.insertAdjacentHTML('beforeend', out.slice(shown, next).join(''));
      shown = next;
    };
    el.onclick = e => {
      const x = e.target.closest('.ld-exp');
      if (!x) return;
      const depth = +x.dataset.depth, path = x.dataset.path;
      if (depth < (b.openDepth || 0)) { if (b._closed.has(path)) b._closed.delete(path); else b._closed.add(path); }
      else { if (b._open.has(path)) b._open.delete(path); else b._open.add(path); }
      renderTree(b, ctx, el);
    };
    el.scrollLeft = prevLeft; el.scrollTop = prevTop;
  }

  /* ---------------- Tabla dinámica: filas (expandibles) × columnas ---------------- */
  function renderPivot(b, ctx, el) {
    const rows = b.rows(ctx);
    b._open = b._open || new Set();
    const colVals = b.colValues ? b.colValues(rows) : [...new Set(rows.map(r => r[b.colKey]))].sort(cmp);
    const m = b.measures;
    const cells = list => {
      let s = '';
      colVals.forEach(cv => {
        const sub = list.filter(r => r[b.colKey] === cv);
        m.forEach(x => { s += `<td class="num">${sub.length ? esc((x.f || F.n0)(sumBy(sub, x.k))) : ''}</td>`; });
      });
      m.forEach(x => { s += `<td class="num ld-totcol">${esc((x.f || F.n0)(sumBy(list, x.k)))}</td>`; });
      return s;
    };
    const lv = b.rowLevels;
    const body = [];
    const walk = (list, depth, prefix) => {
      const g = LD.group(list, r => r[lv[depth].k]);
      let keys = [...g.keys()];
      keys.sort(lv[depth].order ? (a, c) => lv[depth].order.indexOf(a) - lv[depth].order.indexOf(c)
        : lv[depth].blankFirst ? (a, c) => (a === '' ? -1 : c === '' ? 1 : cmp(a, c)) : cmp);
      keys.forEach(k => {
        const path = prefix + '|' + k, leaf = depth === lv.length - 1, open = !leaf && b._open.has(path);
        const icon = leaf ? '' : `<span class="ld-exp" data-path="${esc(path)}">${open ? '−' : '+'}</span>`;
        body.push(`<tr class="ld-lv${depth + 1}"><td class="ld-treecell" style="padding-left:${6 + depth * 14}px">${icon}${esc(k == null || k === '' ? '' : k)}</td>${cells(g.get(k))}</tr>`);
        if (open) walk(g.get(k), depth + 1, path);
      });
    };
    walk(rows, 0, '');
    const twoRows = b.showColHeader !== false;
    const head1 = twoRows ? `<tr><th>${esc(b.colLabel)}</th>${colVals.map(v => `<th colspan="${m.length}">${esc(v)}</th>`).join('')}<th colspan="${m.length}" class="ld-totcol">Total</th></tr>` : '';
    const head2 = `<tr><th>${esc(b.rowLabel)}</th>${colVals.map(v => m.map(x => `<th class="num">${esc(twoRows ? x.l : v)}</th>`).join('')).join('')}${m.map(x => `<th class="num ld-totcol">${esc(twoRows ? x.l : 'Total')}</th>`).join('')}</tr>`;
    el.innerHTML = `<table class="lb-table ld-t ld-pivot"><thead>${head1}${head2}</thead><tbody>${body.join('')}</tbody>
      <tfoot><tr><td>Total</td>${cells(rows)}</tr></tfoot></table>`;
    el.onclick = e => {
      const x = e.target.closest('.ld-exp');
      if (!x) return;
      if (b._open.has(x.dataset.path)) b._open.delete(x.dataset.path); else b._open.add(x.dataset.path);
      renderPivot(b, ctx, el);
    };
  }

  /* ---------------- Gráficas ---------------- */
  const S = (x) => Math.round(x * 100) / 100;
  function legend(cx, y, items, hit) {
    const w = items.map(([n]) => 20 + String(n).length * 5.5);
    let x = cx - w.reduce((a, b) => a + b, 0) / 2, s = '';
    items.forEach(([n, c], i) => {
      s += `<g${hit ? ` class="ld-hitl" data-l="${i}"` : ''} style="${hit ? 'cursor:pointer' : ''}">${hit ? `<rect x="${S(x)}" y="${y - 11}" width="${S(w[i] - 4)}" height="15" fill="transparent"/>` : ''}<circle cx="${S(x + 5)}" cy="${y - 4}" r="4.5" fill="${c}"/><text x="${S(x + 12)}" y="${y}" font-size="10.5" fill="#252423">${esc(n)}</text></g>`;
      x += w[i];
    });
    return s;
  }
  /* Niveles de eje (día › mes › año; planta › cluster) con divisores punteados */
  function axisLevels(cats, xAt, slot, baseY, keys, rowH) {
    let s = '';
    keys.forEach((key, lv) => {
      const y = baseY + rowH * lv;
      let i = 0;
      while (i < cats.length) {
        let j = i;
        while (j + 1 < cats.length && cats[j + 1][key] === cats[i][key]) j++;
        const x0 = xAt(i) - slot / 2, x1 = xAt(j) + slot / 2, txt = cats[i][key];
        s += `<line x1="${S(x0)}" y1="${y - rowH + 4}" x2="${S(x0)}" y2="${y + 4}" stroke="#c8c8c8" stroke-dasharray="2,3"/>`;
        if (txt != null && x1 - x0 > 16) s += `<text x="${S((x0 + x1) / 2)}" y="${y}" font-size="10" text-anchor="middle" fill="#252423" font-weight="${lv === keys.length - 1 ? 400 : 600}">${esc(txt)}</text>`;
        i = j + 1;
      }
      s += `<line x1="${S(xAt(cats.length - 1) + slot / 2)}" y1="${y - rowH + 4}" x2="${S(xAt(cats.length - 1) + slot / 2)}" y2="${y + 4}" stroke="#c8c8c8" stroke-dasharray="2,3"/>`;
    });
    return s;
  }
  function wireChart(el, onMove, onClick) {
    el.onmousemove = e => {
      const h = e.target.closest('.lb-hit,.ld-hitl');
      if (!h) { lbTipHide(); return; }
      onMove(e, h);
    };
    el.onmouseleave = lbTipHide;
    el.onclick = e => {
      const h = e.target.closest('.lb-hit,.ld-hitl');
      if (!h) return;
      e.stopPropagation();
      lbTipHide();
      onClick(h);
    };
  }
  const NOTE_ON = 'Clic para filtrar la página por esta selección', NOTE_OFF = 'Clic de nuevo para quitar el filtro';

  /* Columnas apiladas: categorías (días) y series (turnos o tipos) */
  function chartStack(c, ctx, el) {
    const rows = c.rows(ctx, { noCross:true });
    const cats = c.cats(rows), byCat = LD.group(rows, r => r[c.catField]);
    const W = c.W || 1500, L = c.yAxis ? 44 : 14, R = W - 14, T = 24, B = c.H || 300, slot = (R - L) / Math.max(cats.length, 1);
    const data = cats.map(ct => {
      const list = byCat.get(ct.key) || [], counts = {};
      list.forEach(r => { const k = r[c.serField]; counts[k] = (counts[k] || 0) + 1; });
      return { ct, counts, total:list.length };
    });
    const maxV = Math.max(1, ...data.map(d => d.total)), k = (B - T - 6) / maxV;
    const xAt = i => L + slot * i + slot / 2, bw = Math.min(slot * (c.barRatio || 0.82), 60);
    let s = '';
    if (c.yAxis) c.yAxis.forEach(v => {
      if (v > maxV * 1.1) return;
      const y = B - v * k;
      s += `<line x1="${L}" x2="${R}" y1="${S(y)}" y2="${S(y)}" stroke="#e6e6e6" stroke-dasharray="2,3"/><text x="${L - 8}" y="${S(y + 3)}" font-size="10" text-anchor="end" fill="#605e5c">${v}</text>`;
    });
    data.forEach((d, i) => {
      let y = B;
      const x = xAt(i) - bw / 2;
      const catSel = ctx.st.cross && ctx.st.cross[c.catField] !== undefined;
      c.series.forEach((se, si) => {
        const v = d.counts[se.key] || 0;
        if (!v) return;
        const h = v * k; y -= h;
        let op = 1;
        if (ctx.st.cross) {
          const crossSer = ctx.st.cross[c.serField];
          const on = (!catSel || ctx.st.cross[c.catField] === d.ct.key) && (crossSer === undefined || crossSer === se.key);
          op = on ? 1 : 0.22;
        }
        s += `<rect x="${S(x)}" y="${S(y)}" width="${S(bw)}" height="${S(h)}" fill="${se.color}" opacity="${op}"/>`;
        if (h >= (c.minLabel || 11)) s += `<text x="${S(x + bw / 2)}" y="${S(y + h / 2 + 3.5)}" font-size="${c.labelSize || 10}" font-weight="700" text-anchor="middle" fill="${se.ink || '#252423'}" opacity="${op}" pointer-events="none">${v}</text>`;
        s += `<rect class="lb-hit" data-c="${i}" data-s="${si}" x="${S(x)}" y="${S(y)}" width="${S(bw)}" height="${S(h)}" fill="transparent"/>`;
      });
      if (d.total && c.totals !== false) s += `<text x="${S(xAt(i))}" y="${S(y - 5)}" font-size="10" font-weight="700" text-anchor="middle" fill="#252423" pointer-events="none">${d.total}</text>`;
      if (d.ct.label != null && d.ct.label !== '') s += `<text x="${S(xAt(i))}" y="${B + 14}" font-size="10" text-anchor="middle" fill="#252423" font-weight="${c.labelBold ? 600 : 400}">${esc(d.ct.label)}</text>`;
    });
    let yy = B + 28;
    if (c.levels && c.levels.length && cats.length) { s += axisLevels(cats, xAt, slot, yy, c.levels, 16); yy += 16 * c.levels.length; }
    s += `<text x="${S((L + R) / 2)}" y="${yy + 2}" font-size="12" font-weight="700" text-anchor="middle" fill="#252423">${esc(c.xTitle || '')}</text>`;
    s += legend((L + R) / 2, yy + 20, c.series.map(se => [se.label, se.color]), true);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${yy + 28}">${s}</svg>`;
    wireChart(el, (e, h) => {
      if (h.classList.contains('ld-hitl')) {
        const se = c.series[+h.dataset.l];
        lbTipShow(e, [[c.serTitle || 'Serie', se.label]], ctx.isSel({ [c.serField]:se.key }) ? NOTE_OFF : NOTE_ON);
        return;
      }
      const d = data[+h.dataset.c], se = c.series[+h.dataset.s], obj = { [c.catField]:d.ct.key, [c.serField]:se.key };
      lbTipShow(e, [[c.catTitle || 'Día', d.ct.tip || d.ct.label], [c.serTitle || 'Serie', se.label], ['Jornadas', d.counts[se.key]], ['Total del día', d.total]],
        ctx.st.cross && JSON.stringify(ctx.st.cross) === JSON.stringify(obj) ? NOTE_OFF : NOTE_ON);
    }, h => {
      if (h.classList.contains('ld-hitl')) { ctx.toggleCross({ [c.serField]:c.series[+h.dataset.l].key }); return; }
      ctx.toggleCross({ [c.catField]:data[+h.dataset.c].ct.key, [c.serField]:c.series[+h.dataset.s].key });
    });
  }

  /* Columnas de un solo valor por categoría (con niveles y opción de scroll horizontal) */
  function chartColumns(c, ctx, el) {
    const cats = c.data(ctx);
    const W = c.scrollW ? Math.max(c.minW || 0, cats.length * c.scrollW) : (c.W || 1500);
    const L = 40, R = W - 12, T = 24, B = c.H || 220, slot = (R - L) / Math.max(cats.length, 1), bw = slot * (c.barRatio || 0.8);
    const maxV = c.maxV || Math.max(0.001, ...cats.map(d => d.v)) * 1.08, k = (B - T) / maxV;
    const xAt = i => L + slot * i + slot / 2;
    let s = '';
    (c.ticks || []).forEach(v => {
      const y = B - v * k;
      s += `<line x1="${L}" x2="${R}" y1="${S(y)}" y2="${S(y)}" stroke="#e6e6e6" stroke-dasharray="2,3"/><text x="${L - 6}" y="${S(y + 3)}" font-size="9.5" text-anchor="end" fill="#605e5c">${F[c.tickF || 'n1'](v)}</text>`;
    });
    cats.forEach((d, i) => {
      const h = d.v * k, y = B - h, x = xAt(i) - bw / 2;
      const on = !ctx.st.cross || ctx.st.cross[c.catField] === undefined || ctx.st.cross[c.catField] === d.field;
      const op = on ? 1 : 0.22;
      s += `<rect x="${S(x)}" y="${S(y)}" width="${S(bw)}" height="${S(h)}" fill="${c.color || '#0303b0'}" opacity="${op}"/>`;
      const showLbl = c.labelEvery ? d.lbl : true;
      if (showLbl && d.v) s += `<text x="${S(xAt(i))}" y="${S(y - 5)}" font-size="${c.valSize || 12}" text-anchor="middle" fill="#3a3a3a" opacity="${op}" stroke="#fff" stroke-width="2.5" paint-order="stroke" pointer-events="none">${F.n2(d.v)}</text>`;
      if (c.rotate) s += `<text transform="translate(${S(xAt(i) + 3)},${B + 8}) rotate(-90)" font-size="9.5" text-anchor="end" fill="#252423">${esc(d.label)}</text>`;
      else s += `<text x="${S(xAt(i))}" y="${B + 13}" font-size="${c.catSize || 9.5}" text-anchor="middle" fill="#252423">${esc(d.label)}</text>`;
      s += `<rect class="lb-hit" data-i="${i}" x="${S(xAt(i) - slot / 2)}" y="${T - 12}" width="${S(slot)}" height="${B - T + 12 + (c.rotate ? 60 : 16)}" fill="transparent"/>`;
    });
    let yy = B + (c.rotate ? 80 : 30);
    if (c.levels && cats.length) { s += axisLevels(cats, xAt, slot, yy, c.levels, 14); yy += 14 * c.levels.length; }
    s += `<text x="${S((L + R) / 2)}" y="${yy + 2}" font-size="11" font-weight="700" text-anchor="middle" fill="#252423">${esc(c.xTitle || '')}</text>`;
    const H = yy + 10;
    if (c.scrollW) {
      el.innerHTML = `<div class="ld-hscroll"><div style="width:${W}px"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="width:${W}px">${s}</svg></div></div>`;
    } else el.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${s}</svg>`;
    wireChart(el, (e, h) => {
      const d = cats[+h.dataset.i];
      lbTipShow(e, d.tip || [[c.xTitle, d.label], [c.valTitle, F.n2(d.v)]],
        ctx.st.cross && ctx.st.cross[c.catField] === d.field ? NOTE_OFF : NOTE_ON);
    }, h => ctx.toggleCross({ [c.catField]:cats[+h.dataset.i].field }));
  }

  /* Combo: columnas con color condicional + línea con su propio eje */
  function chartCombo(c, ctx, el) {
    const cats = c.data(ctx);
    const W = c.W || 1500, L = 44, R = W - 42, T = 30, B = c.H || 280, slot = (R - L) / Math.max(cats.length, 1), bw = slot * 0.8;
    const xAt = i => L + slot * i + slot / 2;
    const yB = v => B - (v / 100) * (B - T), lineMax = 25, lineMin = 5, yL = v => B - ((v - lineMin) / (lineMax - lineMin)) * (B - T);
    let s = '';
    [0, 50, 100].forEach(v => {
      s += `<line x1="${L}" x2="${R}" y1="${S(yB(v))}" y2="${S(yB(v))}" stroke="#e6e6e6" stroke-dasharray="2,3"/><text x="${L - 8}" y="${S(yB(v) + 3)}" font-size="10" text-anchor="end" fill="#605e5c">${v}%</text>`;
    });
    [10, 20].forEach(v => { s += `<text x="${R + 10}" y="${S(yL(v) + 3)}" font-size="10" fill="#605e5c">${v}</text>`; });
    const isOn = d => !ctx.st.cross || ctx.st.cross[c.catField] === undefined || ctx.st.cross[c.catField] === d.field;
    cats.forEach((d, i) => {
      const op = isOn(d) ? 1 : 0.22, x = xAt(i) - bw / 2;
      if (d.bar != null) {
        s += `<rect x="${S(x)}" y="${S(yB(d.bar))}" width="${S(bw)}" height="${S(B - yB(d.bar))}" fill="${c.cf(d.bar)}" opacity="${op}"/>`;
        s += `<text x="${S(xAt(i))}" y="${S(yB(d.bar) - 6)}" font-size="12.5" text-anchor="middle" fill="#3a3a3a" opacity="${op}" pointer-events="none">${F.pct(d.bar)}</text>`;
      }
      s += `<text x="${S(xAt(i))}" y="${B + 14}" font-size="10" text-anchor="middle" fill="#252423">${esc(d.label)}</text>`;
      s += `<rect class="lb-hit" data-i="${i}" x="${S(xAt(i) - slot / 2)}" y="${T - 14}" width="${S(slot)}" height="${B - T + 32}" fill="transparent"/>`;
    });
    const pts = cats.map((d, i) => ({ x:xAt(i), y:yL(d.line), d })).filter(p => p.d.line != null);
    s += `<polyline points="${pts.map(p => S(p.x) + ',' + S(p.y)).join(' ')}" fill="none" stroke="#a992dc" stroke-width="3" stroke-linejoin="round" pointer-events="none"/>`;
    pts.forEach(p => {
      const op = isOn(p.d) ? 1 : 0.35, y = Math.min(p.y + 16, B - 6);
      s += `<rect x="${S(p.x - 17)}" y="${S(y - 13)}" width="34" height="18" rx="4" fill="#f4f4f4" opacity="${0.92 * op}" pointer-events="none"/><text x="${S(p.x)}" y="${S(y + 1)}" font-size="12.5" text-anchor="middle" fill="#3a3a3a" opacity="${op}" pointer-events="none">${F.n1(p.d.line)}</text>`;
    });
    let yy = B + 30;
    if (c.levels) { s += axisLevels(cats, xAt, slot, yy, c.levels, 16); yy += 16 * c.levels.length; }
    s += `<text x="${S((L + R) / 2)}" y="${yy + 2}" font-size="12" font-weight="700" text-anchor="middle" fill="#252423">${esc(c.xTitle || '')}</text>`;
    s = legend((L + R) / 2, 16, c.legend) + s;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${yy + 10}">${s}</svg>`;
    wireChart(el, (e, h) => {
      const d = cats[+h.dataset.i];
      lbTipShow(e, d.tip, ctx.st.cross && ctx.st.cross[c.catField] === d.field ? NOTE_OFF : NOTE_ON);
    }, h => ctx.toggleCross({ [c.catField]:cats[+h.dataset.i].field }));
  }

  /* Barras horizontales pareadas con scroll vertical */
  function chartHPair(c, ctx, el) {
    const data = c.data(ctx);
    const rowH = 24, W = c.W || 620, L = 92, R = W - 40, H = Math.max(280, data.length * rowH + 44);
    const maxV = Math.max(1, ...data.flatMap(d => [d.a, d.b])), k = (R - L) / (maxV * 1.04);
    let s = `<line x1="${L}" x2="${L}" y1="6" y2="${H - 26}" stroke="#c8c8c8"/>`;
    data.forEach((d, i) => {
      const y = 8 + i * rowH, on = !ctx.st.cross || ctx.st.cross[c.catField] === undefined || ctx.st.cross[c.catField] === d.field, op = on ? 1 : 0.22;
      s += `<text x="${L - 6}" y="${y + 13}" font-size="10" text-anchor="end" fill="#252423" opacity="${op}">${esc(d.label)}</text>`;
      [[d.a, c.colors[0], y + 2], [d.b, c.colors[1], y + 11]].forEach(([v, col, by]) => {
        if (!v) return;
        s += `<rect x="${L}" y="${by}" width="${S(v * k)}" height="8" fill="${col}" opacity="${op}"/><text x="${S(L + v * k + 4)}" y="${by + 8}" font-size="9.5" fill="#3a3a3a" opacity="${op}">${v}</text>`;
      });
      s += `<rect class="lb-hit" data-i="${i}" x="0" y="${y}" width="${W}" height="${rowH}" fill="transparent"/>`;
    });
    [0, 10, 20, 30, 40].forEach(v => { if (v <= maxV * 1.04) s += `<text x="${S(L + v * k)}" y="${H - 8}" font-size="9.5" text-anchor="middle" fill="#605e5c">${v}</text>`; });
    el.innerHTML = `<div class="ld-legend-top"><svg viewBox="0 0 ${W} 20">${legend(W / 2, 14, c.legend)}</svg></div>
      <div class="ld-vscroll" style="height:${c.boxH || 330}px"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;">${s}</svg></div>`;
    wireChart(el, (e, h) => {
      const d = data[+h.dataset.i];
      lbTipShow(e, [[c.catTitle, d.label], [c.legend[0][0], d.a], [c.legend[1][0], d.b]], ctx.st.cross && ctx.st.cross[c.catField] === d.field ? NOTE_OFF : NOTE_ON);
    }, h => ctx.toggleCross({ [c.catField]:data[+h.dataset.i].field }));
  }

  /* ---------------- Visuales ---------------- */
  const RENDER = {
    table:renderTable, tree:renderTree, pivot:renderPivot,
    stack:chartStack, columns:chartColumns, combo:chartCombo, hpair:chartHPair,
    kpi(b, ctx, el) {
      el.innerHTML = b.items(ctx).map(([k, v, tip]) => `<div class="lb-kpi-row hotspot" ${tipAttrs(k, tip)}><span class="k">${esc(k)}:</span><span class="v">${esc(v)}</span></div>`).join('');
      bindAllHotspots(el);
    },
    stamp(b, ctx, el) { el.textContent = b.value(ctx); },
    nav(b, ctx, el) {
      el.innerHTML = b.items.map((it, i) => `<button type="button" class="lb-nav-btn hotspot${it.active ? ' active' : ''}" data-i="${i}" ${tipAttrs(it.label, it.active ? 'Estás en esta página.' : it.uc ? 'Esta sección todavía está en construcción.' : 'Salta a la página ' + it.label + ' del tablero.')}>${esc(it.label)}</button>`).join('');
      bindAllHotspots(el);
      el.onclick = e => {
        const x = e.target.closest('.lb-nav-btn');
        if (!x) return;
        e.stopPropagation();
        const it = b.items[+x.dataset.i];
        if (it.uc) LD.ucShow(it.label);
        else if (it.go) ctx.goTo(it.go);
      };
    },
    toggle(b, ctx, el) {
      const cur = ctx.st.extra[b.key] || b.options[0];
      el.innerHTML = b.options.map(o => `<button type="button" class="ld-tog${o === cur ? ' on' : ''}" data-o="${esc(o)}">${esc(o)}</button>`).join('');
      el.onclick = e => {
        const x = e.target.closest('.ld-tog');
        if (!x) return;
        e.stopPropagation();
        ctx.st.extra[b.key] = x.dataset.o;
        ctx.rerender();
      };
    },
    none() {},
    uc(b, ctx, el) {
      el.innerHTML = `<div class="uc-card ld-ucinline"><img src="${IMG_UC}" alt="En construcción"><h3>${esc(b.title || 'En construcción')}</h3><p>Esta sección estará disponible próximamente.</p></div>`;
    }
  };

  /* ---------------- Estructura de la página ---------------- */
  function buildLayout(items, list) {
    return items.map(it => {
      const size = it.w ? `flex:0 0 ${it.w}px;` : it.flex ? `flex:${it.flex};min-width:0;` : '';
      if (it.row) return `<div class="lb-row ld-row" style="${size}">${buildLayout(it.row, list)}</div>`;
      if (it.col) return `<div class="ld-col" style="${size}">${buildLayout(it.col, list)}</div>`;
      const i = list.length;
      list.push(it);
      const isChart = ['stack', 'columns', 'combo', 'hpair'].includes(it.type);
      const cls = it.type === 'table' || it.type === 'tree' || it.type === 'pivot' ? 'lb-tablebox' :
        isChart ? (it.box === false ? 'ld-chartplain' : 'lb-chartbox') :
        it.type === 'kpi' ? 'lb-kpi-card ld-kpi' : it.type === 'nav' ? 'lb-nav ld-nav' :
        it.type === 'toggle' ? 'ld-toggle' : it.type === 'stamp' ? 'ld-stamp' : 'ld-other';
      const body = `<div class="${cls}" data-ld="${i}" style="${it.h ? `max-height:${it.h}px;` : ''}${it.minH ? `min-height:${it.minH}px;` : ''}"></div>`;
      const framed = it.round ? `<div class="ld-round">${body}</div>` : body;
      const bar = it.title ? `<div class="lb-bar hotspot${it.barCls ? ' ' + it.barCls : ''}" ${tipAttrs(it.title, it.tip)}>${esc(it.title)}</div>` : '';
      const sub = it.sub ? `<div class="ld-sub">${esc(it.sub)}</div>` : '';
      return `<div class="lb-block ld-leaf${it.barOnly ? ' ld-baronly' : ''}" style="${size}">${bar}${sub}${it.barOnly ? '' : framed}</div>`;
    }).join('');
  }

  /* Monta una página dentro de host. board = {goTo} o null en el tablero principal */
  function mountPage(host, page, goTo, stHolder) {
    const st = stHolder || newState(page);
    page._st = st;
    initFilters(page, st);
    const list = [];
    const corteHtml = page.corte
      ? `<div class="lb-corte hotspot ${page.corteStacked ? 'ld-corte-stack' : ''}" ${tipAttrs(page.corteLabel || 'Fecha de corte', 'Fecha de la última actualización de los datos de esta página.')}><b>${esc(page.corteLabel || 'Fecha de corte:')}</b><span class="ld-corte"></span></div>`
      : '';
    host.innerHTML = `<div class="lb-scroll">
      <div class="lb-head">
        <img class="lb-cemex" src="${LOGO_CEMEX}" alt="CEMEX Desarrollo de Operaciones">
        <div class="lb-title-box">
          <h2 class="lb-title hotspot" ${tipAttrs(page.title, page.tip)}>${esc(page.title)}</h2>
          ${corteHtml}
        </div>
        <img class="lb-logo" src="${LOGO_LOCO}" alt="Locomboo">
      </div>
      ${st.filters.length ? '<div class="ld-filters"></div>' : ''}
      ${buildLayout(page.blocks, list)}
    </div>`;
    const render = () => {
      const c = ctxOf(st, render, goTo);
      list.forEach((b, i) => {
        const el = host.querySelector(`[data-ld="${i}"]`);
        if (el) RENDER[b.type](b, c, el);
      });
      const fb = host.querySelector('.ld-filters');
      if (fb) updateFilterLabels(fb, page, st);
      const co = host.querySelector('.ld-corte');
      if (co && page.corte) co.textContent = typeof page.corte === 'function' ? page.corte(c) : page.corte;
    };
    const fb = host.querySelector('.ld-filters');
    if (fb) renderFilters(fb, page, st, render);
    render();
    bindAllHotspots(host);
    return { render, st };
  }

  /* ---------------- Ventana "En construcción" ---------------- */
  LD.ucShow = function (label) {
    let m = document.getElementById('ldUc');
    if (!m) {
      m = document.createElement('div');
      m.id = 'ldUc';
      m.innerHTML = `<div class="ld-uc-card" role="dialog" aria-modal="true" aria-label="En construcción">
        <button type="button" class="ld-uc-x" aria-label="Cerrar">×</button>
        <img src="${IMG_UC}" alt="En construcción">
        <h3 id="ldUcT"></h3>
        <p>Esta sección todavía no está habilitada. Estará disponible próximamente.</p>
      </div>`;
      document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('.ld-uc-x')) m.classList.remove('show'); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') m.classList.remove('show'); });
    }
    m.querySelector('#ldUcT').textContent = label ? `${label}: en construcción` : 'En construcción';
    hideTooltip(); lbTipHide();
    m.classList.add('show');
  };

  /* ---------------- Tablero con menú lateral (o sin él) ---------------- */
  let current = null;
  LD.fit = function () {
    const stage = document.getElementById('ldStage'), wrap = document.getElementById('ldWrap');
    if (!stage || stage.style.display === 'none') return;
    wrap.style.transform = 'none';
    const nw = wrap.offsetWidth, nh = wrap.offsetHeight;
    const cs = getComputedStyle(document.body);
    const avail = document.body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const scale = Math.min(1, avail / nw);
    wrap.style.transform = `scale(${scale})`;
    stage.style.width = (nw * scale) + 'px';
    stage.style.height = (nh * scale) + 'px';
  };
  let fitTimer;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(LD.fit, 100); });

  LD.open = function (boardId) {
    const def = LD.boards[boardId]();
    const wrap = document.getElementById('ldWrap');
    const visible = def.pages.filter(p => !p.hidden);
    wrap.innerHTML = `${def.sidebar === false ? '' : `<div class="pages-sidebar" id="ldSidebar">
        <div class="pages-sidebar-head"><span class="pages-title">Páginas</span>
          <button type="button" class="pages-toggle hotspot" id="ldSideBtn" data-tip-title="Contraer/Expandir Páginas" data-tip-text="Muestra u oculta el panel de Páginas.">«</button>
        </div><nav class="pages-nav" id="ldSideNav"></nav></div>`}
      <div class="ld-content">${def.pages.map(p => `<section class="ld-screen" data-page="${p.id}"></section>`).join('')}</div>`;
    const mounted = {}, states = {};
    current = { def, mounted };
    const goTo = (id) => {
      const page = def.pages.find(p => p.id === id);
      wrap.querySelectorAll('.ld-screen').forEach(s => s.classList.toggle('active', s.dataset.page === id));
      const host = wrap.querySelector(`.ld-screen[data-page="${id}"]`);
      if (!mounted[id]) {
        const holder = page.stateOf ? states[page.stateOf] : null;
        if (holder && !holder._shared) holder._shared = true;
        const m = mountPage(host, page, goTo, holder || undefined);
        mounted[id] = m;
        states[id] = m.st;
      } else mounted[id].render();
      const sc = host.querySelector('.lb-scroll');
      if (sc) sc.scrollTop = 0;
      const nav = document.getElementById('ldSideNav');
      if (nav) {
        const activeId = page.hidden ? page.stateOf : id;
        nav.innerHTML = visible.map(p => `<button type="button" class="pages-nav-item hotspot${p.id === activeId ? ' active' : ''}" data-ldgo="${p.id}" data-tip-title="${esc(p.label)}" data-tip-text="Ir a la página ${esc(p.label)}.">${esc(p.label)}</button>`).join('');
        bindAllHotspots(nav);
      }
      hideTooltip(); lbTipHide(); closeMenus();
      LD.fit();
    };
    const nav = document.getElementById('ldSideNav');
    if (nav) nav.addEventListener('click', e => {
      const b = e.target.closest('[data-ldgo]');
      if (b) { e.stopPropagation(); goTo(b.dataset.ldgo); }
    });
    const toggle = document.getElementById('ldSideBtn');
    if (toggle) {
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        const sb = document.getElementById('ldSidebar');
        const col = sb.classList.toggle('collapsed');
        toggle.textContent = col ? '»' : '«';
        setTimeout(LD.fit, 200);
      });
      bindAllHotspots(wrap.querySelector('.pages-sidebar-head'));
    }
    goTo(def.pages[0].id);
    current.goTo = goTo;
    return current;
  };
  LD.current = () => current;

  /* Páginas nuevas dentro del tablero principal (#boardContent): se montan al primer uso */
  const mainMounted = {};
  LD.mountMain = function (id) {
    const make = LD.main[id];
    if (!make) return;
    const host = document.getElementById(id);
    if (!host) return;
    if (!mainMounted[id]) mainMounted[id] = mountPage(host, make(), null);
    else mainMounted[id].render();
  };
  LD.mainPage = id => mainMounted[id];
})();
