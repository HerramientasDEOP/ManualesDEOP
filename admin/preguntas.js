/* =========================================================================
   Panel admin: gestión de preguntas y de preguntas frecuentes.
   Se carga después del script principal, que expone window.AdminApp
   ({ api, ejecutar, esc, fFecha }). Los datos solo se piden al abrir la pestaña.
   ========================================================================= */
(function () {
  'use strict';
  const App = window.AdminApp;
  const $ = id => document.getElementById(id);
  const { api, esc, fFecha } = App;

  const ESTADOS = { abierta:'Recibida', en_proceso:'En revisión', respondida:'Respondida', cerrada:'Cerrada' };
  const CATEGORIAS = { uso:'Cómo se usa', error:'Algo no funciona', dato:'Entender un dato', sugerencia:'Sugerencia' };
  const CATALOGO = {
    Eureka:['Tiempo real', 'Histórico'], Orion:['App', 'Tablero'],
    Locomboo:['App', 'Tablero', 'Cemento - Cemento', 'Cemento - Caracolito', 'Cemento - Portería', 'Cemento - Nómina'],
    POLARIS:['Acceso y cuenta', 'Portal']
  };
  const ruta = p => [p.herramienta, p.seccion, p.pagina].filter(Boolean).join(' › ');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  let filtroEstado = 'pendientes', actual = null, datos = null, faqs = [], cargado = false, faqEdit = null, timerQ = null;

  /* ---------------- Pestañas ---------------- */
  function verTab(tab) {
    document.querySelectorAll('[data-ad-tab]').forEach(b => {
      const on = b.dataset.adTab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('adMetricas').hidden = tab !== 'metricas';
    $('adPreguntas').hidden = tab !== 'preguntas';
    $('adFaqs').hidden = tab !== 'faqs';
    if (tab === 'preguntas') App.ejecutar(cargarLista);
    if (tab === 'faqs') App.ejecutar(cargarFaqs);
  }
  document.querySelectorAll('[data-ad-tab]').forEach(b => b.addEventListener('click', () => verTab(b.dataset.adTab)));

  /* ---------------- Bandeja ---------------- */
  function cuerpoFiltros() {
    return {
      estado:['abierta', 'en_proceso', 'respondida', 'cerrada'].includes(filtroEstado) ? filtroEstado : undefined,
      herramienta:$('adPHerr').value || undefined,
      q:$('adPBuscar').value.trim() || undefined
    };
  }
  function cargarLista() {
    return api('/admin/preguntas', cuerpoFiltros()).then(d => {
      datos = d; cargado = true;
      if (!faqs.length) api('/admin/faqs').then(r => { faqs = r.faqs || []; }, () => {});
      pintarKpis(); pintarLista();
    });
  }
  function pintarKpis() {
    const e = datos.por_estado || {};
    const califs = datos.util_si + datos.util_no;
    const items = [
      ['Recibidas', e.abierta || 0, 'Sin atender todavía'],
      ['En revisión', e.en_proceso || 0, 'El usuario respondió o se está revisando'],
      ['Respondidas', e.respondida || 0, 'Esperando que el usuario confirme'],
      ['Cerradas', e.cerrada || 0, 'Dudas resueltas'],
      ['Primera respuesta', datos.horas_primera_respuesta == null ? '—' : `${String(datos.horas_primera_respuesta).replace('.', ',')} h`, 'Tiempo promedio'],
      ['Resolvió la duda', califs ? `${Math.round(datos.util_si * 100 / califs)}%` : '—', `${califs} ${califs === 1 ? 'calificación' : 'calificaciones'}`]
    ];
    $('adPKpis').innerHTML = items.map(([k, v, s]) => `<div class="ad-panel ap-kpi"><span>${esc(k)}</span><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`).join('');
    const pend = (e.abierta || 0) + (e.en_proceso || 0);
    const b = $('adPBadge');
    b.textContent = pend; b.hidden = !pend;
  }
  function pintarLista() {
    let lista = datos.preguntas || [];
    if (filtroEstado === 'pendientes') lista = lista.filter(p => p.estado === 'abierta' || p.estado === 'en_proceso');
    $('adPCuenta').textContent = `${lista.length} ${lista.length === 1 ? 'pregunta' : 'preguntas'}`;
    $('adPLista').innerHTML = lista.length ? lista.map(p => `
      <button type="button" class="ap-item${p.no_leido ? ' nuevo' : ''}${actual && actual.pregunta.id === p.id ? ' on' : ''}" data-id="${p.id}">
        <span class="ap-top"><span class="ap-estado ${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span><small>${esc(fFecha(p.actualizada_en))}</small></span>
        <strong>${esc(p.titulo)}</strong>
        <small>#${p.id} · ${esc(ruta(p))}</small>
        <small>${esc(p.nombre)}</small>
      </button>`).join('') : '<div class="ad-empty">No hay preguntas con estos filtros.</div>';
  }
  $('adPLista').addEventListener('click', e => {
    const b = e.target.closest('[data-id]');
    if (b) App.ejecutar(() => abrir(Number(b.dataset.id)));
  });
  function abrir(id) {
    return api('/admin/pregunta', { id }).then(d => {
      actual = d;
      const it = datos && (datos.preguntas || []).find(p => p.id === id);
      if (it) it.no_leido = 0;
      pintarLista(); pintarDetalle();
    });
  }
  /* Sugerencias para responder más rápido, a partir de las preguntas frecuentes */
  function sugerencias(p) {
    const toks = norm(p.titulo + ' ' + p.detalle).split(/[^a-z0-9ñ]+/).filter(t => t.length > 3);
    return faqs.filter(f => f.activa).map(f => {
      const t = norm(f.pregunta);
      let n = 0;
      toks.forEach(x => { if (t.includes(x)) n++; });
      if (n && f.herramienta === p.herramienta) n += 1;
      return { f, n };
    }).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 3).map(x => x.f);
  }
  function pintarDetalle() {
    const { pregunta:p, mensajes } = actual;
    const sug = sugerencias(p);
    const msg = (cls, autor, cont, cuando) => `<div class="ap-msg ${cls}"><span>${esc(autor)} · ${esc(fFecha(cuando))}</span><div>${esc(cont)}</div></div>`;
    $('adPDetalle').innerHTML = `
      <div class="ap-det-cab">
        <div><h2 class="ad-card-title">#${p.id} · ${esc(p.titulo)}</h2>
          <p class="ad-card-sub">${esc(p.nombre)} · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p>
          <p class="ap-chips"><b>${esc(ruta(p))}</b><span>${esc(CATEGORIAS[p.categoria] || p.categoria)}</span>${p.calificacion === 1 ? '<span class="si">Le resolvió la duda</span>' : p.calificacion === -1 ? '<span class="no">No le resolvió la duda</span>' : ''}${p.faq_id ? '<span>Publicada como frecuente</span>' : ''}</p></div>
        <label class="ad-filter-group"><span>Estado</span><select class="ad-text" id="adPEstado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}"${k === p.estado ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <div class="ap-hilo">
        ${msg('usuario', p.nombre, p.titulo + (p.detalle ? '\n\n' + p.detalle : ''), p.creada_en)}
        ${mensajes.map(m => m.autor_tipo === 'sistema' ? `<p class="ap-sis">${esc(m.contenido)}</p>` : msg(m.interno ? 'nota' : (m.autor_tipo === 'usuario' ? 'usuario' : 'agente'), (m.interno ? 'Nota interna · ' : '') + (m.autor_nombre || ''), m.contenido, m.creado_en)).join('')}
      </div>
      ${sug.length ? `<div class="ap-sug"><span>Preguntas frecuentes parecidas (clic para usar la respuesta):</span>${sug.map(f => `<button type="button" class="ap-sug-b" data-usar="${f.id}">${esc(f.pregunta)}</button>`).join('')}</div>` : ''}
      <form id="adPResp" class="ap-resp">
        <textarea class="ad-text" id="adPTexto" rows="4" maxlength="4000" placeholder="Escribe la respuesta para ${esc(p.nombre)}"></textarea>
        <p class="ad-msg" id="adPMsg" role="alert" hidden></p>
        <div class="ap-acc">
          <label class="ap-check"><input type="checkbox" id="adPInterno"> Nota interna (el usuario no la ve)</label>
          <button type="button" class="ad-btn ad-btn-sec ad-btn-sm" id="adPPublicar">Publicar como frecuente</button>
          <button type="submit" class="ad-btn ad-btn-sm" id="adPEnviar">Enviar respuesta</button>
        </div>
      </form>`;
    const hilo = $('adPDetalle').querySelector('.ap-hilo');
    hilo.scrollTop = hilo.scrollHeight;
    $('adPInterno').addEventListener('change', e => { $('adPEnviar').textContent = e.target.checked ? 'Guardar nota' : 'Enviar respuesta'; });
    $('adPEstado').addEventListener('change', e => App.ejecutar(() => api('/admin/pregunta-estado', { id:p.id, estado:e.target.value }).then(() => recargar(p.id))));
    $('adPResp').addEventListener('submit', e => {
      e.preventDefault();
      const contenido = $('adPTexto').value.trim();
      if (!contenido) { $('adPMsg').textContent = 'Escribe la respuesta.'; $('adPMsg').hidden = false; return; }
      App.ejecutar(() => api('/admin/pregunta-responder', { id:p.id, contenido, interno:$('adPInterno').checked }).then(() => recargar(p.id)));
    });
    $('adPPublicar').addEventListener('click', () => {
      const ultima = [...mensajes].reverse().find(m => m.autor_tipo === 'agente' && !m.interno);
      abrirEditor({ herramienta:p.herramienta, seccion:p.seccion, pregunta:p.titulo, respuesta:$('adPTexto').value.trim() || (ultima ? ultima.contenido : ''), pregunta_origen_id:p.id, activa:1 });
    });
    $('adPDetalle').querySelectorAll('[data-usar]').forEach(b => b.addEventListener('click', () => {
      const f = faqs.find(x => x.id === Number(b.dataset.usar));
      if (f) { $('adPTexto').value = f.respuesta; $('adPTexto').focus(); }
    }));
  }
  function recargar(id) { return cargarLista().then(() => abrir(id)); }

  $('adPEstados').addEventListener('click', e => {
    const b = e.target.closest('[data-estado]');
    if (!b) return;
    filtroEstado = b.dataset.estado;
    $('adPEstados').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    App.ejecutar(cargarLista);
  });
  $('adPHerr').addEventListener('change', () => App.ejecutar(cargarLista));
  $('adPBuscar').addEventListener('input', () => { clearTimeout(timerQ); timerQ = setTimeout(() => App.ejecutar(cargarLista), 350); });

  /* ---------------- Preguntas frecuentes ---------------- */
  function cargarFaqs() {
    return api('/admin/faqs').then(d => { faqs = d.faqs || []; pintarFaqs(); });
  }
  function pintarFaqs() {
    const h = $('adFHerr').value, q = norm($('adFBuscar').value);
    const lista = faqs.filter(f => (!h || f.herramienta === h) && (!q || norm(f.pregunta + ' ' + f.respuesta).includes(q)));
    $('adFCuenta').textContent = `${lista.length} de ${faqs.length}`;
    $('adFTabla').innerHTML = lista.map(f => `<tr>
        <td><strong>${esc(f.pregunta)}</strong></td>
        <td>${esc([f.herramienta, f.seccion].filter(Boolean).join(' › '))}</td>
        <td class="num">${f.util_si} / ${f.util_no}</td>
        <td>${f.activa ? 'Publicada' : 'Oculta'}</td>
        <td><button type="button" class="ad-btn ad-btn-sec ad-btn-sm" data-editar="${f.id}">Editar</button></td>
      </tr>`).join('');
    $('adFVacio').hidden = !!lista.length;
  }
  $('adFHerr').addEventListener('change', pintarFaqs);
  $('adFBuscar').addEventListener('input', pintarFaqs);
  $('adFNueva').addEventListener('click', () => abrirEditor({ herramienta:'Eureka', seccion:null, pregunta:'', respuesta:'', activa:1 }));
  $('adFTabla').addEventListener('click', e => {
    const b = e.target.closest('[data-editar]');
    if (b) abrirEditor(faqs.find(f => f.id === Number(b.dataset.editar)));
  });

  /* Editor de pregunta frecuente */
  function pintarSecciones(sel) {
    const h = $('apEdHerr').value;
    $('apEdSec').innerHTML = `<option value="">General</option>` + (CATALOGO[h] || []).map(s => `<option${s === sel ? ' selected' : ''}>${esc(s)}</option>`).join('');
  }
  function abrirEditor(f) {
    faqEdit = f;
    $('apEdTitulo').textContent = f.id ? 'Editar pregunta frecuente' : 'Nueva pregunta frecuente';
    $('apEdHerr').innerHTML = Object.keys(CATALOGO).map(h => `<option${h === f.herramienta ? ' selected' : ''}>${esc(h)}</option>`).join('');
    pintarSecciones(f.seccion);
    $('apEdPreg').value = f.pregunta || '';
    $('apEdResp').value = f.respuesta || '';
    $('apEdActiva').checked = f.activa !== 0;
    $('apEdMsg').hidden = true;
    $('apEditor').hidden = false; $('apEditorBg').hidden = false;
    $('apEdPreg').focus();
  }
  function cerrarEditor() { $('apEditor').hidden = true; $('apEditorBg').hidden = true; }
  $('apEdHerr').addEventListener('change', () => pintarSecciones(null));
  $('apEdCerrar').addEventListener('click', cerrarEditor);
  $('apEdCancelar').addEventListener('click', cerrarEditor);
  $('apEditorBg').addEventListener('click', cerrarEditor);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('apEditor').hidden) cerrarEditor(); });
  $('apEdForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = faqEdit;
    const cuerpo = {
      id:f.id, herramienta:$('apEdHerr').value, seccion:$('apEdSec').value || null, pregunta:$('apEdPreg').value.trim(),
      respuesta:$('apEdResp').value.trim(), activa:$('apEdActiva').checked, pregunta_origen_id:f.pregunta_origen_id
    };
    if (cuerpo.pregunta.length < 5 || cuerpo.respuesta.length < 5) { $('apEdMsg').textContent = 'Escribe la pregunta y la respuesta.'; $('apEdMsg').hidden = false; return; }
    api('/admin/faq-guardar', cuerpo).then(() => {
      cerrarEditor();
      const origen = f.pregunta_origen_id;
      return cargarFaqs().then(() => (origen && actual ? abrir(origen) : null));
    }, err => {
      $('apEdMsg').textContent = (err && err.mensaje) || 'No se pudo guardar. Intenta de nuevo.';
      $('apEdMsg').hidden = false;
    });
  });

  /* Contador de pendientes en la pestaña, al entrar al panel */
  App.alEntrar = () => { if (!cargado) cargarLista().catch(() => {}); };
})();
