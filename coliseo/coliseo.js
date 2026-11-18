/* =========================================================================
   El Coliseo · retos semanales de POLARIS.
   - El servidor manda la hora (ahora_ms) y mide el tiempo de cada respuesta:
     aquí el reloj solo se muestra, no decide nada.
   - La respuesta correcta nunca llega al navegador mientras el reto está abierto.
   ========================================================================= */
(function () {
  'use strict';
  const P = window.Plataforma;
  const $ = id => document.getElementById(id);

  const HERRAMIENTAS = [
    { id:'Eureka Tiempo real', nombre:'Eureka Tiempo real', sub:'Indicadores del día', logo:'../Recursos/Logo-Eureka.png',
      url:'https://app.powerbi.com/groups/3211437f-be93-446b-b143-1adcf48d4b22/reports/4753e58b-434b-4e61-b047-4c1ba8990b74/44ebdb324c620c3beb23?experience=power-bi' },
    { id:'Eureka Histórico', nombre:'Eureka Histórico', sub:'Evolución en el tiempo', logo:'../Recursos/Logo-Eureka.png',
      url:'https://app.powerbi.com/groups/3211437f-be93-446b-b143-1adcf48d4b22/reports/562f5dcc-9de3-4ae9-9038-4e740f6b039c/1f5fd92a115bc79ae6d2?experience=power-bi' },
    { id:'Orion', nombre:'Orion', sub:'Mantenimiento de la flota', logo:'../Recursos/Logo-Orion.png',
      url:'https://app.powerbi.com/groups/7c1add41-a7d1-4e15-a1f5-a9309203b8ee/reports/11c04c02-d08f-4830-a03a-506fb2e9c199/be6ffd7cb853c5a183a3?experience=power-bi' },
    { id:'Locomboo', nombre:'Locomboo', sub:'Personal en planta', logo:'../Recursos/Logo-Locombo.jpeg',
      url:'https://app.powerbi.com/groups/7c1add41-a7d1-4e15-a1f5-a9309203b8ee/reports/1949c003-62b7-40e4-b25b-0202b0341e92/385d017cc05a81d075b0?experience=power-bi' }
  ];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const LETRAS = 'ABCDEF';
  const KEY_ULTIMO = 'pfUltimoCorreo';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const num = n => Number(n || 0).toLocaleString('es-CO');
  const store = { get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} } };
  const sesionVista = { get(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v){ try { sessionStorage.setItem(k, v); } catch (e) {} } };

  /* ---------------- Hora: la del servidor, mostrada en hora de Colombia ---------------- */
  let desfase = 0;                       // hora del servidor − hora de este equipo
  const ahora = () => Date.now() + desfase;
  const col = ms => new Date(ms - 5 * 3600 * 1000);   // Colombia = UTC−5, sin horario de verano
  function hora12(d){
    const h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h % 12 || 12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`;
  }
  const fechaLarga = ms => { const d = col(ms); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
  const fechaHora = ms => `${fechaLarga(ms)}, ${hora12(col(ms))}`;
  function fmtTiempo(ms){
    ms = Math.max(0, ms || 0);
    const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, d = Math.floor(ms / 100) % 10;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${d}`;
  }
  function cajasCuenta(ms){
    ms = Math.max(0, ms);
    const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
    const caja = (v, t) => `<span>${String(v).padStart(2, '0')}<small>${t}</small></span>`;
    return (d ? caja(d, d === 1 ? 'día' : 'días') : '') + caja(h, 'horas') + caja(m, 'min') + caja(s, 'seg');
  }

  /* ---------------- Vistas ---------------- */
  const VISTAS = ['vCargando', 'vAcceso', 'vArena', 'vReto', 'vEnviado'];
  function mostrar(id){
    if (!$(id).hidden) return;   // ya visible: no mover la página
    VISTAS.forEach(v => { $(v).hidden = v !== id; });
    window.scrollTo(0, 0);
  }
  function cargando(texto){ $('vCargando').querySelector('p').textContent = texto || 'Abriendo las puertas del Coliseo…'; mostrar('vCargando'); }

  /* ---------------- Llamadas a la API con manejo de red y sesión ---------------- */
  let pendiente = null;
  function api(ruta, cuerpo){ return P.llamar(ruta, Object.assign({ token:P.getToken() }, cuerpo || {})); }
  function manejarError(err, reintento){
    if (err && err.tipo === 'red'){
      pendiente = reintento;
      abrirModal('Sin conexión con el Coliseo',
        `<p>No pudimos conectar con el servidor. Desde la red de CEMEX, haz clic en <strong>Activar conexión</strong> y luego en <strong>Continuar</strong> en la advertencia que aparece. Después vuelve aquí y pulsa <strong>Reintentar</strong>.</p>
         <div class="co-fila"><button type="button" class="co-btn sec peq" data-activar>Activar conexión</button><button type="button" class="co-btn peq" data-reintentar>Reintentar</button></div>`);
      return;
    }
    if (err && err.status === 401){ P.salir(); mostrarAcceso('Tu sesión terminó. Ingresa de nuevo para continuar.'); return; }
    if (err && (err.error === 'ruta_no_existe' || err.error === 'error_servidor')){
      cargando('El Coliseo se está preparando. Vuelve en unos minutos.');
      $('vCargando').querySelector('.co-spin').hidden = true;
      return;
    }
    abrirModal('Algo salió mal', `<p>${esc((err && err.mensaje) || 'Ocurrió un error. Intenta de nuevo.')}</p><div class="co-fila"><button type="button" class="co-btn peq" data-cerrar-modal>Entendido</button></div>`);
  }
  function reintentar(){ if (!pendiente) return; const r = pendiente; pendiente = null; cerrarModal(); r(); }

  /* ---------------- Acceso ---------------- */
  function mostrarAcceso(msg){
    $('coUser').hidden = true;
    const ultimo = store.get(KEY_ULTIMO);
    if (ultimo) $('coCorreoIngreso').value = ultimo;
    tabAcceso('ingreso');
    mensajeAcceso(msg || '', 'info');
    mostrar('vAcceso');
  }
  function tabAcceso(cual){
    document.querySelectorAll('.co-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === cual));
    $('coFormIngreso').hidden = cual !== 'ingreso';
    $('coFormRegistro').hidden = cual !== 'registro';
  }
  function mensajeAcceso(t, tipo){
    const el = $('coAccesoMsg');
    el.textContent = t; el.hidden = !t; el.className = 'co-msg' + (tipo === 'info' ? ' info' : '');
  }
  let ocupadoAcceso = false;
  function entrar(op, correo, alErrorApi){
    if (ocupadoAcceso) return;
    ocupadoAcceso = true; mensajeAcceso('');
    document.querySelectorAll('.co-form .co-btn').forEach(b => { b.disabled = true; });
    op().then(usuario => {
      document.querySelector('#vAcceso [data-zscaler]').hidden = true;
      store.set(KEY_ULTIMO, correo);
      sesionLista(usuario);
    }, err => {
      if (err && err.tipo === 'red'){ pendiente = () => entrar(op, correo, alErrorApi); document.querySelector('#vAcceso [data-zscaler]').hidden = false; return; }
      alErrorApi(err || {});
    }).finally(() => {
      ocupadoAcceso = false;
      document.querySelectorAll('.co-form .co-btn').forEach(b => { b.disabled = false; });
    });
  }
  document.querySelectorAll('.co-tab').forEach(t => t.addEventListener('click', () => { tabAcceso(t.dataset.tab); mensajeAcceso(''); }));
  $('coFormIngreso').addEventListener('submit', e => {
    e.preventDefault();
    const correo = $('coCorreoIngreso').value.trim().toLowerCase();
    if (!P.correoValido(correo)){ mensajeAcceso('Usa tu correo corporativo @cemex.com o @ext.cemex.com.'); return; }
    entrar(() => P.ingresar(correo), correo, err => {
      if (err.error === 'no_registrado'){ $('coCorreoRegistro').value = correo; tabAcceso('registro'); mensajeAcceso('Ese correo aún no está registrado. Escribe tu nombre para crear tu cuenta.', 'info'); $('coNombreRegistro').focus(); }
      else mensajeAcceso(err.mensaje || 'No pudimos ingresar. Intenta de nuevo.');
    });
  });
  $('coFormRegistro').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('coNombreRegistro').value.trim();
    const correo = $('coCorreoRegistro').value.trim().toLowerCase();
    if (nombre.length < 2){ mensajeAcceso('Escribe tu nombre completo.'); return; }
    if (!P.correoValido(correo)){ mensajeAcceso('Usa tu correo corporativo @cemex.com o @ext.cemex.com.'); return; }
    entrar(() => P.registrar(nombre, correo), correo, err => {
      if (err.error === 'ya_registrado'){ $('coCorreoIngreso').value = correo; tabAcceso('ingreso'); mensajeAcceso('Ese correo ya está registrado. Pulsa "Entrar al Coliseo".', 'info'); }
      else mensajeAcceso(err.mensaje || 'No pudimos crear tu cuenta. Intenta de nuevo.');
    });
  });
  $('coSalir').addEventListener('click', () => { P.salir(); detenerReloj(); mostrarAcceso('Cerraste sesión.'); });

  function sesionLista(usuario){
    $('coNombre').textContent = (usuario && (usuario.nombre || usuario.email)) || '';
    $('coUser').hidden = false;
    P.marcarInvitado(false);
    cargarEstado();
  }

  /* ---------------- Estado de los retos ---------------- */
  let estado = null, recargando = false;
  function cargarEstado(){
    if (!estado) cargando();
    recargando = true;
    return api('/coliseo/estado').then(d => {
      recargando = false;
      estado = d;
      desfase = d.ahora_ms - Date.now();
      P.registrarConsulta('Coliseo', 'Arena');
      pintarArena();
      if ($('vReto').hidden && $('vEnviado').hidden) mostrar('vArena');
    }, err => { recargando = false; manejarError(err, cargarEstado); });
  }
  const retoActual = () => {
    const r = estado.retos;
    return r.find(x => x.estado === 'abierto') || r.find(x => x.estado === 'pendiente') || r.find(x => x.estado === 'proximo') || r[r.length - 1] || null;
  };
  const ultimoCerrado = () => [...estado.retos].reverse().find(x => x.estado === 'cerrado' && x.resultado) || null;

  function pintarArena(){
    const a = retoActual();
    let html = '';
    if (!a){
      html = `<div class="co-actual-card"><h2>Muy pronto</h2><p>Los retos del Coliseo se publicarán aquí.</p></div>`;
    } else if (a.estado === 'abierto'){
      if (a.intento === 'respondido'){
        html = `<div class="co-actual-card"><div class="co-actual-top"><span class="co-vivo">Reto en curso</span></div>
          <h2>${esc(a.titulo)}: ¡ya diste la batalla!</h2>
          <p class="co-ok-txt">Respuesta registrada en ${esc(fmtTiempo(a.tiempo_ms))}</p>
          <p>Los resultados se revelan el ${esc(fechaHora(a.cierra_ms))}, cuando cierre el reto. Ese día verás tu puesto y la tabla de posiciones.</p>
          <div class="co-reloj-mini" data-cuenta-a="${a.cierra_ms}"></div><span class="co-nota">Tiempo para el cierre</span></div>`;
      } else {
        const curso = a.intento === 'en_curso';
        html = `<div class="co-actual-card"><div class="co-actual-top"><span class="co-vivo">${a.numero === 1 ? '¡Ya comenzó la conquista del Coliseo!' : '¡Nuevo reto abierto!'}</span></div>
          <h2>${esc(a.titulo)}</h2>
          <p>${curso ? 'Tienes este reto en curso y <strong>tu reloj sigue corriendo</strong>. Vuelve a la arena y responde.' : `Una pregunta, un solo intento: acierta y sé rápido. Abierto hasta el <strong>${esc(fechaHora(a.cierra_ms))}</strong>`}</p>
          <div class="co-reloj-mini" data-cuenta-a="${a.cierra_ms}"></div>
          <button type="button" class="co-btn grande" data-comenzar="${a.id}">${curso ? 'Continuar el reto' : 'Comenzar el reto'}</button>
          <span class="co-nota">Cuando pulses, empieza una cuenta 3, 2, 1 y luego corre tu tiempo. <button type="button" class="co-link" data-reglas>Ver reglas</button></span></div>`;
      }
    } else if (a.estado === 'pendiente'){
      html = `<div class="co-actual-card"><div class="co-actual-top"><span class="co-vivo">Se viene</span></div><h2>${esc(a.titulo)}</h2>
        <p>La pregunta de esta semana se publica en breve. Vuelve en un rato.</p></div>`;
    } else if (a.estado === 'proximo'){
      html = `<div class="co-actual-card"><div class="co-actual-top"><span class="co-vivo">Próximo reto</span></div><h2>${esc(a.titulo)}</h2>
        <p>Abre el <strong>${esc(fechaLarga(a.abre_ms))}</strong> a las ${esc(hora12(col(a.abre_ms)))}</p>
        <div class="co-reloj-mini" data-cuenta-a="${a.abre_ms}"></div><span class="co-nota">Tiempo para que abra</span></div>`;
    } else {
      const g = estado.general;
      html = `<div class="co-actual-card"><div class="co-actual-top"><span class="co-vivo">Conquista terminada</span></div><h2>Gracias por participar</h2>
        <p>${g.puesto ? `Terminaste en el <strong>puesto #${g.puesto}</strong> de ${g.participantes} con <strong>${num(g.puntos)} puntos</strong>.` : 'Revisa la tabla de posiciones final.'}</p></div>`;
    }
    $('coActual').innerHTML = html;
    pintarBanda();
    pintarRetos();
    pintarTabs();
    iniciarReloj();
  }

  function pintarBanda(){
    const c = ultimoCerrado(), b = $('coBanda');
    if (!c){ b.hidden = true; return; }
    const r = c.resultado;
    b.hidden = false;
    if (r.puesto){
      b.innerHTML = `<span class="co-puesto-num">#${r.puesto}</span>
        <div><p>${esc(c.titulo)} cerrado</p><h3>Ocupaste el puesto #${r.puesto} de ${r.participantes} esta semana</h3>
        <p>Tu respuesta: <strong>${esc(r.tu_respuesta)}</strong> ${r.correcta ? '(correcta)' : `(la correcta era <strong>${esc(r.respuesta_correcta)}</strong>)`} · <strong>${num(r.puntos)} puntos</strong></p></div>
        <button type="button" class="co-btn peq" data-ver-tabla="${c.id}">Ver tabla</button>`;
      const clave = 'coConfeti' + c.id;
      if (r.puesto <= 3 && !sesionVista.get(clave)){ sesionVista.set(clave, '1'); confeti(70); }
    } else {
      b.innerHTML = `<div><p>${esc(c.titulo)} cerrado</p><h3>No participaste esta semana</h3>
        <p>La respuesta correcta era <strong>${esc(r.respuesta_correcta)}</strong>. Aún puedes sumar puntos en los próximos retos.</p></div>
        <button type="button" class="co-btn peq" data-ver-tabla="${c.id}">Ver tabla</button>`;
    }
  }

  function pintarRetos(){
    $('coRetos').innerHTML = estado.retos.map(r => {
      let et = '', cls = r.estado, sub = '';
      if (r.estado === 'abierto'){ et = r.intento === 'respondido' ? 'Respondido' : r.intento === 'en_curso' ? 'En curso' : 'Abierto'; sub = `Cierra el ${fechaLarga(r.cierra_ms)}`; }
      else if (r.estado === 'cerrado'){
        const res = r.resultado;
        et = res && res.puesto ? `Puesto #${res.puesto}` : 'Cerrado';
        sub = res && res.puesto ? `${num(res.puntos)} puntos` : 'No participaste';
      } else if (r.estado === 'pendiente'){ et = 'Se publica en breve'; sub = `Cierra el ${fechaLarga(r.cierra_ms)}`; }
      else { et = 'Próximamente'; sub = `Abre el ${fechaLarga(r.abre_ms)}`; }
      const oro = r.estado === 'cerrado' && r.resultado && r.resultado.puesto && r.resultado.puesto <= 3;
      return `<li class="${cls}"><span class="num">${r.numero}</span><h3>${esc(r.titulo)}</h3><p>${esc(sub)}</p><span class="estado${oro ? ' oro' : ''}">${esc(et)}</span></li>`;
    }).join('');
  }

  /* ---------------- Tabla de posiciones ---------------- */
  let tablaSel = null;
  const cacheTablas = {};
  function pintarTabs(){
    const cerrados = estado.retos.filter(r => r.estado === 'cerrado' && r.resultado);
    const tabs = $('coTablaTabs');
    if (!cerrados.length){
      tabs.innerHTML = '';
      const a = estado.retos.find(r => r.estado === 'abierto') || estado.retos[0];
      $('coTabla').innerHTML = `<div class="co-vacio"><strong>La tabla se revela al cierre del primer reto</strong>${a ? `Las posiciones del ${esc(a.titulo)} se publican al cierre del reto: ${esc(fechaHora(a.cierra_ms))}` : ''}</div>`;
      return;
    }
    const opciones = [['general', 'Acumulado'], ...cerrados.map(r => [String(r.id), r.titulo])];
    if (!tablaSel || !opciones.some(o => o[0] === tablaSel)) tablaSel = 'general';
    tabs.innerHTML = opciones.map(([id, t]) => `<button type="button" role="tab" class="${id === tablaSel ? 'on' : ''}" data-tabla="${id}" aria-selected="${id === tablaSel}">${esc(t)}</button>`).join('');
    cargarTabla(tablaSel);
  }
  function cargarTabla(id){
    tablaSel = id;
    $('coTablaTabs').querySelectorAll('button').forEach(b => { const on = b.dataset.tabla === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    if (cacheTablas[id]){ pintarTabla(id, cacheTablas[id]); return; }
    $('coTabla').innerHTML = '<div class="co-vacio">Cargando posiciones…</div>';
    api('/coliseo/tabla', id === 'general' ? {} : { reto_id:Number(id) }).then(d => { cacheTablas[id] = d; if (tablaSel === id) pintarTabla(id, d); },
      err => manejarError(err, () => cargarTabla(id)));
  }
  function pintarTabla(id, d){
    const general = id === 'general';
    if (!d.filas.length){ $('coTabla').innerHTML = '<div class="co-vacio"><strong>Nadie respondió todavía</strong>Las posiciones aparecerán aquí.</div>'; return; }
    const podio = d.filas.slice(0, 3);
    const lugar = (f, i) => f ? `<div class="p${i + 1}"><strong>${esc(f.nombre)}</strong><small>${num(f.puntos)} pts</small><span>${i + 1}</span></div>` : '<div></div>';
    const fila = f => `<tr class="${f.yo ? 'yo' : ''}">
      <td class="pos">${f.puesto <= 3 ? `<span class="co-medalla m${f.puesto}">${f.puesto}</span>` : '#' + f.puesto}</td>
      <td>${esc(f.nombre)}${f.yo ? ' (tú)' : ''}</td>
      ${general ? `<td class="n ocultar-movil">${f.retos}</td><td class="n">${f.correctas}</td>`
                : `<td>${f.correcta ? '<span class="co-si">Correcta</span>' : '<span class="co-no">Incorrecta</span>'}</td><td class="n ocultar-movil">${esc(fmtTiempo(f.tiempo_ms))}</td>`}
      <td class="n"><strong>${num(f.puntos)}</strong></td></tr>`;
    $('coTabla').innerHTML = `<div class="co-podio">${lugar(podio[1], 1)}${lugar(podio[0], 0)}${lugar(podio[2], 2)}</div>
      <div class="co-tabla-caja"><table class="co-tabla"><thead><tr><th>Puesto</th><th>Participante</th>
        ${general ? '<th class="n ocultar-movil">Retos</th><th class="n">Aciertos</th>' : '<th>Resultado</th><th class="n ocultar-movil">Tiempo</th>'}<th class="n">Puntos</th></tr></thead>
        <tbody>${d.filas.map(fila).join('')}${d.mia ? `<tr class="sep"><td colspan="5">…</td></tr>${fila(d.mia)}` : ''}</tbody></table>
        <div class="co-tabla-pie">${num(d.total)} participantes${d.total > d.filas.length ? ` · se muestran los primeros ${d.filas.length}` : ''}${general ? ' · suma de los retos cerrados' : ''}</div></div>`;
  }

  /* ---------------- Relojes de la arena ---------------- */
  let reloj = null;
  function iniciarReloj(){
    detenerReloj();
    const paso = () => {
      let vencido = false;
      document.querySelectorAll('[data-cuenta-a]').forEach(el => {
        const resta = Number(el.dataset.cuentaA) - ahora();
        if (resta <= 0) vencido = true;
        el.innerHTML = cajasCuenta(resta);
      });
      if (vencido && !recargando && !$('vArena').hidden){ Object.keys(cacheTablas).forEach(k => delete cacheTablas[k]); cargarEstado(); }
    };
    paso();
    reloj = setInterval(paso, 1000);
  }
  function detenerReloj(){ if (reloj){ clearInterval(reloj); reloj = null; } }

  /* ---------------- Reto: cuenta regresiva, pregunta y respuesta ---------------- */
  let reto = null, seleccion = null, relojReto = null, enviando = false;
  function comenzar(id){
    const item = estado.retos.find(r => r.id === id);
    if (!item) return;
    detenerReloj();
    const conCuenta = item.intento === 'sin_iniciar';
    // La diferencia con la hora del servidor se calcula al llegar la respuesta, no al terminar la cuenta 3, 2, 1.
    const pedido = api('/coliseo/iniciar', { reto_id:id }).then(d => { desfase = d.ahora_ms - Date.now(); return d; });
    P.registrarConsulta('Coliseo', item.titulo);
    const listo = conCuenta ? cuentaRegresiva() : Promise.resolve();
    Promise.all([pedido, listo]).then(([d]) => {
      ocultarCuenta();
      abrirReto(d);
    }, err => {
      ocultarCuenta();
      if (err && err.error === 'ya_respondiste'){ cargarEstado(); return; }
      manejarError(err, () => comenzar(id));
      iniciarReloj();
    });
  }
  function cuentaRegresiva(){
    const caja = $('coCuenta'), n = $('coCuentaN'), et = $('coCuentaEt');
    caja.hidden = false;
    const pasos = [['Prepárate', '3'], ['Prepárate', '2'], ['Prepárate', '1'], ['', '¡A la arena!']];
    return new Promise(res => {
      let i = 0;
      const sig = () => {
        if (i >= pasos.length){ res(); return; }
        const [t, v] = pasos[i];
        et.textContent = t;
        n.textContent = v;
        n.className = 'co-cuenta-n ' + (i === 3 ? 'final' : 'late');
        void n.offsetWidth;
        i++;
        setTimeout(sig, i === 4 ? 600 : 1000);
      };
      sig();
    });
  }
  function ocultarCuenta(){ $('coCuenta').hidden = true; }

  function abrirReto(d){
    reto = d; seleccion = null; enviando = false;
    $('coRetoNum').textContent = d.reto.titulo;
    $('coPregunta').textContent = d.reto.pregunta;
    $('coHerr').innerHTML = HERRAMIENTAS.map(h => `<a class="co-herr-b${d.herramientas.includes(h.id) ? ' usada' : ''}" href="${esc(h.url)}" target="_blank" rel="noopener" data-herr="${esc(h.id)}">
        <img src="${esc(h.logo)}" alt=""><span>${esc(h.nombre)}</span><small>${d.herramientas.includes(h.id) ? 'Abierta' : esc(h.sub)}</small></a>`).join('');
    $('coOps').innerHTML = d.reto.opciones.map((o, i) => `<button type="button" class="co-op" role="radio" aria-checked="false" data-op="${o.id}"><span class="letra">${LETRAS[i]}</span><span>${esc(o.texto)}</span></button>`).join('');
    $('coEnviar').disabled = true;
    $('coRetoMsg').hidden = true;
    mostrar('vReto');
    if (relojReto) clearInterval(relojReto);
    const pinta = () => { $('coReloj').textContent = fmtTiempo(ahora() - reto.inicio_ms); };
    pinta();
    relojReto = setInterval(pinta, 100);
  }
  function cerrarReto(){ if (relojReto){ clearInterval(relojReto); relojReto = null; } reto = null; }

  $('coOps').addEventListener('click', e => {
    const b = e.target.closest('.co-op');
    if (!b) return;
    seleccion = Number(b.dataset.op);
    $('coOps').querySelectorAll('.co-op').forEach(x => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
    $('coEnviar').disabled = false;
  });
  $('coOps').addEventListener('keydown', e => {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return;
    const ops = [...$('coOps').querySelectorAll('.co-op')], i = ops.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const sig = ops[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : ops.length - 1)) % ops.length];
    sig.focus(); sig.click();
  });
  $('coHerr').addEventListener('click', e => {
    const a = e.target.closest('[data-herr]');
    if (!a || !reto) return;
    if (!a.classList.contains('usada')){ a.classList.add('usada'); a.querySelector('small').textContent = 'Abierta'; }
    api('/coliseo/herramienta', { reto_id:reto.reto.id, herramienta:a.dataset.herr }).catch(() => {});
  });
  $('coEnviar').addEventListener('click', () => {
    if (seleccion === null || !reto) return;
    const op = reto.reto.opciones.find(o => o.id === seleccion);
    abrirModal('¿Enviar esta respuesta?', `<p>Tu respuesta:</p><div class="co-confirma">${esc(op.texto)}</div>
      <p>Solo tienes un intento y no podrás cambiarla. El reloj sigue corriendo hasta que confirmes.</p>
      <div class="co-fila"><button type="button" class="co-btn sec peq" data-cerrar-modal>Revisar</button><button type="button" class="co-btn peq" data-confirmar-envio>Sí, enviar</button></div>`);
  });
  function enviar(){
    if (enviando || !reto) return;
    enviando = true;
    const r = reto;
    const btn = document.querySelector('[data-confirmar-envio]');
    if (btn){ btn.disabled = true; btn.textContent = 'Enviando…'; }
    api('/coliseo/responder', { reto_id:r.reto.id, opcion:seleccion }).then(d => {
      cerrarModal(); cerrarReto();
      $('coTiempoFinal').textContent = fmtTiempo(d.tiempo_ms);
      $('coEnviadoTxt').innerHTML = `Tu respuesta quedó guardada. Los resultados se revelan cuando cierre el reto, el <strong>${esc(fechaHora(d.cierra_ms))}</strong>: ese día verás tu puesto y la tabla de posiciones.`;
      mostrar('vEnviado');
      confeti(40);
      estado = null;
    }, err => {
      enviando = false;
      cerrarModal();
      if (err && (err.error === 'ya_respondiste' || err.error === 'reto_no_disponible')){
        cerrarReto();
        abrirModal('No pudimos registrar la respuesta', `<p>${esc(err.mensaje)}</p><div class="co-fila"><button type="button" class="co-btn peq" data-ir-arena>Volver a la arena</button></div>`);
        return;
      }
      manejarError(err, enviar);
    });
  }
  window.addEventListener('beforeunload', e => { if (reto){ e.preventDefault(); e.returnValue = ''; } });

  /* ---------------- Ventana ---------------- */
  let focoAntes = null;
  function abrirModal(titulo, html){
    focoAntes = document.activeElement;
    $('coModalTit').textContent = titulo;
    $('coModalCuerpo').innerHTML = html;
    $('coModal').hidden = false; $('coModalFondo').hidden = false;
    const b = $('coModal').querySelector('.co-fila .co-btn:last-child') || $('coModal').querySelector('.co-x');
    if (b) b.focus();
  }
  function cerrarModal(){
    $('coModal').hidden = true; $('coModalFondo').hidden = true;
    if (focoAntes && focoAntes.focus && document.contains(focoAntes)) focoAntes.focus();
  }
  function reglas(){
    abrirModal('Cómo se juega', `<ol>
      <li>Cada lunes se abre un reto y cierra el domingo a las 11:59 p. m.</li>
      <li>Pulsa <strong>Comenzar el reto</strong>: después de la cuenta 3, 2, 1 aparece la pregunta y empieza a correr tu tiempo.</li>
      <li>La respuesta está en una de nuestras herramientas digitales. Elige la correcta, ábrela, busca el dato y vuelve a responder.</li>
      <li>Tienes <strong>un solo intento</strong>. Si cierras la página, el reloj sigue corriendo.</li>
      <li>Puntos: respuesta correcta <strong>1.000</strong> + bono de rapidez de hasta <strong>500</strong> (baja con cada segundo y se agota a los 30 minutos). Si fallas, sumas <strong>100</strong> por participar.</li>
      <li>Cuando cierra el reto ves tu puesto y la tabla. Los puntos de cada semana se suman y el <strong>Top 3 acumulado</strong> gana.</li>
    </ol><div class="co-fila"><button type="button" class="co-btn peq" data-cerrar-modal>¡Entendido!</button></div>`);
  }

  /* ---------------- Confeti ---------------- */
  function confeti(n){
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const caja = $('coConfeti'), colores = ['#d0202a', '#0b2459', '#c8902a', '#f0c766', '#ffffff'];
    for (let i = 0; i < n; i++){
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colores[i % colores.length];
      p.style.animationDuration = (2.2 + Math.random() * 2) + 's';
      p.style.animationDelay = Math.random() * .5 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      caja.appendChild(p);
      setTimeout(() => p.remove(), 5000);
    }
  }

  /* ---------------- Clics generales ---------------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.matches('[data-comenzar]')) comenzar(Number(t.dataset.comenzar));
    else if (t.matches('[data-reglas]')) reglas();
    else if (t.matches('[data-cerrar-modal]')) cerrarModal();
    else if (t.matches('[data-confirmar-envio]')) enviar();
    else if (t.matches('[data-activar]')) P.activarConexion();
    else if (t.matches('[data-reintentar]')) reintentar();
    else if (t.matches('[data-ir-arena]')){ cerrarModal(); cerrarReto(); estado = null; mostrar('vCargando'); cargarEstado(); }
    else if (t.matches('[data-tabla]')) cargarTabla(t.dataset.tabla);
    else if (t.matches('[data-ver-tabla]')){ cargarTabla(t.dataset.verTabla); $('coTablaTit').scrollIntoView({ behavior:'smooth', block:'start' }); }
  });
  $('coModalFondo').addEventListener('click', () => { if (!document.querySelector('[data-confirmar-envio]:disabled')) cerrarModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('coModal').hidden) cerrarModal(); });
  // Al volver de otra pestaña (por ejemplo la advertencia de Zscaler o una herramienta), reintentar lo pendiente.
  window.addEventListener('focus', () => { if (pendiente && !$('coModal').hidden) reintentar(); });

  /* ---------------- Inicio ---------------- */
  if (!P){
    $('vCargando').querySelector('p').textContent = 'No se pudo cargar POLARIS. Recarga la página.';
    return;
  }
  function iniciar(){
    if (!P.getToken()){ mostrarAcceso(); return; }
    cargando('Verificando tu sesión…');
    P.validarSesion().then(u => { if (u) sesionLista(u); else mostrarAcceso(); }, err => manejarError(err, iniciar));
  }
  iniciar();
})();
