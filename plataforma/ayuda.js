/* =========================================================================
   Centro de ayuda de POLARIS (window.Ayuda). Lo usan el portal y los 3 manuales.
   Cárgalo después de plataforma.js:
     <script src="../plataforma/ayuda.js" data-herramienta="Orion"></script>

   - data-herramienta: la herramienta del manual (en el portal no se pone).
   - Inserta solo el botón "Tengo una pregunta" en cada .page-header y un aviso
     en cada .cx-manual-section. La sección abierta sale de Plataforma.getContexto()
     y la página del tablero de .pages-nav-item.active, así que un manual o tablero
     nuevo no necesita código adicional: basta con que llame a pfConsulta().
   - Los mensajes se muestran según autor_tipo, incluido 'ia' para el futuro asistente.
   ========================================================================= */
(function () {
  'use strict';
  const P = window.Plataforma;
  if (!P) return;   // sin plataforma.js el manual sigue funcionando sin centro de ayuda

  const script = document.currentScript;
  const BASE = script ? script.src.replace(/ayuda\.js.*$/, '') : '';
  const HERRAMIENTA_PAGINA = script ? script.getAttribute('data-herramienta') : null;
  const KEY_BORRADOR = 'ayBorrador', KEY_VOTOS = 'ayVotosFaq';

  const CATALOGO = [
    { id:'Eureka', desc:'Indicadores y desempeño', secciones:[['Tiempo real', 'Tiempo real'], ['Histórico', 'Histórico']] },
    { id:'Orion', desc:'Mantenimiento de la flota', secciones:[['App', 'App'], ['Tablero', 'Tablero']] },
    { id:'Locomboo', desc:'Ingreso a planta y personal', secciones:[['App', 'App'], ['Tablero', 'Tablero'], ['Cemento - Cemento', 'Tablero Cemento'], ['Cemento - Caracolito', 'Tablero Caracolito'], ['Cemento - Portería', 'Tablero Portería'], ['Cemento - Nómina', 'Tablero Nómina']] },
    { id:'POLARIS', desc:'Portal, acceso y cuenta', secciones:[['Acceso y cuenta', 'Acceso y cuenta'], ['Portal', 'Portal']] }
  ];
  const CATEGORIAS = [['uso', '¿Cómo se usa?'], ['error', 'Algo no funciona'], ['dato', 'Entender un dato'], ['sugerencia', 'Tengo una sugerencia']];
  const ESTADOS = { abierta:'Recibida', en_proceso:'En revisión', respondida:'Respondida', cerrada:'Cerrada' };
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const VACIAS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'o', 'a', 'que', 'como', 'por', 'para', 'con', 'se', 'mi', 'me', 'es', 'al', 'lo', 'no', 'si', 'hago', 'puedo', 'cual', 'donde', 'cuando', 'quien', 'tengo']);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fecha = s => (s ? `${+s.slice(8, 10)} ${MESES[+s.slice(5, 7) - 1]}, ${s.slice(11, 16)}` : '');
  const nombreSeccion = (h, s) => {
    const t = CATALOGO.find(x => x.id === h);
    const it = t && t.secciones.find(x => x[0] === s);
    return it ? it[1] : (s || '');
  };
  const rutaDe = p => [p.herramienta, nombreSeccion(p.herramienta, p.seccion), p.pagina].filter(Boolean).join(' › ');
  const ICON = {
    ayuda:'<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    lupa:'<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
    chat:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    ok:'<polyline points="20 6 9 17 4 12"></polyline>',
    atras:'<polyline points="15 18 9 12 15 6"></polyline>'
  };
  const svg = (n, t) => `<svg viewBox="0 0 24 24" width="${t || 18}" height="${t || 18}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

  /* ---------------- Almacenamiento local ---------------- */
  const leerJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const guardarJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const borrarLocal = k => { try { localStorage.removeItem(k); } catch (e) {} };

  /* ---------------- API ---------------- */
  function llamar(ruta, cuerpo) { return P.llamar(ruta, Object.assign({ token:P.getToken() }, cuerpo || {})); }
  let faqsCache = null;
  function cargarFaqs() {
    if (faqsCache) return Promise.resolve(faqsCache);
    return P.llamar('/ayuda/faqs', {}).then(d => (faqsCache = d.faqs || []));
  }
  function buscarFaqs(lista, texto, herramienta, max) {
    const toks = norm(texto).split(/[^a-z0-9ñ]+/).filter(t => t.length > 2 && !VACIAS.has(t));
    if (!toks.length) return [];
    const puntuadas = lista.map(f => {
      const pr = norm(f.pregunta), re = norm(f.respuesta);
      let n = 0;
      toks.forEach(t => { if (pr.includes(t)) n += 3; else if (re.includes(t)) n += 1; });
      if (n && herramienta && f.herramienta === herramienta) n += 2;
      return { f, n };
    }).filter(x => x.n >= 3).sort((a, b) => b.n - a.n);
    const mejor = puntuadas.length ? puntuadas[0].n : 0;
    return puntuadas.filter(x => x.n >= mejor * 0.6).slice(0, max || 4).map(x => x.f);
  }

  /* ---------------- Contador de respuestas sin leer ---------------- */
  let noLeidas = 0, ultimoConteo = 0;
  function pintarContador() {
    document.querySelectorAll('[data-ay-badge]').forEach(b => { b.textContent = noLeidas; b.hidden = !noLeidas; });
  }
  function actualizarContador(forzar) {
    if (!P.getToken()) { noLeidas = 0; pintarContador(); return; }
    if (!forzar && Date.now() - ultimoConteo < 60000) return;
    ultimoConteo = Date.now();
    llamar('/preguntas/mias').then(d => { noLeidas = d.no_leidas || 0; pintarContador(); }, () => {});
  }

  /* ---------------- Contexto: qué tiene abierto la persona ---------------- */
  function paginaActiva() {
    const a = [...document.querySelectorAll('.pages-nav-item.active')].find(x => x.offsetParent !== null);
    return a ? a.textContent.trim() : null;
  }
  function contextoAbierto() {
    const c = P.getContexto ? P.getContexto() : null;
    if (!c) return { herramienta:HERRAMIENTA_PAGINA, seccion:null, pagina:null };
    return { herramienta:HERRAMIENTA_PAGINA || c.manual, seccion:c.seccion || null, pagina:paginaActiva() };
  }

  /* =======================================================================
     Una instancia del centro de ayuda dibujada dentro de `root`
     (el panel lateral en cualquier página; en el portal, también la vista completa)
     ======================================================================= */
  function Centro(root, opciones) {
    const self = this;
    this.root = root;
    this.embebido = !!(opciones && opciones.embebido);
    this.vista = 'inicio';
    this.filtroFaq = null;
    this.filtroMias = 'todas';
    this.textoFaq = '';
    this.form = null;
    this.preguntas = null;
    this.detalle = null;
    this.reintento = null;

    root.addEventListener('click', e => self.alClic(e));
    root.addEventListener('input', e => self.alEscribir(e));
    root.addEventListener('submit', e => { e.preventDefault(); self.alEnviar(e.target); });
  }
  const C = Centro.prototype;

  C.ir = function (vista, datos) {
    this.vista = vista;
    this.error = null;
    if (vista === 'nueva') this.prepararForm(datos);
    if (vista === 'mias') this.cargarMias();
    if (vista === 'detalle') this.cargarDetalle(datos);
    if (vista === 'inicio') this.cargarInicio();
    this.pintar();
    const cuerpo = this.root.querySelector('.ay-cuerpo');
    if (cuerpo) cuerpo.scrollTop = 0;
  };

  /* Ejecuta una llamada a la API con el manejo común de red, sesión y errores */
  C.ejecutar = function (op, alTerminar) {
    const self = this;
    this.reintento = null;
    this.ocupado = true;
    return op().then(r => {
      self.ocupado = false; self.red = false;
      alTerminar(r);
    }, err => {
      self.ocupado = false;
      if (err && err.tipo === 'red') { self.red = true; self.reintento = () => self.ejecutar(op, alTerminar); }
      else if (err && err.status === 401) { P.validarSesion().then(() => self.pintar(), () => self.pintar()); self.error = err.mensaje; }
      else if (err && (err.error === 'ruta_no_existe' || err.error === 'error_servidor')) self.error = 'El centro de ayuda no está disponible en este momento. Intenta de nuevo más tarde.';
      else self.error = (err && err.mensaje) || 'Ocurrió un error. Intenta de nuevo.';
      self.pintar();
    });
  };

  C.cargarInicio = function () {
    const self = this;
    if (faqsCache) { this.faqs = faqsCache; return; }
    this.ejecutar(cargarFaqs, l => { self.faqs = l; self.pintar(); });
  };
  C.cargarMias = function () {
    const self = this;
    if (!P.getToken()) return;
    this.preguntas = this.preguntas || null;
    this.ejecutar(() => llamar('/preguntas/mias'), d => {
      self.preguntas = d.preguntas || [];
      noLeidas = d.no_leidas || 0;
      pintarContador();
      self.pintar();
    });
  };
  C.cargarDetalle = function (id) {
    const self = this;
    this.detalle = this.detalle && this.detalle.pregunta.id === id ? this.detalle : null;
    this.ejecutar(() => llamar('/preguntas/detalle', { id }), d => {
      self.detalle = d;
      actualizarContador(true);
      self.pintar();
      const hilo = self.root.querySelector('.ay-cuerpo');
      if (hilo) hilo.scrollTop = hilo.scrollHeight;
    });
  };
  C.prepararForm = function (datos) {
    const d = datos || {};
    const borrador = leerJson(KEY_BORRADOR, null);
    const usarBorrador = borrador && (!d.herramienta || borrador.herramienta === d.herramienta);
    this.form = {
      herramienta:d.herramienta || (usarBorrador && borrador.herramienta) || null,
      seccion:d.seccion || (usarBorrador && borrador.seccion) || null,
      pagina:d.pagina || null,
      automatico:!!d.herramienta,
      editandoDestino:!d.herramienta,
      categoria:(usarBorrador && borrador.categoria) || 'uso',
      titulo:(usarBorrador && borrador.titulo) || '',
      detalle:(usarBorrador && borrador.detalle) || '',
      origen:d.origen || 'centro'
    };
    const self = this;
    if (!faqsCache) cargarFaqs().then(() => self.pintarSugerencias(), () => {});
  };
  C.guardarBorrador = function () {
    const f = this.form;
    if (!f || (!f.titulo && !f.detalle)) { borrarLocal(KEY_BORRADOR); return; }
    guardarJson(KEY_BORRADOR, { herramienta:f.herramienta, seccion:f.seccion, categoria:f.categoria, titulo:f.titulo, detalle:f.detalle });
  };

  /* ---------------- Dibujo ---------------- */
  C.pintar = function () {
    const logueado = !!P.getToken();
    const tabs = `<div class="ay-tabs" role="tablist">
      <button type="button" role="tab" class="ay-tab${this.vista === 'inicio' ? ' on' : ''}" data-ir="inicio">Preguntas frecuentes</button>
      <button type="button" role="tab" class="ay-tab${['mias', 'detalle'].includes(this.vista) ? ' on' : ''}" data-ir="mias">Mis preguntas <span class="ay-badge" data-ay-badge ${noLeidas ? '' : 'hidden'}>${noLeidas}</span></button>
    </div>`;
    const cuerpo = { inicio:this.htmlInicio, nueva:this.htmlNueva, enviada:this.htmlEnviada, mias:this.htmlMias, detalle:this.htmlDetalle }[this.vista].call(this, logueado);
    const scroll = this.root.querySelector('.ay-cuerpo');
    const top = scroll ? scroll.scrollTop : 0;
    this.root.innerHTML = `${this.embebido ? '' : `<header class="ay-cab">
        <div><h2 id="ayTitulo">Centro de ayuda</h2><p>Resuelve tus dudas sobre las herramientas de POLARIS</p></div>
        <button type="button" class="ay-x" data-cerrar aria-label="Cerrar">×</button>
      </header>`}
      ${tabs}
      ${this.htmlAvisos()}
      <div class="ay-cuerpo">${cuerpo}</div>`;
    const nuevo = this.root.querySelector('.ay-cuerpo');
    if (nuevo) nuevo.scrollTop = top;
    if (this.vista === 'nueva') this.pintarSugerencias();
    if (this.vista === 'inicio') this.pintarListaFaq();
  };
  C.htmlAvisos = function () {
    let s = '';
    if (this.red) s += `<div class="ay-aviso"><p>No pudimos conectar con el servidor. Desde la red de CEMEX, haz clic en <strong>Activar conexión</strong> y luego en <strong>Continuar</strong> en la advertencia que aparece.</p>
      <div class="ay-fila"><button type="button" class="ay-btn" data-activar>Activar conexión</button><button type="button" class="ay-btn sec" data-reintentar>Reintentar</button></div></div>`;
    if (this.error) s += `<p class="ay-error" role="alert">${esc(this.error)}</p>`;
    return s;
  };
  C.htmlLogin = function (titulo, texto) {
    const enPortal = !!document.getElementById('pfOpenLogin');
    const accion = enPortal ? '<button type="button" class="ay-btn" data-login>Ingresar</button>' : `<a class="ay-btn" href="${BASE}../index.html">Ir a POLARIS para ingresar</a>`;
    return `<div class="ay-vacio">${svg('chat', 34)}<h3>${esc(titulo)}</h3><p>${esc(texto)}</p>${accion}</div>`;
  };

  /* Inicio: buscador + preguntas frecuentes */
  C.htmlInicio = function () {
    const chips = [['', 'Todas'], ...CATALOGO.map(t => [t.id, t.id])].map(([id, l]) =>
      `<button type="button" class="ay-chip${(this.filtroFaq || '') === id ? ' on' : ''}" data-filtro-faq="${esc(id)}">${esc(l)}</button>`).join('');
    return `<div class="ay-cta">
        <div><strong>¿No encuentras lo que buscas?</strong><span>Escríbele al equipo y sigue la respuesta aquí mismo.</span></div>
        <button type="button" class="ay-btn" data-ir="nueva">Hacer una pregunta</button>
      </div>
      <label class="ay-buscar">${svg('lupa', 17)}<span class="ay-sr">Buscar en preguntas frecuentes</span>
        <input type="search" id="ayBuscarFaq" placeholder="Busca tu duda, por ejemplo: disponibilidad, carnet, placa" value="${esc(this.textoFaq)}" autocomplete="off"></label>
      <div class="ay-chips" role="group" aria-label="Filtrar por herramienta">${chips}</div>
      <div id="ayListaFaq" aria-live="polite"></div>`;
  };
  C.pintarListaFaq = function () {
    const box = this.root.querySelector('#ayListaFaq');
    if (!box) return;
    if (!this.faqs) { box.innerHTML = this.red || this.error ? '' : '<p class="ay-cargando">Cargando…</p>'; return; }
    const base = this.filtroFaq ? this.faqs.filter(f => f.herramienta === this.filtroFaq) : this.faqs;
    const lista = this.textoFaq.trim() ? buscarFaqs(base, this.textoFaq, this.filtroFaq, 30) : base;
    if (!lista.length) {
      box.innerHTML = `<div class="ay-vacio mini"><p>${this.textoFaq.trim() ? 'No encontramos respuestas para tu búsqueda.' : 'Todavía no hay preguntas frecuentes de esta herramienta.'}</p><button type="button" class="ay-link" data-ir="nueva">Haz tu pregunta aquí</button></div>`;
      return;
    }
    box.innerHTML = lista.map(f => this.htmlFaq(f)).join('');
  };
  C.htmlFaq = function (f) {
    const votos = leerJson(KEY_VOTOS, {});
    const pie = votos[f.id] !== undefined
      ? '<p class="ay-gracias">Gracias por tu opinión.</p>'
      : `<div class="ay-voto"><span>¿Te sirvió?</span><button type="button" class="ay-mini" data-voto="${f.id}" data-util="1">Sí</button><button type="button" class="ay-mini" data-voto="${f.id}" data-util="0">No</button></div>`;
    return `<details class="ay-faq"><summary><span>${esc(f.pregunta)}</span><small>${esc([f.herramienta, nombreSeccion(f.herramienta, f.seccion)].filter(Boolean).join(' › '))}</small></summary>
      <div class="ay-faq-r">${esc(f.respuesta)}</div>${pie}</details>`;
  };

  /* Nueva pregunta */
  C.htmlNueva = function (logueado) {
    if (!logueado) return `<button type="button" class="ay-volver" data-ir="inicio">${svg('atras', 15)} Volver</button>` + this.htmlLogin('Ingresa para hacer tu pregunta', 'Así guardamos tu pregunta y puedes seguir la respuesta. Lo que hayas escrito queda guardado.');
    const f = this.form;
    return `<button type="button" class="ay-volver" data-ir="inicio">${svg('atras', 15)} Preguntas frecuentes</button>
      <form class="ay-form" novalidate>
        <h3>Haz tu pregunta</h3>
        ${f.editandoDestino ? this.htmlDestino() : `<div class="ay-destino">
          <div><span class="ay-et">Tu pregunta es sobre</span><strong>${esc(rutaDe(f))}</strong>${f.automatico ? '<small>Lo detectamos según lo que tienes abierto</small>' : ''}</div>
          <button type="button" class="ay-link" data-cambiar-destino>Cambiar</button>
        </div>`}
        <fieldset class="ay-campo"><legend>¿Qué necesitas?</legend><div class="ay-chips">
          ${CATEGORIAS.map(([id, l]) => `<button type="button" class="ay-chip${f.categoria === id ? ' on' : ''}" data-categoria="${id}" aria-pressed="${f.categoria === id}">${esc(l)}</button>`).join('')}
        </div></fieldset>
        <div class="ay-campo">
          <label for="ayTituloP">Tu pregunta</label>
          <input id="ayTituloP" maxlength="140" value="${esc(f.titulo)}" placeholder="Ej.: ¿Cómo sé en qué va mi solicitud?" autocomplete="off">
          <span class="ay-cuenta" id="ayCuentaT">${f.titulo.length}/140</span>
        </div>
        <div id="aySugerencias" aria-live="polite"></div>
        <div class="ay-campo">
          <label for="ayDetalleP">Más detalles <small>(opcional)</small></label>
          <textarea id="ayDetalleP" rows="4" maxlength="2000" placeholder="¿Qué estabas haciendo? ¿Qué esperabas que pasara?">${esc(f.detalle)}</textarea>
          <span class="ay-pista">No incluyas contraseñas ni datos personales de otras personas.</span>
        </div>
        <button type="submit" class="ay-btn ancho"${this.ocupado ? ' disabled' : ''}>${this.ocupado ? 'Enviando…' : 'Enviar pregunta'}</button>
      </form>`;
  };
  C.htmlDestino = function () {
    const f = this.form;
    const t = CATALOGO.find(x => x.id === f.herramienta);
    return `<fieldset class="ay-campo"><legend>¿Sobre qué herramienta es tu pregunta?</legend>
        <div class="ay-tools">${CATALOGO.map(x => `<button type="button" class="ay-tool${f.herramienta === x.id ? ' on' : ''}" data-herramienta="${x.id}" aria-pressed="${f.herramienta === x.id}"><strong>${x.id}</strong><span>${esc(x.desc)}</span></button>`).join('')}</div>
      </fieldset>
      ${t ? `<fieldset class="ay-campo"><legend>¿En qué parte de ${esc(t.id)}?</legend><div class="ay-chips">
        ${t.secciones.map(([id, l]) => `<button type="button" class="ay-chip${f.seccion === id ? ' on' : ''}" data-seccion="${esc(id)}" aria-pressed="${f.seccion === id}">${esc(l)}</button>`).join('')}
        <button type="button" class="ay-chip${f.seccion === null ? ' on' : ''}" data-seccion="" aria-pressed="${f.seccion === null}">No estoy seguro</button>
      </div></fieldset>` : ''}`;
  };
  C.pintarSugerencias = function () {
    const box = this.root.querySelector('#aySugerencias');
    if (!box || !this.form) return;
    const lista = faqsCache ? buscarFaqs(faqsCache, this.form.titulo, this.form.herramienta, 3) : [];
    box.innerHTML = lista.length ? `<div class="ay-sug"><span class="ay-et">Quizá esto responda tu duda</span>${lista.map(f => this.htmlFaq(f)).join('')}</div>` : '';
  };
  C.htmlEnviada = function () {
    return `<div class="ay-vacio ok"><span class="ay-okicon">${svg('ok', 26)}</span><h3>Recibimos tu pregunta</h3>
      <p>Tu número de caso es <strong>#${esc(this.enviadaId)}</strong>. El equipo la revisará y la respuesta te llegará aquí, en <strong>Seguimiento de preguntas</strong>.</p>
      <div class="ay-fila centro"><button type="button" class="ay-btn" data-abrir="${esc(this.enviadaId)}">Ver mi pregunta</button><button type="button" class="ay-btn sec" data-ir="nueva">Hacer otra</button></div></div>`;
  };

  /* Seguimiento */
  C.htmlMias = function (logueado) {
    if (!logueado) return this.htmlLogin('Ingresa para ver tus preguntas', 'Aquí aparece cada pregunta que hagas, con su estado y sus respuestas.');
    if (this.preguntas === null) return this.red || this.error ? '' : '<p class="ay-cargando">Cargando…</p>';
    if (!this.preguntas.length) {
      return `<div class="ay-vacio">${svg('chat', 34)}<h3>¿Tienes alguna pregunta?</h3><p>Hazla aquí. El equipo te responderá y podrás seguir la conversación en esta sección.</p>
        <button type="button" class="ay-btn" data-ir="nueva">Hacer una pregunta</button></div>`;
    }
    const FILTROS = [['todas', 'Todas'], ['pendientes', 'En espera'], ['respondidas', 'Respondidas'], ['cerradas', 'Cerradas']];
    const pasa = p => ({ todas:true, pendientes:['abierta', 'en_proceso'].includes(p.estado), respondidas:p.estado === 'respondida', cerradas:p.estado === 'cerrada' }[this.filtroMias]);
    const lista = this.preguntas.filter(pasa);
    return `<div class="ay-fila entre"><div class="ay-chips">${FILTROS.map(([id, l]) => `<button type="button" class="ay-chip${this.filtroMias === id ? ' on' : ''}" data-filtro-mias="${id}">${l}</button>`).join('')}</div>
        <button type="button" class="ay-btn peq" data-ir="nueva">Nueva pregunta</button></div>
      ${lista.length ? lista.map(p => `<button type="button" class="ay-caso${p.no_leido ? ' nuevo' : ''}" data-abrir="${p.id}">
        <span class="ay-caso-top"><span class="ay-estado ${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span>${p.no_leido ? '<span class="ay-nuevo">Respuesta nueva</span>' : ''}<small>${esc(fecha(p.actualizada_en))}</small></span>
        <strong>${esc(p.titulo)}</strong>
        <small class="ay-ruta">#${p.id} · ${esc(rutaDe(p))}</small>
        ${p.ultimo_mensaje ? `<span class="ay-prev">${esc(p.ultimo_mensaje)}</span>` : ''}
      </button>`).join('') : '<div class="ay-vacio mini"><p>No tienes preguntas en este estado.</p></div>'}`;
  };
  C.htmlDetalle = function () {
    if (!this.detalle) return this.red || this.error ? '' : '<p class="ay-cargando">Cargando…</p>';
    const { pregunta:p, mensajes } = this.detalle;
    const ETIQUETA = { agente:'Equipo POLARIS', ia:'Asistente POLARIS', usuario:'Tú' };
    const burbuja = (tipo, nombre, cont, cuando) => tipo === 'sistema'
      ? `<p class="ay-sis">${esc(cont)}</p>`
      : `<div class="ay-msg ${tipo === 'usuario' ? 'yo' : 'el'}"><span class="ay-autor">${esc(tipo === 'usuario' ? ETIQUETA.usuario : (nombre || ETIQUETA[tipo]))}${tipo === 'ia' ? ' <em>Respuesta automática</em>' : ''}</span><div class="ay-burbuja">${esc(cont)}</div><time>${esc(fecha(cuando))}</time></div>`;
    const inicial = p.titulo + (p.detalle ? '\n\n' + p.detalle : '');
    const califica = p.estado === 'respondida'
      ? `<div class="ay-califica"><span>¿Esta respuesta resolvió tu duda?</span><div class="ay-fila"><button type="button" class="ay-btn peq" data-calificar="1">Sí, gracias</button><button type="button" class="ay-btn sec peq" data-calificar="0">No, sigo con la duda</button></div></div>` : '';
    return `<button type="button" class="ay-volver" data-ir="mias">${svg('atras', 15)} Mis preguntas</button>
      <div class="ay-det-cab"><div><strong>#${p.id} · ${esc(p.titulo)}</strong><small>${esc(rutaDe(p))}</small></div><span class="ay-estado ${esc(p.estado)}">${esc(ESTADOS[p.estado] || p.estado)}</span></div>
      <div class="ay-hilo">${burbuja('usuario', '', inicial, p.creada_en)}${mensajes.map(m => burbuja(m.autor_tipo, m.autor_nombre, m.contenido, m.creado_en)).join('')}
        ${mensajes.some(m => m.autor_tipo !== 'usuario' && m.autor_tipo !== 'sistema') ? '' : '<p class="ay-sis">El equipo ya tiene tu pregunta. La respuesta aparecerá aquí.</p>'}</div>
      ${califica}
      <form class="ay-responder"><label for="ayRespuesta" class="ay-sr">Escribe un mensaje</label>
        <textarea id="ayRespuesta" rows="2" maxlength="2000" placeholder="${p.estado === 'cerrada' ? 'Escribe aquí si necesitas retomar esta pregunta' : 'Escribe un mensaje'}"></textarea>
        <div class="ay-fila entre">${p.estado === 'cerrada' ? '<span></span>' : '<button type="button" class="ay-link" data-cerrar-caso>Ya resolví mi duda</button>'}<button type="submit" class="ay-btn peq"${this.ocupado ? ' disabled' : ''}>Enviar</button></div></form>`;
  };

  /* ---------------- Eventos ---------------- */
  C.alClic = function (e) {
    const b = e.target.closest('button, a');
    if (!b || !this.root.contains(b)) return;
    const d = b.dataset, self = this, f = this.form;
    if (d.cerrar !== undefined) { Ayuda.cerrar(); return; }
    if (d.activar !== undefined) { P.activarConexion(); return; }
    if (d.reintentar !== undefined) { this.reintentar(); return; }
    if (d.login !== undefined) { this.guardarBorrador(); Ayuda.cerrar(); document.getElementById('pfOpenLogin').click(); return; }
    if (d.ir) { this.ir(d.ir, d.ir === 'nueva' && this.embebido ? { origen:'centro' } : (d.ir === 'nueva' ? this.ctxInicial : undefined)); return; }
    if (d.abrir) { this.ir('detalle', Number(d.abrir)); return; }
    if (d.filtroFaq !== undefined) { this.filtroFaq = d.filtroFaq || null; this.pintar(); return; }
    if (d.filtroMias) { this.filtroMias = d.filtroMias; this.pintar(); return; }
    if (d.cambiarDestino !== undefined) { f.editandoDestino = true; f.automatico = false; f.pagina = null; this.pintar(); return; }
    if (d.herramienta) { f.herramienta = d.herramienta; f.seccion = null; f.pagina = null; this.error = null; this.pintar(); return; }
    if (d.seccion !== undefined) { f.seccion = d.seccion || null; this.pintar(); return; }
    if (d.categoria) { f.categoria = d.categoria; this.pintar(); return; }
    if (d.voto) {
      const v = leerJson(KEY_VOTOS, {}); v[d.voto] = d.util === '1'; guardarJson(KEY_VOTOS, v);
      P.llamar('/ayuda/faq-voto', { faq_id:Number(d.voto), util:d.util === '1' }).catch(() => {});
      const det = b.closest('.ay-faq');
      if (det) det.querySelector('.ay-voto').outerHTML = '<p class="ay-gracias">Gracias por tu opinión.</p>';
      return;
    }
    if (d.calificar !== undefined) {
      const util = d.calificar === '1', id = this.detalle.pregunta.id;
      this.ejecutar(() => llamar('/preguntas/calificar', { id, util }), () => {
        self.preguntas = null; self.cargarDetalle(id);
        if (!util) setTimeout(() => { const t = self.root.querySelector('#ayRespuesta'); if (t) t.focus(); }, 400);
      });
      return;
    }
    if (d.cerrarCaso !== undefined) {
      const id = this.detalle.pregunta.id;
      this.ejecutar(() => llamar('/preguntas/cerrar', { id }), () => { self.preguntas = null; self.cargarDetalle(id); });
    }
  };
  C.alEscribir = function (e) {
    const t = e.target;
    if (t.id === 'ayBuscarFaq') { this.textoFaq = t.value; this.pintarListaFaq(); return; }
    if (!this.form) return;
    if (t.id === 'ayTituloP') {
      this.form.titulo = t.value;
      if (this.error) { this.error = null; const er = this.root.querySelector('.ay-error'); if (er) er.remove(); }
      const c = this.root.querySelector('#ayCuentaT');
      if (c) c.textContent = `${t.value.length}/140`;
      this.pintarSugerencias();
      this.guardarBorrador();
    }
    if (t.id === 'ayDetalleP') { this.form.detalle = t.value; this.guardarBorrador(); }
  };
  C.alEnviar = function (formEl) {
    if (this.ocupado) return;
    const self = this;
    if (formEl.classList.contains('ay-responder')) {
      const area = formEl.querySelector('textarea'), contenido = area.value.trim();
      if (!contenido) { area.focus(); return; }
      const id = this.detalle.pregunta.id;
      this.ejecutar(() => llamar('/preguntas/responder', { id, contenido }), () => { self.preguntas = null; self.cargarDetalle(id); });
      return;
    }
    const f = this.form;
    this.error = null;
    if (!f.herramienta) { this.error = 'Elige la herramienta sobre la que tienes la duda.'; this.pintar(); return; }
    if (f.titulo.trim().length < 5) { this.error = 'Escribe tu pregunta (mínimo 5 caracteres).'; this.pintar(); const i = this.root.querySelector('#ayTituloP'); if (i) i.focus(); return; }
    this.pintar();
    this.ejecutar(() => llamar('/preguntas/crear', {
      herramienta:f.herramienta, seccion:f.seccion, pagina:f.pagina, categoria:f.categoria, titulo:f.titulo.trim(), detalle:f.detalle.trim(), origen:f.origen
    }), d => {
      borrarLocal(KEY_BORRADOR);
      self.form = null; self.preguntas = null; self.enviadaId = d.id;
      self.vista = 'enviada';
      self.pintar();
      actualizarContador(true);
      const cuerpo = self.root.querySelector('.ay-cuerpo');
      if (cuerpo) cuerpo.scrollTop = 0;
    });
  };
  C.reintentar = function () {
    if (!this.reintento) return;
    const r = this.reintento;
    this.red = false;
    r();
  };

  /* =======================================================================
     Panel lateral + botones que se insertan solos
     ======================================================================= */
  let panel = null, fondo = null, centro = null, ultimoFoco = null;
  function crearPanel() {
    if (panel) return;
    fondo = document.createElement('div');
    fondo.className = 'ay-fondo';
    fondo.hidden = true;
    fondo.addEventListener('click', () => Ayuda.cerrar());
    panel = document.createElement('aside');
    panel.className = 'ay-panel ay-app';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'ayTitulo');
    panel.hidden = true;
    document.body.append(fondo, panel);
    centro = new Centro(panel);
  }
  function cargarEstilos() {
    if (document.querySelector('link[data-ayuda]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = BASE + 'ayuda.css?v=1'; l.setAttribute('data-ayuda', '1');
    document.head.appendChild(l);
  }

  const Ayuda = window.Ayuda = {
    /* vista: 'inicio' | 'nueva' | 'mias'. ctx: {herramienta, seccion, pagina, origen} */
    abrir(vista, ctx) {
      crearPanel();
      ultimoFoco = document.activeElement;
      panel.hidden = false; fondo.hidden = false;
      document.body.classList.add('ay-bloqueo');
      centro.ctxInicial = ctx || null;
      centro.ir(vista || 'inicio', ctx);
      const x = panel.querySelector('.ay-x');
      if (x) x.focus();
    },
    cerrar() {
      if (!panel || panel.hidden) return;
      panel.hidden = true; fondo.hidden = true;
      document.body.classList.remove('ay-bloqueo');
      if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    },
    /* Vista completa dentro de la página (portal) */
    embeber(el) {
      el.classList.add('ay-app', 'ay-embebido');
      const c = new Centro(el, { embebido:true });
      return { ir:(v, d) => c.ir(v, d), refrescar:() => { c.preguntas = null; c.ir(c.vista === 'enviada' || c.vista === 'detalle' ? 'mias' : c.vista); } };
    },
    contador:actualizarContador
  };

  /* Botón del encabezado de cada tablero o app: abre con lo que está abierto ya seleccionado */
  function insertarBotones() {
    document.querySelectorAll('.page-header').forEach(h => {
      if (h.querySelector('.ay-hdr')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ay-hdr';
      b.innerHTML = `${svg('ayuda', 16)}<span>Tengo una pregunta</span><span class="ay-badge" data-ay-badge hidden>0</span>`;
      b.addEventListener('click', e => {
        e.stopPropagation();
        Ayuda.abrir('nueva', Object.assign(contextoAbierto(), { origen:'contexto' }));
      });
      h.appendChild(b);
    });
    if (!HERRAMIENTA_PAGINA) return;
    document.querySelectorAll('.cx-manual-section').forEach(s => {
      if (s.querySelector('.ay-banda')) return;
      const d = document.createElement('div');
      d.className = 'ay-banda';
      d.innerHTML = `<div>${svg('chat', 20)}<span><strong>¿Tienes una duda sobre ${esc(HERRAMIENTA_PAGINA)}?</strong> Revisa las preguntas frecuentes o escríbele al equipo.</span></div>
        <div class="ay-banda-acc"><button type="button" class="ay-btn sec peq" data-ay-mias>Mis preguntas <span class="ay-badge" data-ay-badge hidden>0</span></button><button type="button" class="ay-btn peq" data-ay-preguntar>Hacer una pregunta</button></div>`;
      d.querySelector('[data-ay-preguntar]').addEventListener('click', () => Ayuda.abrir('nueva', { herramienta:HERRAMIENTA_PAGINA, origen:'herramienta' }));
      d.querySelector('[data-ay-mias]').addEventListener('click', () => Ayuda.abrir('mias'));
      s.appendChild(d);
    });
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') Ayuda.cerrar(); });
  window.addEventListener('focus', () => {
    actualizarContador();
    if (centro && panel && !panel.hidden && centro.red) centro.reintentar();
  });
  document.addEventListener('pf:sesion', () => {
    if (centro) { centro.preguntas = null; centro.detalle = null; }
    actualizarContador(true);
  });

  cargarEstilos();
  insertarBotones();
  actualizarContador(true);
})();
