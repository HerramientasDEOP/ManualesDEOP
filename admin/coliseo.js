/* =========================================================================
   Panel admin · El Coliseo: resultados en vivo, ranking acumulado y edición de retos.
   Usa window.AdminApp ({ api, ejecutar, esc }) del script principal del panel.
   ========================================================================= */
(function () {
  'use strict';
  const App = window.AdminApp;
  const $ = id => document.getElementById(id);
  const { api, esc } = App;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const ESTADOS = { abierto:'Abierto', cerrado:'Cerrado', proximo:'Próximo', pendiente:'Sin publicar' };
  const REFRESCO_MS = 30000;

  const col = ms => new Date(ms - 5 * 3600 * 1000);
  const fecha = ms => { if (!ms) return '—'; const d = col(ms); return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
  const inputFecha = ms => col(ms).toISOString().slice(0, 16);
  const num = n => Number(n || 0).toLocaleString('es-CO');
  function tiempo(ms){
    if (ms == null) return '—';
    const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, d = Math.floor(ms / 100) % 10;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}.${d}`;
  }

  let datos = null, sel = null, vista = 'reto', timer = null, editando = null;

  function cargar(retoId){
    return api('/admin/coliseo', { reto_id:retoId || sel || undefined }).then(d => {
      datos = d;
      sel = d.seleccionado;
      pintar();
    });
  }
  function pintar(){
    const pend = datos.retos.find(r => r.estado === 'abierto');
    $('acRetos').innerHTML = datos.retos.map(r => `<button type="button" data-reto="${r.id}" class="${vista === 'reto' && r.id === sel ? 'active' : ''}">
        ${esc(r.titulo)} <small>${esc(ESTADOS[r.estado])}${r.respondidos ? ` · ${r.respondidos}` : ''}</small></button>`).join('') +
      `<button type="button" data-vista="general" class="${vista === 'general' ? 'active' : ''}">Acumulado</button>`;
    const b = $('acBadge');
    b.textContent = pend ? pend.respondidos : 0;
    b.hidden = !pend || !pend.respondidos;
    if (vista === 'general') pintarGeneral(); else pintarReto();
  }

  function pintarReto(){
    const r = datos.retos.find(x => x.id === sel);
    if (!r){ $('acCuerpo').innerHTML = '<div class="ad-empty">No hay retos creados.</div>'; return; }
    const rk = datos.ranking, correctas = rk.filter(x => x.correcta);
    const prom = correctas.length ? correctas.reduce((s, x) => s + x.tiempo_ms, 0) / correctas.length : null;
    const kpi = (k, v, s) => `<div class="ad-panel ap-kpi"><span>${esc(k)}</span><strong>${esc(v)}</strong><small>${esc(s)}</small></div>`;
    const max = Math.max(1, ...datos.distribucion.map(x => x.n));
    $('acCuerpo').innerHTML = `
      <section class="ad-panel ac-reto">
        <div class="ac-reto-cab">
          <div>
            <p class="ac-meta"><span class="ac-estado ${r.estado}">${esc(ESTADOS[r.estado])}</span> ${esc(fecha(r.abre_ms))} → ${esc(fecha(r.cierra_ms))} (hora Colombia)</p>
            <h2 class="ad-card-title">${esc(r.titulo)}</h2>
            <p class="ac-pregunta">${r.pregunta ? esc(r.pregunta) : '<em>Sin pregunta todavía. Edítalo para cargarla y publicarlo.</em>'}</p>
          </div>
          <div class="ac-acc">
            <button type="button" class="ad-btn ad-btn-sec ad-btn-sm" data-editar="${r.id}">Editar reto</button>
            <button type="button" class="ad-btn ad-btn-sec ad-btn-sm" data-csv>Descargar CSV</button>
          </div>
        </div>
        ${datos.distribucion.length ? `<div class="ac-dist">${datos.distribucion.map(o => `<div class="ac-dist-f${o.correcta ? ' ok' : ''}">
            <span>${esc(o.texto)}${o.correcta ? ' <b>✓ correcta</b>' : ''}</span>
            <div class="ac-barra"><i style="width:${Math.round(o.n * 100 / max)}%"></i></div><strong>${o.n}</strong></div>`).join('')}</div>` : ''}
      </section>
      <section class="ap-kpis">
        ${kpi('Iniciaron', num(r.iniciados), 'Pulsaron Comenzar')}
        ${kpi('Respondieron', num(rk.length), `${num(datos.pendientes.length)} sin terminar`)}
        ${kpi('Aciertos', rk.length ? `${Math.round(correctas.length * 100 / rk.length)}%` : '—', `${num(correctas.length)} correctas`)}
        ${kpi('Tiempo promedio', prom == null ? '—' : tiempo(prom), 'De las correctas')}
        ${kpi('Más rápido', correctas.length ? tiempo(Math.min(...correctas.map(x => x.tiempo_ms))) : '—', correctas.length ? correctas.slice().sort((a, b) => a.tiempo_ms - b.tiempo_ms)[0].nombre : 'Respuesta correcta')}
      </section>
      <section class="ad-panel ad-table-card">
        <div class="ad-table-head"><h2 class="ad-card-title">Tabla de puntuaciones</h2>
          <span class="ad-count">${r.estado === 'abierto' ? 'En vivo: se actualiza cada 30 s' : `${num(rk.length)} participantes`}</span></div>
        <div class="ad-table-wrap ad-scroll">
          <table class="ad-table ac-tabla"><thead><tr><th class="ac-chk"><input type="checkbox" data-marcar-todos aria-label="Marcar a todos"></th><th class="num">Puesto</th><th>Participante</th><th>Respuesta</th><th class="num">Tiempo</th><th class="num">Puntos</th><th>Herramientas abiertas</th><th>Respondió</th></tr></thead>
          <tbody>${rk.map(x => `<tr><td class="ac-chk"><input type="checkbox" data-usuario="${x.usuario_id}" data-nombre="${esc(x.nombre)}" aria-label="Marcar a ${esc(x.nombre)}"></td><td class="num"><strong>${x.puesto <= 3 ? `<span class="ac-med m${x.puesto}"></span>` : ''}#${x.puesto}</strong></td>
            <td><strong>${esc(x.nombre)}</strong><br><small>${esc(x.email)}</small></td>
            <td><span class="${x.correcta ? 'ac-si' : 'ac-no'}">${x.correcta ? '✓' : '✗'} ${esc(x.respuesta)}</span></td>
            <td class="num">${esc(tiempo(x.tiempo_ms))}</td><td class="num"><strong>${num(x.puntos)}</strong></td>
            <td>${x.herramientas.length ? esc(x.herramientas.join(', ')) : '<small>Ninguna</small>'}</td>
            <td><small>${esc(fecha(x.respondido_ms))}</small></td></tr>`).join('')}</tbody></table>
        </div>
        ${rk.length ? '' : '<div class="ad-empty" style="margin-top:10px;">Todavía nadie ha respondido este reto.</div>'}
        ${datos.pendientes.length ? `<details class="ac-pend"><summary>${datos.pendientes.length} ${datos.pendientes.length === 1 ? 'persona empezó' : 'personas empezaron'} y no ha respondido</summary>
          <ul>${datos.pendientes.map(p => `<li><label><input type="checkbox" data-usuario="${p.usuario_id}" data-nombre="${esc(p.nombre)}"> <strong>${esc(p.nombre)}</strong> · ${esc(p.email)} · empezó ${esc(fecha(p.inicio_ms))}</label></li>`).join('')}</ul></details>` : ''}
        ${rk.length || datos.pendientes.length ? `<div class="ac-borrar">
          <span id="acSelCuenta">Marca a las personas cuyos intentos quieras borrar (por ejemplo, las pruebas).</span>
          <select class="ad-text" id="acBorrarAlcance" aria-label="Qué borrar"><option value="reto">Solo de ${esc(r.titulo)}</option><option value="todos">De todos los retos</option></select>
          <button type="button" class="ad-btn ad-btn-sm ac-btn-peligro" id="acBorrar" disabled>Borrar intentos</button>
        </div>` : ''}
      </section>
      <div id="acEditor"></div>`;
  }

  function pintarGeneral(){
    const retos = datos.retos.filter(r => r.respondidos > 0);
    const g = datos.general;
    $('acCuerpo').innerHTML = `<section class="ad-panel ad-table-card">
      <div class="ad-table-head"><h2 class="ad-card-title">Ranking acumulado</h2>
        <span class="ad-count">Suma de puntos de todos los retos con respuestas (incluye el reto abierto, por eso es provisional)</span>
        <button type="button" class="ad-btn ad-btn-sec ad-btn-sm" data-csv>Descargar CSV</button></div>
      <div class="ad-table-wrap ad-scroll"><table class="ad-table ac-tabla"><thead><tr><th class="num">Puesto</th><th>Participante</th>
        ${retos.map(r => `<th class="num">${esc(r.titulo)}</th>`).join('')}<th class="num">Aciertos</th><th class="num">Tiempo total</th><th class="num">Total</th></tr></thead>
        <tbody>${g.map(x => `<tr><td class="num"><strong>${x.puesto <= 3 ? `<span class="ac-med m${x.puesto}"></span>` : ''}#${x.puesto}</strong></td>
          <td><strong>${esc(x.nombre)}</strong><br><small>${esc(x.email)}</small></td>
          ${retos.map(r => `<td class="num">${x.por_reto[r.id] != null ? num(x.por_reto[r.id]) : '—'}</td>`).join('')}
          <td class="num">${x.correctas} / ${x.retos}</td><td class="num">${esc(tiempo(x.tiempo_ms))}</td><td class="num"><strong>${num(x.puntos)}</strong></td></tr>`).join('')}</tbody></table></div>
      ${g.length ? '' : '<div class="ad-empty" style="margin-top:10px;">Todavía no hay respuestas.</div>'}
    </section>`;
  }

  /* ---------------- Editor de retos ---------------- */
  function abrirEditor(r){
    editando = r;
    const conOpciones = !!(r.opciones && r.opciones.length);
    const ops = conOpciones ? r.opciones : ['', '', '', ''];
    const correcta = conOpciones ? r.correcta : -1;   // reto vacío: nada marcado hasta que el admin elija
    $('acEditor').innerHTML = `<section class="ad-panel ac-editor">
      <h2 class="ad-card-title">${r.id ? `Editar ${esc(r.titulo)}` : 'Nuevo reto'}</h2>
      ${r.iniciados ? '<p class="ac-aviso">Este reto ya tiene participantes: puedes corregir textos y la respuesta correcta (los puntos se recalculan solos), pero no cambiar cuántas opciones hay.</p>' : ''}
      <form id="acForm" novalidate>
        <div class="ac-fila3">
          <label>Título<input class="ad-text" id="acTitulo" maxlength="60" value="${esc(r.titulo)}"></label>
          <label>Abre (hora Colombia)<input class="ad-text" type="datetime-local" id="acAbre" value="${inputFecha(r.abre_ms)}"></label>
          <label>Cierra (hora Colombia)<input class="ad-text" type="datetime-local" id="acCierra" value="${inputFecha(r.cierra_ms)}"></label>
        </div>
        <label>Pregunta<textarea class="ad-text" id="acPregunta" rows="3" maxlength="600">${esc(r.pregunta || '')}</textarea></label>
        <fieldset class="ac-ops"><legend>Opciones · marca la correcta</legend>
          <div id="acOps">${ops.map((o, i) => filaOpcion(o, i, i === correcta)).join('')}</div>
          <button type="button" class="ad-btn ad-btn-sec ad-btn-sm" id="acMasOp">Agregar opción</button>
        </fieldset>
        <label class="ap-check"><input type="checkbox" id="acPublicado" ${r.publicado ? 'checked' : ''}> Publicado: se abre solo en la fecha de apertura</label>
        <p class="ad-msg" id="acMsg" role="alert" hidden></p>
        <div class="ap-acc"><button type="button" class="ad-btn ad-btn-sec ad-btn-sm" id="acCancelar">Cancelar</button><button type="submit" class="ad-btn ad-btn-sm">Guardar reto</button></div>
      </form></section>`;
    $('acEditor').scrollIntoView({ behavior:'smooth', block:'start' });
    $('acTitulo').focus();
  }
  const filaOpcion = (texto, i, correcta) => `<div class="ac-op"><input type="radio" name="acCorrecta" value="${i}" ${correcta ? 'checked' : ''} aria-label="Marcar como correcta">
      <input class="ad-text" maxlength="120" value="${esc(texto)}" placeholder="Opción ${'ABCDEF'[i]}"><button type="button" class="ad-close" data-quitar-op aria-label="Quitar opción">×</button></div>`;

  function guardarEditor(){
    const filas = [...$('acOps').querySelectorAll('.ac-op')];
    const marcada = filas.findIndex(f => f.querySelector('input[type=radio]').checked);
    const cuerpo = {
      id:editando.id, titulo:$('acTitulo').value.trim(), pregunta:$('acPregunta').value.trim(),
      opciones:filas.map(f => f.querySelector('.ad-text').value.trim()), correcta:marcada,
      abre:$('acAbre').value, cierra:$('acCierra').value, publicado:$('acPublicado').checked
    };
    const msg = $('acMsg');
    if (cuerpo.publicado && marcada < 0){ msg.textContent = 'Marca cuál es la respuesta correcta.'; msg.hidden = false; return; }
    api('/admin/coliseo-guardar', cuerpo).then(d => { editando = null; return cargar(d.id); },
      err => { msg.textContent = (err && err.mensaje) || 'No se pudo guardar. Intenta de nuevo.'; msg.hidden = false; });
  }

  /* ---------------- CSV (Excel en español: separador ; y BOM) ---------------- */
  function csv(){
    const celda = v => { let t = String(v == null ? '' : v); if (/^[=+\-@]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
    let filas, nombre;
    if (vista === 'general'){
      const retos = datos.retos.filter(r => r.respondidos > 0);
      filas = [['Puesto', 'Nombre', 'Correo', ...retos.map(r => r.titulo), 'Aciertos', 'Retos', 'Tiempo total (s)', 'Puntos']]
        .concat(datos.general.map(x => [x.puesto, x.nombre, x.email, ...retos.map(r => x.por_reto[r.id] != null ? x.por_reto[r.id] : ''), x.correctas, x.retos, Math.round(x.tiempo_ms / 100) / 10, x.puntos]));
      nombre = 'coliseo-acumulado.csv';
    } else {
      const r = datos.retos.find(x => x.id === sel);
      filas = [['Puesto', 'Nombre', 'Correo', 'Respuesta', 'Correcta', 'Tiempo (s)', 'Puntos', 'Herramientas abiertas', 'Respondió (Colombia)']]
        .concat(datos.ranking.map(x => [x.puesto, x.nombre, x.email, x.respuesta, x.correcta ? 'Sí' : 'No', Math.round(x.tiempo_ms / 100) / 10, x.puntos, x.herramientas.join(', '), fecha(x.respondido_ms)]));
      nombre = `coliseo-${r.titulo.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    }
    const texto = '﻿' + filas.map(f => f.map(celda).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type:'text/csv;charset=utf-8' }));
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------------- Eventos ---------------- */
  $('adColiseo').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.reto){ vista = 'reto'; editando = null; App.ejecutar(() => cargar(Number(b.dataset.reto))); }
    else if (b.dataset.vista === 'general'){ vista = 'general'; pintar(); }
    else if (b.id === 'acNuevo'){
      vista = 'reto';
      const ult = datos.retos[datos.retos.length - 1];
      const abre = ult ? ult.cierra_ms + 1 : Date.now();
      pintarReto();
      abrirEditor({ id:null, titulo:`Reto #${(ult ? ult.numero : 0) + 1}`, pregunta:'', opciones:[], correcta:-1, abre_ms:abre, cierra_ms:abre + 7 * 86400000 - 1, publicado:0 });
    }
    else if (b.dataset.editar) abrirEditor(datos.retos.find(r => r.id === Number(b.dataset.editar)));
    else if (b.hasAttribute('data-csv')) csv();
    else if (b.id === 'acBorrar') borrar();
    else if (b.id === 'acCancelar'){ editando = null; $('acEditor').innerHTML = ''; }
    else if (b.id === 'acMasOp'){
      const n = $('acOps').querySelectorAll('.ac-op').length;
      if (n < 6) $('acOps').insertAdjacentHTML('beforeend', filaOpcion('', n, false));
    }
    else if (b.hasAttribute('data-quitar-op')){
      if ($('acOps').querySelectorAll('.ac-op').length > 2) b.closest('.ac-op').remove();
      $('acOps').querySelectorAll('.ac-op').forEach((f, i) => { f.querySelector('input[type=radio]').value = i; f.querySelector('.ad-text').placeholder = 'Opción ' + 'ABCDEF'[i]; });
    }
  });
  function marcados(){ return [...$('adColiseo').querySelectorAll('input[data-usuario]:checked')]; }
  $('adColiseo').addEventListener('change', e => {
    if (e.target.matches('[data-marcar-todos]')) $('adColiseo').querySelectorAll('.ac-tabla input[data-usuario]').forEach(c => { c.checked = e.target.checked; });
    if (!e.target.matches('input[type=checkbox]') || !$('acBorrar')) return;
    const n = new Set(marcados().map(c => c.dataset.usuario)).size;
    $('acBorrar').disabled = !n;
    $('acSelCuenta').textContent = n ? `${n} ${n === 1 ? 'persona marcada' : 'personas marcadas'}` : 'Marca a las personas cuyos intentos quieras borrar (por ejemplo, las pruebas).';
  });
  function borrar(){
    const cajas = marcados(), ids = [...new Set(cajas.map(c => Number(c.dataset.usuario)))];
    const nombres = [...new Set(cajas.map(c => c.dataset.nombre))];
    const todos = $('acBorrarAlcance').value === 'todos';
    const r = datos.retos.find(x => x.id === sel);
    const donde = todos ? 'de TODOS los retos' : `del ${r ? r.titulo : 'reto'}`;
    if (!ids.length || !window.confirm(`Vas a borrar los intentos ${donde} de:\n\n${nombres.join('\n')}\n\nSus respuestas, tiempos y puntos desaparecen y podrán volver a jugar. No se puede deshacer. ¿Continuar?`)) return;
    const aviso = (texto, error) => { const el = $('acSelCuenta'); if (el){ el.textContent = texto; el.classList.toggle('ac-error', !!error); } };
    $('acBorrar').disabled = true;
    aviso('Borrando…');
    // El resultado (o el error) se muestra aquí mismo, junto al botón, no arriba de la página.
    api('/admin/coliseo-borrar', { reto_id:sel, usuario_ids:ids, todos }).then(d => cargar().then(() => {
      aviso(d.borrados
        ? `Listo: ${d.borrados} ${d.borrados === 1 ? 'intento borrado' : 'intentos borrados'}.`
        : 'No se borró nada: esas personas no tenían intentos en este reto.', !d.borrados);
    }), err => {
      $('acBorrar').disabled = false;
      if (err && err.error === 'ruta_no_existe') aviso('El servidor todavía no tiene esta función. Pega de nuevo api/worker.js en el Worker manuales-api de Cloudflare y dale Deploy.', true);
      else if (err && err.tipo === 'red') aviso('Sin conexión con el servidor. Revisa la red (Activar conexión) e intenta de nuevo.', true);
      else aviso((err && err.mensaje) || 'No se pudo borrar. Intenta de nuevo.', true);
    });
  }
  $('adColiseo').addEventListener('submit', e => { if (e.target.id === 'acForm'){ e.preventDefault(); guardarEditor(); } });

  // Al abrir la pestaña: cargar y, mientras esté visible y no se esté editando, refrescar cada 30 s.
  document.querySelectorAll('[data-ad-tab]').forEach(t => t.addEventListener('click', () => {
    clearInterval(timer);
    if (t.dataset.adTab !== 'coliseo') return;
    App.ejecutar(() => cargar());
    timer = setInterval(() => {
      if ($('adColiseo').hidden || editando || document.hidden) return;
      cargar().catch(() => {});
    }, REFRESCO_MS);
  }));
})();
