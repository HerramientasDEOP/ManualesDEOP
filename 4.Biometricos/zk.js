/* =========================================================================
   Manual Biométricos ZKTeco · Planta Centenario (POLARIS).
   - Equipo: pantalla de 300 × 500 px lógicos que se dibuja según E.pantalla.
     Cada elemento con acción lleva data-act; los que usa el recorrido, data-t.
   - Solo responden las opciones que cubre la guía; el resto se ve pero no hace nada.
   - Recorridos: cada paso resalta un elemento y avanza con un evento del equipo
     (emitir('pantalla:menu'), 'huella-ok', 'reinicio-listo'…) o con "Siguiente".
   Datos de ejemplo: nombres y cédulas inventados.
   ========================================================================= */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const P = window.Plataforma;
  const HASH_ADMIN = '2e8d9164c528e073ffaa2419518d5548560d8602696f90a2376b5591f3efad02';
  const IP_SERVIDOR = '10.80.8.105';
  const CLAVE_PC = '123456';
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pfConsulta = s => { try { if (P) P.registrarConsulta('Biométricos', s); } catch (e) {} };

  /* ---------------- Íconos ---------------- */
  const G = {
    persona:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
    personaMas:'<circle cx="10" cy="8" r="4"/><path d="M3 21c0-4 3-7 7-7 2 0 3.5.6 4.7 1.6"/><path d="M19 14v6M16 17h6"/>',
    escudo:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><circle cx="12" cy="11" r="2"/><path d="M12 13v3"/>',
    antena:'<path d="M5 20l4.5-8"/><path d="M4 9a8 8 0 0 0 11 11z"/><path d="M14 6a4 4 0 0 1 4 4"/><path d="M14 2a8 8 0 0 1 8 8"/>',
    engrane:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    paleta:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    datos:'<ellipse cx="11" cy="5" rx="7" ry="3"/><path d="M4 5v12c0 1.7 3.1 3 7 3"/><path d="M18 5v5"/><path d="M4 11c0 1.7 3.1 3 7 3"/><circle cx="18" cy="17" r="3"/>',
    tarjetas:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2"/><path d="M14 10h4M14 14h4"/>',
    puerta:'<path d="M5 21V4l9-2v19"/><path d="M14 4h5v17"/><path d="M3 21h18"/><circle cx="11" cy="12" r=".8"/>',
    usb:'<rect x="8" y="2" width="8" height="6" rx="1"/><path d="M6 8h12v8a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M10.5 5h.01M13.5 5h.01"/>',
    evento:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><circle cx="11" cy="13" r="3"/><path d="M13.3 15.3L16 18"/>',
    codigo:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 10l-2 2 2 2M15 10l2 2-2 2M13 9l-2 6"/>',
    monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 8h10M7 11h6"/>',
    lista:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4M7 13h10M7 16h6"/><circle cx="16" cy="9" r="1.5"/>',
    estilo:'<circle cx="12" cy="12" r="9"/><path d="M8 13c1.5 2 6.5 2 8 0"/>',
    globo:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    serial:'<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h.01M10 12h.01M13 12h.01M16 12h.01"/>',
    pc:'<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
    wifi:'<path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
    nube:'<path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5z"/>',
    wiegand:'<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="10" cy="17" r="1.5"/>',
    diag:'<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    reloj:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    asistencia:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    cara:'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r=".6"/><circle cx="15" cy="10" r=".6"/><path d="M9 15c1.5 1.2 4.5 1.2 6 0"/>',
    huella:'<path d="M12 11c0 3.5-1 6.5-3 9"/><path d="M8.5 8.6A4 4 0 0 1 16 11c0 2-.3 4-1 6"/><path d="M5.5 7.5A8 8 0 0 1 20 11c0 1.4-.1 2.8-.4 4"/><path d="M4.4 13c.1-1 .1-2 .1-2"/><path d="M12 15c0 2-.5 4-1.5 5.5"/>',
    tipo:'<path d="M4 8h16M4 16h16"/><path d="M8 4l-4 4 4 4M16 12l4 4-4 4"/>',
    firmware:'<path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.3 4.3 0 0 1-.5 8.5z"/><path d="M12 11v6M9.5 13.5L12 11l2.5 2.5"/>',
    reiniciar:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    atras:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    menu:'<path d="M5 7h14M5 12h14M5 17h14"/>',
    teclado:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
    verif:'<path d="M8 12a4 4 0 0 1 8 0"/><path d="M5 12a7 7 0 0 1 14 0"/><circle cx="12" cy="12" r="1"/>',
    borrar:'<path d="M20 6H9l-6 6 6 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><path d="M12 10l4 4M16 10l-4 4"/>',
    arriba:'<path d="M6 15l6-6 6 6"/>',
    abajo:'<path d="M6 9l6 6 6-6"/>',
    lupa:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    ethernet:'<rect x="5" y="6" width="14" height="12" rx="1"/><path d="M9 18v-3M12 18v-3M15 18v-3"/>'
  };
  const svg = (g, ancho) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${ancho || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[g]}</svg>`;
  const mini = (g, color) => `<span class="zs-mini" style="background:${color}">${svg(g, 2.4)}</span>`;

  /* ---------------- Estado del equipo ---------------- */
  const USUARIOS_INICIALES = [
    { id:'1', nombre:'', fp:1, face:0, foto:0 },
    { id:'2', nombre:'', fp:0, face:1, foto:1 },
    { id:'52789341', nombre:'martha lucia gomez', fp:1, face:1, foto:1 },
    { id:'79845123', nombre:'jorge andres patino', fp:1, face:1, foto:1 },
    { id:'80123456', nombre:'luis fernando castro', fp:1, face:1, foto:1 },
    { id:'1014287365', nombre:'sandra milena torres', fp:0, face:1, foto:1 },
    { id:'1023456789', nombre:'laura mendez ruiz', fp:1, face:1, foto:1 },
    { id:'1032478596', nombre:'diana carolina rojas', fp:1, face:0, foto:0 }
  ];
  function estadoInicial(){
    return {
      usuarios:USUARIOS_INICIALES.map(u => Object.assign({}, u)),
      red:{ barra:true, dhcp:false, ip:'10.85.15.73', mascara:'255.255.255.0', puerta:'10.85.15.1', dns:'10.80.11.222' },
      pc:{ clave:'0', id:'1', puerto:'4370', https:true },
      nube:{ modo:'ADMS', dominio:false, ip:'10.85.15.69', puerto:'8081', proxy:false },
      tipo:{ protocolo:'Protocolo PUSH', dispositivo:'PUSH de CA' },
      seg:{ standalone:false, ssh:false, mascara:false, nombre:false, modo:false, foto:false }
    };
  }
  const SEG_OBJETIVO = { standalone:true, ssh:true, mascara:true, nombre:false, modo:false, foto:true };
  const SEG_ROTULOS = [['standalone', 'Comunicación Standalone'], ['ssh', 'SSH'], ['mascara', 'Enmascaramiento de ID de usuario'], ['nombre', 'Mostrar nombre de verificación'], ['modo', 'Mostrar Modo de verificación'], ['foto', 'Guardar foto como plantilla']];

  const E = { d:estadoInicial(), pantalla:'home', form:null, sel:null, dedo:6, captura:null, rostro:null, kb:null, dlg:null, reiniciando:false };
  const PADRE = { menu:'home', usuarios:'menu', todos:'usuarios', usuario:'todos', borrar:'usuario', dedos:'form', red:'menu', ethernet:'red', pc:'red', nube:'red', sistema:'menu', tipo:'sistema', protocolo:'tipo', tipodisp:'tipo', seguridad:'sistema' };
  const usuarioSel = () => E.d.usuarios.find(u => u.id === E.sel);
  const ordenados = () => [...E.d.usuarios].sort((a, b) => (a.id.length - b.id.length) || a.id.localeCompare(b.id));
  function siguienteId(){ let n = 1; const ids = new Set(E.d.usuarios.map(u => u.id)); while (ids.has(String(n))) n++; return String(n); }

  /* ---------------- Dibujo de cada pantalla ---------------- */
  const cab = (titulo, sinAtras) => `<div class="zs-cab">${sinAtras ? '' : `<button type="button" class="zs-atras" data-act="atras" data-t="atras" aria-label="Atrás">${svg('atras', 2.2)}</button>`}<span class="zs-tit">${esc(titulo)}</span></div>`;
  const item = (texto, icono, color, act, t) => `<button type="button" class="zs-item${act ? '' : ' off'}"${act ? ` data-act="${act}"` : ''}${t ? ` data-t="${t}"` : ''}>${icono ? mini(icono, color) : ''}<span>${esc(texto)}</span></button>`;
  const campo = (et, val, act, t, extra) => `<button type="button" class="zs-campo${act ? '' : ' off'}"${act ? ` data-act="${act}"` : ''}${t ? ` data-t="${t}"` : ''}${extra || ''}><span class="et">${esc(et)}</span><span class="val">${esc(val)}</span></button>`;
  const fila = (et, on, act, t, extra) => `<button type="button" class="zs-campo fila${act ? '' : ' off'}"${act ? ` data-act="${act}"` : ''}${t ? ` data-t="${t}"` : ''}${extra || ''}><span class="et">${esc(et)}</span><span class="zs-toggle${on ? ' on' : ''}"></span></button>`;
  const op = (texto, on, act) => `<button type="button" class="zs-op" data-act="${act}" data-v="${esc(texto)}" data-t="op-${slug(texto)}"><span class="zs-radio${on ? ' on' : ''}"></span><span>${esc(texto)}</span></button>`;

  function horaTexto(){ const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function fechaTexto(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${DIAS[d.getDay()]}`; }

  const PANTALLAS = {
    home(){
      const conectado = E.d.nube.ip === IP_SERVIDOR && E.d.red.dhcp;
      return `<div class="zs zs-inicio">
        <div class="zs-estado"><span>${svg('ethernet')}</span><span style="color:${conectado ? '#4ea533' : '#9aa0aa'}">${svg('nube')}</span></div>
        <div class="zs-hora" id="zsHora">${horaTexto()}</div>
        <div class="zs-fecha" id="zsFecha">${fechaTexto()}</div>
        <div class="zs-bienvenido">Bienvenido</div>
        <div class="zs-verif"><span>${svg('verif', 2.2)}</span></div>
        <div class="zs-pie">
          <button type="button" class="zs-redondo off" aria-label="Verificar con ID">${svg('teclado')}</button>
          <button type="button" class="zs-redondo" data-act="menu" data-t="menu" aria-label="Menú">${svg('menu', 2.4)}</button>
        </div></div>`;
    },
    menu(){
      const apps = [['Usuarios', 'persona', '#3a9be6', 'usuarios'], ['Privilegios', 'escudo', '#2f6fd8'], ['Red', 'antena', '#ea5a8c', 'red'],
        ['Sistema', 'engrane', '#5fb33f', 'sistema'], ['Personalizar', 'paleta', '#ea5a8c'], ['Datos', 'datos', '#28a5d8'],
        ['Intercomunicador', 'tarjetas', '#4cb86a'], ['Acceso', 'puerta', '#f08a34'], ['Gestión USB', 'usb', '#3d7fe0'],
        ['Búsqueda de Eventos', 'evento', '#f08a34'], ['Pruebas', 'codigo', '#3d7fe0'], ['Información', 'monitor', '#22b2bf']];
      return `<div class="zs">${cab('Menú Principal')}<div class="zs-cuerpo"><div class="zs-grid">${apps.map(([n, g, c, act]) =>
        `<button type="button" class="zs-app${act ? '' : ' off'}"${act ? ` data-act="${act}" data-t="m-${act}"` : ''}><i style="background:linear-gradient(160deg,${c},${c}dd)">${svg(g, 1.9)}</i><span>${esc(n)}</span></button>`).join('')}</div></div></div>`;
    },
    usuarios(){
      return `<div class="zs">${cab('Usuarios')}<div class="zs-cuerpo">
        ${item('Nuevo Usuario', 'personaMas', '#3a9be6', 'nuevo', 'u-nuevo')}${item('Todos los Usuarios', 'lista', '#f08a34', 'todos', 'u-todos')}${item('Estilo de Pantalla', 'estilo', '#5fb33f')}</div></div>`;
    },
    form(){
      const f = E.form, nuevo = f.modo === 'nuevo';
      return `<div class="zs">${cab(nuevo ? 'Nuevo Usuario' : `Editar : ${f.id}`)}<div class="zs-cuerpo">
        ${campo('ID de Usuario', f.id, nuevo ? 'kb-id' : null, 'f-id')}
        ${campo('Nombre', f.nombre, 'kb-nombre', 'f-nombre')}
        ${campo('Privilegios de Usuario', 'Usuario Normal', null, 'f-priv')}
        ${campo('Huella', String(f.fp), 'huella', 'f-huella')}
        ${campo('Rostro', String(f.face), 'rostro', 'f-rostro')}
        ${campo('Tarjeta', '0', null, 'f-otros')}
        ${campo('Contraseña', '', null, 'f-otros')}
        ${campo('Foto de Usuario', String(f.foto || 0), null, 'f-otros')}
        ${campo('Privilegios de Acceso', '', null, 'f-otros')}</div></div>`;
    },
    dedos(){
      const izq = [[0, 16, 50, 30], [1, 36, 32, 40], [2, 56, 22, 48], [3, 76, 30, 42]];
      const der = [[6, 180, 30, 42], [7, 200, 22, 48], [8, 220, 32, 40], [9, 240, 50, 30]];
      const dedo = ([n, x, y, h]) => `<g data-act="dedo" data-dedo="${n}" data-t="finger-${n}"><rect class="dedo${n === E.dedo ? ' sel' : ''}" x="${x}" y="${y}" width="14" height="${h}" rx="7"/><text x="${x + 7}" y="${y + h / 2 + 3}">${n}</text></g>`;
      const pulgar = (n, cx, rot) => `<g data-act="dedo" data-dedo="${n}" data-t="finger-${n}"><rect class="dedo${n === E.dedo ? ' sel' : ''}" x="${cx - 14}" y="84" width="28" height="13" rx="6.5" transform="rotate(${rot} ${cx} 90)"/><text x="${cx}" y="93">${n}</text></g>`;
      return `<div class="zs">${cab('Registrar Huella')}<div class="zs-cuerpo">
        <div class="zs-manos"><svg viewBox="0 0 270 130">
          <ellipse class="palma" cx="58" cy="102" rx="34" ry="24"/><ellipse class="palma" cx="214" cy="102" rx="34" ry="24"/>
          ${izq.map(dedo).join('')}${der.map(dedo).join('')}${pulgar(4, 112, -25)}${pulgar(5, 160, 25)}
        </svg></div>
        <div class="zs-indica">Seleccione el dedo</div></div></div>`;
    },
    captura(){
      const c = E.captura, n = c.toques;
      const segs = 26, llenos = Math.round(segs * n / 3);
      let anillo = '';
      for (let i = 0; i < segs; i++){
        const a = (-200 + i * (220 / (segs - 1))) * Math.PI / 180;
        const x1 = 80 + Math.cos(a) * 62, y1 = 80 + Math.sin(a) * 62, x2 = 80 + Math.cos(a) * 72, y2 = 80 + Math.sin(a) * 72;
        const color = i < llenos ? (i < segs / 3 ? '#e8c72a' : '#8cc63f') : '#d5d8de';
        anillo += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
      }
      const ord = ['1ra', '2da', '3ra'];
      const msg = c.listo ? 'Registro exitoso' : `Presione la huella ${ord[n]} vez`;
      return `<div class="zs">${cab('Registrar Huella(' + E.dedo + ')')}<div class="zs-cuerpo">
        <div class="zs-captura-msg">${msg}</div><div class="zs-calidad">${c.calidad || ''}</div>
        <div class="zs-anillo"><svg viewBox="0 0 160 160">${anillo}
          <circle cx="80" cy="80" r="52" fill="#f6f7f9" stroke="#c9ccd3" stroke-width="2"/>
          <g transform="translate(46 46) scale(2.85)" fill="none" stroke="${n ? '#5f6470' : '#a5a9b2'}" stroke-width="1.3" stroke-linecap="round">${G.huella}</g>
          ${c.listo ? '<path d="M56 82l16 15 32-36" fill="none" stroke="#5fb336" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' : ''}
        </svg></div>
        <div class="zs-pasos">${[1, 2, 3].map(i => `<span class="${i <= n ? 'ok' : ''}">${i}</span>`).join('')}</div></div></div>`;
    },
    rostro(){
      const r = E.rostro;
      return `<div class="zs">${cab('Registrar Rostro')}<div class="zs-camara">
        <svg class="zs-cara" viewBox="0 0 170 220" aria-hidden="true">
          <ellipse cx="85" cy="92" rx="46" ry="56" fill="#8a8f9c"/><path d="M10 220c6-48 38-68 75-68s69 20 75 68z" fill="#7a7f8c"/>
          <ellipse cx="85" cy="88" rx="40" ry="50" fill="#a3a7b2"/>
        </svg>
        <div class="zs-marco"><i></i><i></i><i></i><i></i></div>
        <div class="zs-cara-msg">${r.listo ? 'La calidad del template es buena' : 'Mire a la cámara, dentro del recuadro'}</div>
        <div class="zs-barra"><i style="width:${r.prog}%"></i></div></div></div>`;
    },
    todos(){
      return `<div class="zs">${cab('Todos los Usuarios')}<div class="zs-cuerpo" style="padding-bottom:40px">${ordenados().map(u =>
        `<button type="button" class="zs-usr" data-act="usr" data-id="${esc(u.id)}" data-t="user-${esc(u.id)}"><span class="l1"><span>${esc(u.id)}</span><span class="marcas">${u.fp ? svg('huella', 1.8) : ''}${u.face ? svg('cara', 1.8) : ''}</span></span><span class="l2">${esc(u.nombre)}</span></button>`).join('')}</div>
        <div class="zs-buscar">${svg('lupa', 2.2)}</div></div>`;
    },
    usuario(){
      return `<div class="zs">${cab('Usuario : ' + E.sel)}<div class="zs-cuerpo">${item('Editar', null, null, 'editar', 'us-editar')}${item('Borrar', null, null, 'borrar', 'us-borrar')}</div></div>`;
    },
    borrar(){
      const u = usuarioSel();
      const ops = [['usuario', 'Borrar Usuario']];
      if (u.fp) ops.push(['huella', 'Borrar Huella']);
      if (u.face) ops.push(['rostro', 'Sólo Borrar Rostro']);
      if (u.foto) ops.push(['foto', 'Borrar Foto de Usuario']);
      return `<div class="zs">${cab('Borrar : ' + u.id)}<div class="zs-cuerpo">${ops.map(([k, t]) => `<button type="button" class="zs-item" data-act="del" data-tipo="${k}" data-t="del-${k}"><span>${esc(t)}</span></button>`).join('')}</div></div>`;
    },
    red(){
      return `<div class="zs">${cab('Red')}<div class="zs-cuerpo">
        ${item('Ethernet', 'globo', '#2f7be0', 'ethernet', 'r-ethernet')}${item('Serial', 'serial', '#f07a34')}${item('Conexión a PC', 'pc', '#4cb86a', 'pc', 'r-pc')}
        ${item('Wi-Fi', 'wifi', '#2f9be8')}${item('Conf. Srvr. de Nube', 'nube', '#4cb86a', 'nube', 'r-nube')}${item('Ajustes Wiegand', 'wiegand', '#e85a5a')}${item('Diagnóstico de Red', 'diag', '#6b5fd8')}</div></div>`;
    },
    ethernet(){
      const r = E.d.red;
      return `<div class="zs">${cab('Ethernet')}<div class="zs-cuerpo">
        ${fila('Mostrar en la Barra de Estado', r.barra)}<div class="zs-seccion">IPv4</div>
        ${campo('Dirección IP', r.ip)}${campo('Máscara de Subred', r.mascara)}${campo('Puerta de Enlace', r.puerta)}${campo('DNS', r.dns)}
        ${fila('DHCP', r.dhcp, 'dhcp', 'e-dhcp')}</div></div>`;
    },
    pc(){
      const c = E.d.pc;
      return `<div class="zs">${cab('Conexión a PC')}<div class="zs-cuerpo">
        ${campo('Clave de Comunicación', '*'.repeat(Math.max(6, c.clave.length)), 'kb-clave', 'pc-clave')}${campo('ID del Dispositivo', c.id)}${campo('Puerto TCP', c.puerto)}
        ${fila('HTTPS', c.https, 'https', 'pc-https')}</div></div>`;
    },
    nube(){
      const n = E.d.nube;
      return `<div class="zs">${cab('Conf. Srvr. de Nube')}<div class="zs-cuerpo">
        ${campo('Modo de Servidor', n.modo)}${fila('Habilitar Nombre de Dominio', n.dominio)}
        ${campo('Dirección del Servidor', n.ip, 'kb-ip', 'n-ip')}${campo('Puerto del Servidor', n.puerto)}${fila('Habilitar Servidor Proxy', n.proxy)}</div></div>`;
    },
    sistema(){
      return `<div class="zs">${cab('Sistema')}<div class="zs-cuerpo">
        ${item('Fecha y Hora', 'reloj', '#2f7be0')}${item('Asistencia', 'asistencia', '#f08a34')}${item('Rostro', 'cara', '#4cb86a')}${item('Huella', 'huella', '#2f9be8')}
        ${item('Tipo de Dispositivo', 'tipo', '#2f6fd8', 'tipo', 's-tipo')}${item('Configuración de seguridad', 'escudo', '#e8603a', 'seguridad', 's-seguridad')}
        ${item('Actualización por USB', 'usb', '#e04848')}${item('Actualizar Firmware en línea', 'firmware', '#f08a34')}${item('Reiniciar Equipo', 'reiniciar', '#4cb86a')}</div></div>`;
    },
    tipo(){
      const t = E.d.tipo;
      return `<div class="zs">${cab('Tipo de Dispositivo')}<div class="zs-cuerpo">${campo('Protocolo de comunicación', t.protocolo, 'protocolo', 't-protocolo')}${campo('Tipo de dispositivo', t.dispositivo, 'tipodisp', 't-tipodisp')}</div></div>`;
    },
    protocolo(){
      const v = E.d.tipo.protocolo;
      return `<div class="zs">${cab('Protocolo de comunicación')}<div class="zs-cuerpo">${op('Protocolo PUSH', v === 'Protocolo PUSH', 'set-protocolo')}${op('Protocolo BEST', v === 'Protocolo BEST', 'set-protocolo')}</div></div>`;
    },
    tipodisp(){
      const v = E.d.tipo.dispositivo;
      return `<div class="zs">${cab('Tipo de dispositivo')}<div class="zs-cuerpo">${op('PUSH de T&A', v === 'PUSH de T&A', 'set-tipodisp')}${op('PUSH de CA', v === 'PUSH de CA', 'set-tipodisp')}</div></div>`;
    },
    seguridad(){
      const s = E.d.seg;
      return `<div class="zs">${cab('Configuración de seguridad')}<div class="zs-cuerpo">${SEG_ROTULOS.map(([k, t]) => fila(t, s[k], 'seg', 'seg-' + k, ` data-k="${k}"`)).join('')}</div></div>`;
    }
  };

  /* ---------------- Teclados del equipo ---------------- */
  const ROTULO_KB = { id:'ID de Usuario', nombre:'Nombre', clave:'Clave de Comunicación', ip:'Dirección del Servidor' };
  const tecla = (k, cont, cls, extra) => `<button type="button" class="zk-tecla${cls ? ' ' + cls : ''}" data-k="${esc(k)}"${extra || ''}>${cont}</button>`;
  function pintarTeclado(){
    const kb = E.kb;
    let arriba;
    if (kb.tipo === 'ip'){
      arriba = `<div class="zk-kb-ip">${kb.octetos.map((o, i) => `<button type="button" data-k="oct${i}" class="${i === kb.idx ? 'on' : ''}">${esc(o)}</button>${i < 3 ? '<span>.</span>' : ''}`).join('')}</div><div class="zk-kb-val"></div>`;
    } else {
      const mostrar = kb.campo === 'clave' ? '*'.repeat(kb.valor.length) : kb.valor;
      arriba = kb.aviso ? `<div class="zk-kb-val aviso">${esc(kb.aviso)}</div>` : `<div class="zk-kb-val"><span>${esc(mostrar)}</span><i class="cursor"></i></div>`;
    }
    let teclas;
    if (kb.tipo === 'alfa'){
      const f1 = 'qwertyuiop', f2 = 'asdfghjklñ', f3 = 'zxcvbnm';
      teclas = `<div class="zk-teclas alfa">${[...f1, ...f2].map(c => tecla(c, c)).join('')}${[...f3].map(c => tecla(c, c)).join('')}
        ${tecla('-', '-')}${tecla('borrar', svg('borrar'), 'gris ancho2')}
        ${tecla('esc', 'ESC', 'gris ancho2')}${tecla('123', '123', 'gris')}${tecla(' ', 'espacio', '', ' style="grid-column:span 5"')}${tecla('ok', 'OK', 'ok ancho2')}</div>`;
    } else {
      teclas = `<div class="zk-teclas num">${tecla('1', '1')}${tecla('2', '2')}${tecla('3', '3')}${tecla('borrar', svg('borrar'), 'gris')}
        ${tecla('4', '4')}${tecla('5', '5')}${tecla('6', '6')}${tecla('arriba', svg('arriba'), 'gris')}
        ${tecla('7', '7')}${tecla('8', '8')}${tecla('9', '9')}${tecla('abajo', svg('abajo'), 'gris')}
        ${tecla('esc', 'ESC', 'gris')}${tecla('0', '0')}${tecla('123', '123', 'gris')}${tecla('ok', 'OK', 'ok')}</div>`;
    }
    return `<div class="zk-kb">${arriba}${teclas}</div>`;
  }
  function abrirTeclado(campo){
    if (campo === 'id') E.kb = { tipo:'num', campo, valor:E.form.id, nuevo:true, max:14 };
    if (campo === 'nombre') E.kb = { tipo:'alfa', campo, valor:E.form.nombre, nuevo:false, max:24 };
    if (campo === 'clave') E.kb = { tipo:'num', campo, valor:'', nuevo:false, max:8 };
    if (campo === 'ip') E.kb = { tipo:'ip', campo, octetos:E.d.nube.ip.split('.'), idx:0, nuevo:true };
    pintar();
    emitir('kb:' + campo);
  }
  function teclaPulsada(k){
    const kb = E.kb;
    if (!kb) return;
    kb.aviso = '';
    if (k === 'esc'){ E.kb = null; pintar(); emitir('kb-cerrado'); return; }
    if (k === 'ok'){ aceptarTeclado(); return; }
    if (kb.tipo === 'ip'){
      if (/^oct\d$/.test(k)){ kb.idx = Number(k.slice(3)); kb.nuevo = true; }
      else if (k === 'arriba'){ kb.idx = Math.max(0, kb.idx - 1); kb.nuevo = true; }
      else if (k === 'abajo'){ kb.idx = Math.min(3, kb.idx + 1); kb.nuevo = true; }
      else if (k === 'borrar'){ kb.octetos[kb.idx] = kb.octetos[kb.idx].slice(0, -1); kb.nuevo = false; }
      else if (/^\d$/.test(k)){
        const base = kb.nuevo ? '' : kb.octetos[kb.idx];
        const nuevo = base + k;
        if (Number(nuevo) <= 255 && nuevo.length <= 3){
          kb.octetos[kb.idx] = String(Number(nuevo));
          kb.nuevo = false;
          if (nuevo.length === 3 && kb.idx < 3){ kb.idx++; kb.nuevo = true; }
        }
      }
      pintar();
      return;
    }
    if (k === 'borrar'){ kb.valor = kb.valor.slice(0, -1); kb.nuevo = false; }
    else if (k === 'arriba' || k === 'abajo' || k === '123') return;
    else if (kb.tipo === 'num' ? /^\d$/.test(k) : k.length === 1){
      if (kb.nuevo){ kb.valor = ''; kb.nuevo = false; }
      if (kb.valor.length < kb.max) kb.valor += k;
    } else return;
    pintar();
  }
  function aceptarTeclado(){
    const kb = E.kb;
    if (kb.campo === 'id'){
      if (!kb.valor) return;
      if (E.d.usuarios.some(u => u.id === kb.valor)){ kb.aviso = 'Ese ID ya existe. Escribe otro.'; kb.nuevo = true; pintar(); sacudir(); return; }
      E.form.id = kb.valor;
    }
    if (kb.campo === 'nombre'){ const v = kb.valor.trim(); if (!v) return; E.form.nombre = v; }
    if (kb.campo === 'clave'){ if (!kb.valor) return; E.d.pc.clave = kb.valor; }
    if (kb.campo === 'ip'){ if (kb.octetos.some(o => o === '')) return; E.d.nube.ip = kb.octetos.join('.'); }
    const campoKb = kb.campo, valor = kb.campo === 'ip' ? E.d.nube.ip : kb.valor;
    E.kb = null;
    pintar();
    emitir('set:' + campoKb, valor);
    if (campoKb === 'clave') emitir(valor === CLAVE_PC ? 'clave-ok' : 'clave-mal');
    if (campoKb === 'ip') emitir(valor === IP_SERVIDOR ? 'ip-ok' : 'ip-mal');
  }

  /* ---------------- Diálogos y reinicio ---------------- */
  function dialogo(d){ E.dlg = d; pintar(); emitir('dlg-abierto'); }
  function cerrarDialogo(){ E.dlg = null; pintar(); }
  function pintarDialogo(){
    const d = E.dlg;
    return `<div class="zk-dlg-fondo"></div><div class="zk-dlg" role="alertdialog"><p>${esc(d.texto)}</p>${d.aviso ? `<small>${esc(d.aviso)}</small>` : ''}
      ${d.botones.map((b, i) => `<button type="button" class="${b.verde ? 'verde' : ''}" data-act="dlg" data-i="${i}"${i === 0 ? ' data-t="dlg-ok"' : ''}>${esc(b.t)}</button>`).join('')}</div>`;
  }
  // Cambios que en el equipo real reinician: se confirma, se aplica y se muestra el reinicio.
  function confirmarReinicio(aplicar, aviso){
    dialogo({ texto:'El equipo se reiniciará para aplicar el cambio.', aviso, botones:[{ t:'OK', accion:() => { aplicar(); reiniciar(); } }, { t:'Cancelar', verde:true }] });
  }
  function reiniciar(){
    E.reiniciando = true; E.kb = null; E.dlg = null;
    pintar();
    emitir('reinicio');
    setTimeout(() => { E.reiniciando = false; E.pantalla = 'home'; pintar(); emitir('reinicio-listo'); emitir('pantalla:home'); }, 2600);
  }

  /* ---------------- Navegación y acciones ---------------- */
  let timerRostro = null;
  function ir(p){
    clearInterval(timerRostro);
    E.pantalla = p; E.kb = null; E.dlg = null;
    if (p === 'captura') E.captura = { toques:0, listo:false, calidad:'' };
    if (p === 'rostro') iniciarRostro();
    pintar(true);
    emitir('pantalla:' + p);
  }
  function guardarForm(){
    const f = E.form;
    if (f.modo === 'nuevo'){
      if (f.id && (f.nombre || f.fp || f.face) && !E.d.usuarios.some(u => u.id === f.id)){
        E.d.usuarios.push({ id:f.id, nombre:f.nombre, fp:f.fp, face:f.face, foto:f.face ? 1 : 0 });
        emitir('usuario-guardado', f.id);
      }
    } else {
      const u = E.d.usuarios.find(x => x.id === f.id);
      if (u){ u.nombre = f.nombre; u.fp = f.fp; u.face = f.face; if (f.face) u.foto = 1; emitir('usuario-editado', f.id); }
    }
  }
  function atras(){
    if (E.reiniciando || E.dlg) return;
    if (E.kb){ E.kb = null; pintar(); emitir('kb-cerrado'); return; }
    const p = E.pantalla;
    if (p === 'form'){ guardarForm(); ir(E.form.modo === 'nuevo' ? 'usuarios' : 'usuario'); return; }
    if (p === 'captura'){ ir('dedos'); return; }
    if (p === 'rostro'){ ir('form'); return; }
    if (PADRE[p]) ir(PADRE[p]);
  }
  function iniciarRostro(){
    E.rostro = { prog:0, listo:false };
    timerRostro = setInterval(() => {
      if (E.pantalla !== 'rostro'){ clearInterval(timerRostro); return; }
      E.rostro.prog = Math.min(100, E.rostro.prog + 5);
      const barra = document.querySelector('.zs-barra i');
      if (barra) barra.style.width = E.rostro.prog + '%';
      if (E.rostro.prog >= 100){
        clearInterval(timerRostro);
        E.rostro.listo = true;
        pintar();
        setTimeout(() => {
          if (E.pantalla !== 'rostro') return;
          E.form.face = 1;
          ir('form');
          emitir('rostro-ok');
        }, 1000);
      }
    }, 140);
  }
  function tocarSensor(){
    const s = $('zkSensor');
    if (E.pantalla !== 'captura' || E.captura.listo || E.kb || E.dlg || E.reiniciando) return;
    s.classList.add('toque');
    setTimeout(() => s.classList.remove('toque'), 380);
    const c = E.captura;
    c.toques++;
    c.calidad = String(55 + Math.floor(Math.random() * 25));
    if (c.toques >= 3){
      c.listo = true;
      pintar();
      setTimeout(() => {
        if (E.pantalla !== 'captura') return;
        E.form.fp = Math.max(E.form.fp, 1);
        ir('form');
        emitir('huella-ok');
      }, 1300);
    } else pintar();
    emitir('toque', c.toques);
  }
  function aplicarBorrado(tipo){
    const u = usuarioSel();
    if (!u) return;
    if (tipo === 'usuario'){ E.d.usuarios = E.d.usuarios.filter(x => x !== u); ir('todos'); emitir('borrado-usuario', u.id); return; }
    if (tipo === 'huella') u.fp = 0;
    if (tipo === 'rostro') u.face = 0;
    if (tipo === 'foto') u.foto = 0;
    E.dlg = null;
    pintar();
    emitir('borrado-' + tipo, u.id);
  }
  const TEXTO_BORRAR = { usuario:'Borrar Usuario', huella:'Borrar Huella', rostro:'Sólo Borrar Rostro', foto:'Borrar Foto de Usuario' };

  function accion(el){
    const act = el.dataset.act;
    if (E.reiniciando) return;
    if (E.dlg && act !== 'dlg') return;
    if (E.kb && act !== 'atras') return;
    switch (act){
      case 'atras': atras(); break;
      case 'menu': ir('menu'); break;
      case 'usuarios': case 'todos': case 'red': case 'sistema': case 'ethernet': case 'pc': case 'nube':
      case 'tipo': case 'seguridad': case 'protocolo': case 'tipodisp': ir(act); break;
      case 'nuevo': E.form = { modo:'nuevo', id:siguienteId(), nombre:'', fp:0, face:0, foto:0 }; ir('form'); break;
      case 'usr': E.sel = el.dataset.id; ir('usuario'); break;
      case 'editar': { const u = usuarioSel(); E.form = { modo:'editar', id:u.id, nombre:u.nombre, fp:u.fp, face:u.face, foto:u.foto }; ir('form'); break; }
      case 'borrar': ir('borrar'); break;
      case 'del': { const t = el.dataset.tipo; dialogo({ texto:TEXTO_BORRAR[t], botones:[{ t:'OK', accion:() => aplicarBorrado(t) }, { t:'Cancelar', verde:true }] }); break; }
      case 'dlg': { const b = E.dlg.botones[Number(el.dataset.i)]; E.dlg = null; if (b.accion) b.accion(); else pintar(); break; }
      case 'kb-id': abrirTeclado('id'); break;
      case 'kb-nombre': abrirTeclado('nombre'); break;
      case 'kb-clave': abrirTeclado('clave'); break;
      case 'kb-ip': abrirTeclado('ip'); break;
      case 'huella': E.dedo = 6; ir('dedos'); break;
      case 'dedo': E.dedo = Number(el.dataset.dedo); ir('captura'); break;
      case 'rostro': ir('rostro'); break;
      case 'dhcp': confirmarReinicio(() => { E.d.red.dhcp = !E.d.red.dhcp; }); break;
      case 'https': confirmarReinicio(() => { E.d.pc.https = !E.d.pc.https; }); break;
      case 'set-protocolo': case 'set-tipodisp': {
        const clave = act === 'set-protocolo' ? 'protocolo' : 'dispositivo', v = el.dataset.v;
        if (E.d.tipo[clave] === v){ ir('tipo'); break; }
        confirmarReinicio(() => { E.d.tipo[clave] = v; E.d.usuarios = []; }, 'Se borran los usuarios y registros guardados en el equipo.');
        break;
      }
      case 'seg': {
        const k = el.dataset.k;
        E.d.seg[k] = !E.d.seg[k];
        pintar();
        emitir('seg');
        if (SEG_ROTULOS.every(([x]) => E.d.seg[x] === SEG_OBJETIVO[x])) emitir('seg-ok');
        break;
      }
    }
  }

  /* ---------------- Pintar ---------------- */
  function pintar(nueva){
    const pant = $('zkPantalla');
    const cuerpoPrev = pant.querySelector('.zs-cuerpo');
    const scroll = !nueva && cuerpoPrev ? cuerpoPrev.scrollTop : 0;
    let html = PANTALLAS[E.pantalla]();
    if (E.kb) html = html.replace(/<span class="zs-tit">[^<]*<\/span>/, `<span class="zs-tit">${esc(ROTULO_KB[E.kb.campo])}</span>`) + pintarTeclado();
    if (E.dlg) html += pintarDialogo();
    if (E.reiniciando) html += '<div class="zs-reinicio"><strong>ZKTeco</strong><i></i><span>Reiniciando…</span></div>';
    pant.innerHTML = html;
    pant.scrollTop = 0;
    const cuerpo = pant.querySelector('.zs-cuerpo');
    if (cuerpo) cuerpo.scrollTop = scroll;
    $('zkSensor').classList.toggle('listo', E.pantalla === 'captura' && !E.captura.listo && !E.kb && !E.dlg);
    pintarInfo();
    if (T.activo) requestAnimationFrame(() => tourResaltar());
  }
  setInterval(() => {
    if (E.pantalla !== 'home' || E.reiniciando) return;
    const h = $('zsHora'), f = $('zsFecha');
    if (h) h.textContent = horaTexto();
    if (f) f.textContent = fechaTexto();
  }, 15000);

  $('zkPantalla').addEventListener('click', e => {
    const k = e.target.closest('[data-k]');
    if (k && E.kb){ teclaPulsada(k.dataset.k); return; }
    const a = e.target.closest('[data-act]');
    if (a) accion(a);
  });
  $('zkSensor').addEventListener('click', tocarSensor);
  // Teclado físico (computador) mientras el teclado del equipo está abierto
  document.addEventListener('keydown', e => {
    if (!E.kb || e.target.closest('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    let k = null;
    if (e.key === 'Enter') k = 'ok';
    else if (e.key === 'Escape') k = 'esc';
    else if (e.key === 'Backspace') k = 'borrar';
    else if (E.kb.tipo === 'ip' && (e.key === '.' || e.key === 'ArrowRight')) k = 'abajo';
    else if (E.kb.tipo === 'ip' && e.key === 'ArrowLeft') k = 'arriba';
    else if (e.key.length === 1) k = e.key.toLowerCase();
    if (k){ e.preventDefault(); teclaPulsada(k); }
  });

  /* ---------------- Información de la pantalla (navegación libre) ---------------- */
  const INFO = {
    home:['Pantalla de inicio', 'Es lo primero que muestra el biométrico. Aquí el personal marca con huella o rostro. Para administrar, toca el botón de <b>menú</b> (tres rayitas, abajo a la derecha).'],
    menu:['Menú principal', 'Para registrar personal entra a <b>Usuarios</b>.'],
    usuarios:['Usuarios', '<b>Nuevo Usuario</b> registra a una persona. <b>Todos los Usuarios</b> muestra la lista para editar o borrar.'],
    form:['Datos del usuario', '<b>ID de Usuario</b> = cédula de la persona. Escribe el <b>Nombre</b>, deja <b>Privilegios</b> en Usuario Normal y registra <b>Huella</b> y <b>Rostro</b>. Tarjeta, Contraseña, Foto y Privilegios de Acceso no se tocan. Al salir con la flecha, el usuario queda guardado.'],
    dedos:['Elegir el dedo', 'Deja el dedo marcado en rojo: el <b>índice derecho (6)</b>. Tócalo para empezar.'],
    captura:['Registrar huella', 'La persona pone y levanta el dedo en el lector <b>3 veces</b>. Aquí, toca el <b>lector de huella</b> que está debajo de la pantalla.'],
    rostro:['Registrar rostro', 'La persona mira a la cámara dentro del recuadro hasta que la barra se llena y aparece "La calidad del template es buena".'],
    todos:['Todos los usuarios', 'Lista de las personas registradas, con íconos de huella y rostro. Toca una para editarla o borrarla.'],
    usuario:['Editar o borrar', '<b>Editar</b> cambia el nombre o registra de nuevo huella y rostro. <b>Borrar</b> elimina al usuario o solo su huella o su rostro.'],
    borrar:['Borrar', 'Solo aparecen las opciones de lo que la persona tiene registrado. Cada una pide confirmación con <b>OK</b>.'],
    red:['Red', '<b>Ethernet</b>: DHCP activo. <b>Conexión a PC</b>: clave 123456 y HTTPS apagado. <b>Conf. Srvr. de Nube</b>: servidor 10.80.8.105.'],
    ethernet:['Ethernet', 'Los equipos siempre van conectados por cable. Lo único importante: <b>DHCP activo</b> (puede venir apagado). Al cambiarlo, el equipo se reinicia.'],
    pc:['Conexión a PC', 'La <b>clave de comunicación</b> queda en <b>123456</b> y <b>HTTPS</b> debe estar <b>desactivado</b>. Al desactivarlo, el equipo se reinicia.'],
    nube:['Servidor de nube', 'En <b>Dirección del Servidor</b> va la del remoto: <b>10.80.8.105</b>.'],
    sistema:['Sistema', '<b>Tipo de Dispositivo</b> es el primer paso de la configuración. Después revisa <b>Configuración de seguridad</b>.'],
    tipo:['Tipo de dispositivo', 'Protocolo de comunicación: <b>Protocolo PUSH</b>. Tipo de dispositivo: <b>PUSH de T&amp;A</b>. Cambiarlo reinicia el equipo y borra lo guardado: por eso se hace de primero.'],
    protocolo:['Protocolo de comunicación', 'Debe quedar en <b>Protocolo PUSH</b>.'],
    tipodisp:['Tipo de dispositivo', 'Debe quedar en <b>PUSH de T&amp;A</b>.'],
    seguridad:['Configuración de seguridad', 'Activas: <b>Comunicación Standalone, SSH, Enmascaramiento de ID de usuario y Guardar foto como plantilla</b>. Apagadas: las dos de "Mostrar…".']
  };
  const INFO_KB = { id:['ID de Usuario', 'Escribe la <b>cédula</b> de la persona y toca <b>OK</b>.'], nombre:['Nombre', 'Escribe el nombre completo y toca <b>OK</b>.'], clave:['Clave de comunicación', 'Debe quedar en <b>123456</b>.'], ip:['Dirección del servidor', 'Escribe <b>10.80.8.105</b>. Toca cada casilla o usa las flechas para pasar de una a otra.'] };
  function pintarInfo(){
    const [t, d] = E.reiniciando ? ['Reiniciando', 'El equipo se está reiniciando para aplicar el cambio.'] : E.kb ? INFO_KB[E.kb.campo] : INFO[E.pantalla] || ['', ''];
    $('zkInfoTit').textContent = t;
    $('zkInfoTxt').innerHTML = d;
  }

  /* ---------------- Escala del equipo ---------------- */
  const ANCHO = 340, ALTO = 700;
  const esMovil = () => window.innerWidth < 860;
  function ajustar(){
    if ($('zkGuia').hidden) return;
    const disponibleAncho = esMovil() ? $('zkStage').clientWidth : ANCHO * 1.1;
    let disponibleAlto = window.innerHeight - 32;
    // Escritorio: que el equipo completo quepa debajo del encabezado sin desplazarse
    if (!esMovil()) disponibleAlto = Math.max(560, window.innerHeight - ($('zkStage').getBoundingClientRect().top + window.scrollY) - 16);
    const tourMovil = T.activo && esMovil();
    if (tourMovil) disponibleAlto = window.innerHeight - $('zkBurbuja').offsetHeight - 40;
    // Espacio al final de la página para poder encuadrar el equipo encima de la burbuja
    document.body.style.paddingBottom = tourMovil ? $('zkBurbuja').offsetHeight + 24 + 'px' : '';
    const s = Math.max(0.45, Math.min(disponibleAncho / ANCHO, disponibleAlto / ALTO, 1.1));
    $('zkEscala').style.width = ANCHO * s + 'px';
    $('zkEscala').style.height = ALTO * s + 'px';
    $('zkEquipo').style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', () => { ajustar(); if (T.activo) tourResaltar(); });

  /* =======================================================================
     Recorridos guiados
     ======================================================================= */
  const pasoMenu = { t:'[data-t="menu"]', txt:'Toca el botón de <b>menú</b> (las tres rayitas, abajo a la derecha).', hasta:'pantalla:menu' };
  const reinicioOk = [
    { t:'[data-t="dlg-ok"]', txt:'Confirma con <b>OK</b>. El equipo se reinicia para aplicar el cambio.', hasta:'reinicio' },
    { t:null, txt:'El equipo se está reiniciando. Espera unos segundos…', hasta:'reinicio-listo' }
  ];
  const TOURS = {
    coord:{
      crear:{ titulo:'Crear un usuario nuevo', desc:'Registra a una persona con su cédula, nombre, huella y rostro.',
        fin:'Ya sabes crear un usuario: cédula en ID, nombre, huella del índice derecho (tres veces) y rostro. La persona ya aparece en "Todos los Usuarios".',
        pasos:[
          pasoMenu,
          { t:'[data-t="m-usuarios"]', txt:'Entra a <b>Usuarios</b>.', hasta:'pantalla:usuarios' },
          { t:'[data-t="u-nuevo"]', txt:'Toca <b>Nuevo Usuario</b>.', hasta:'pantalla:form' },
          { t:'[data-t="f-id"]', txt:'En <b>ID de Usuario</b> va la <b>cédula</b> de la persona. Tócalo.', hasta:'kb:id' },
          { t:'.zk-kb', txt:'Escribe la cédula (por ejemplo <b>1098765432</b>): el número sugerido se reemplaza. Luego toca <b>OK</b>.', hasta:'set:id' },
          { t:'[data-t="f-nombre"]', txt:'Ahora toca <b>Nombre</b>.', hasta:'kb:nombre' },
          { t:'.zk-kb', txt:'Escribe el nombre completo de la persona y toca <b>OK</b>.', hasta:'set:nombre' },
          { t:'[data-t="f-priv"]', txt:'<b>Privilegios de Usuario</b> se deja en <b>Usuario Normal</b>. No lo cambies.', siguiente:true },
          { t:'[data-t="f-huella"]', txt:'Toca <b>Huella</b> para registrar el dedo.', hasta:'pantalla:dedos' },
          { t:'[data-t="finger-6"]', txt:'Deja el dedo que viene marcado: el <b>índice derecho (6)</b>. Tócalo.', hasta:'pantalla:captura' },
          { t:'[data-t="sensor"]', txt:'La persona <b>pone y levanta el dedo</b> en el lector <b>3 veces</b>. Aquí: toca el lector de huella 3 veces.', hasta:'huella-ok' },
          { t:'[data-t="f-rostro"]', txt:'¡Huella registrada! Ahora toca <b>Rostro</b>.', hasta:'pantalla:rostro' },
          { t:null, txt:'La persona mira a la cámara, dentro del recuadro, hasta que la barra se llena.', hasta:'rostro-ok' },
          { t:'[data-t="f-otros"]', txt:'Tarjeta, Contraseña, Foto de Usuario y Privilegios de Acceso <b>no se tocan</b>: se dejan como vienen.', siguiente:true },
          { t:'[data-t="atras"]', txt:'Toca la flecha para salir. <b>El usuario queda guardado.</b>', hasta:'pantalla:usuarios' },
          { t:'[data-t="u-todos"]', txt:'Comprueba que quedó: entra a <b>Todos los Usuarios</b>.', hasta:'pantalla:todos' }
        ] },
      editar:{ titulo:'Editar un usuario', desc:'Corrige el nombre o registra de nuevo la huella o el rostro.',
        fin:'Ya sabes editar un usuario. El ID (cédula) no se cambia: si está mal, hay que borrar el usuario y crearlo de nuevo.',
        pasos:[
          pasoMenu,
          { t:'[data-t="m-usuarios"]', txt:'Entra a <b>Usuarios</b>.', hasta:'pantalla:usuarios' },
          { t:'[data-t="u-todos"]', txt:'Toca <b>Todos los Usuarios</b>.', hasta:'pantalla:todos' },
          { t:'[data-t="user-1032478596"]', txt:'Busca a la persona y tócala. Toca a <b>diana carolina rojas</b>: tiene huella pero le falta el rostro.', hasta:'pantalla:usuario' },
          { t:'[data-t="us-editar"]', txt:'Toca <b>Editar</b>.', hasta:'pantalla:form' },
          { t:'[data-t="f-id"]', txt:'El <b>ID de Usuario</b> (cédula) no se puede cambiar al editar.', siguiente:true },
          { t:'[data-t="f-nombre"]', txt:'Para corregir el nombre, toca <b>Nombre</b>.', hasta:'kb:nombre' },
          { t:'.zk-kb', txt:'Corrige el nombre (borra con la tecla de borrar) y toca <b>OK</b>.', hasta:'set:nombre' },
          { t:'[data-t="f-rostro"]', txt:'Ahora registra el rostro que le faltaba: toca <b>Rostro</b>.', hasta:'pantalla:rostro' },
          { t:null, txt:'La persona mira a la cámara dentro del recuadro hasta que la barra se llena.', hasta:'rostro-ok' },
          { t:'[data-t="atras"]', txt:'Toca la flecha para salir. <b>Los cambios quedan guardados.</b>', hasta:'pantalla:usuario' }
        ] },
      borrar:{ titulo:'Borrar un usuario', desc:'Elimina a una persona, o solo su huella o su rostro.',
        fin:'Para quitar solo la huella o el rostro usa "Borrar Huella" o "Sólo Borrar Rostro": la persona sigue registrada y puedes volver a registrarlos desde Editar.',
        pasos:[
          pasoMenu,
          { t:'[data-t="m-usuarios"]', txt:'Entra a <b>Usuarios</b>.', hasta:'pantalla:usuarios' },
          { t:'[data-t="u-todos"]', txt:'Toca <b>Todos los Usuarios</b>.', hasta:'pantalla:todos' },
          { t:'[data-t="user-80123456"]', txt:'Toca a la persona que vas a borrar: <b>luis fernando castro</b>.', hasta:'pantalla:usuario' },
          { t:'[data-t="us-borrar"]', txt:'Toca <b>Borrar</b>.', hasta:'pantalla:borrar' },
          { t:'[data-t^="del-"]', txt:'Solo aparecen las opciones de lo que la persona tiene registrado: <b>Borrar Usuario</b> siempre, <b>Borrar Huella</b> si tiene huella, <b>Sólo Borrar Rostro</b> si tiene rostro.', siguiente:true },
          { t:'[data-t="del-usuario"]', txt:'Para eliminar a la persona del equipo, toca <b>Borrar Usuario</b>.', hasta:'dlg-abierto' },
          { t:'[data-t="dlg-ok"]', txt:'Confirma con <b>OK</b>. (Con Cancelar no se borra nada).', hasta:'borrado-usuario' },
          { t:'.zs-cuerpo', txt:'Listo: la persona ya no aparece en la lista.', siguiente:true }
        ] }
    },
    admin:{
      config:{ titulo:'Configuración inicial del equipo', desc:'Tipo de dispositivo, red, conexión a PC, servidor de nube y seguridad, en ese orden.',
        fin:'El equipo quedó configurado: PUSH de T&A, DHCP activo, clave 123456, HTTPS apagado, servidor 10.80.8.105 y seguridad lista. Recuerda registrarlo en scac_at_catalogo_biometricos_zkteco con su serial, IP, planta y ubicación.',
        pasos:[
          { t:null, txt:'Antes de empezar: el equipo debe quedar registrado en SQL en <b>scac_at_catalogo_biometricos_zkteco</b> con su <b>serial, IP, planta y ubicación exacta</b> dentro de la planta.', siguiente:true },
          pasoMenu,
          { t:'[data-t="m-sistema"]', txt:'Primer paso: el <b>tipo de dispositivo</b>. Cambiarlo reinicia el equipo y <b>borra lo que tenga guardado</b>, por eso se hace de primero. Entra a <b>Sistema</b>.', hasta:'pantalla:sistema' },
          { t:'[data-t="s-tipo"]', txt:'Toca <b>Tipo de Dispositivo</b>.', hasta:'pantalla:tipo' },
          { t:'[data-t="t-protocolo"]', txt:'<b>Protocolo de comunicación</b> debe estar en <b>Protocolo PUSH</b>. En este equipo ya lo está.', siguiente:true },
          { t:'[data-t="t-tipodisp"]', txt:'Toca <b>Tipo de dispositivo</b>: viene en PUSH de CA y debe quedar en PUSH de T&amp;A.', hasta:'pantalla:tipodisp' },
          { t:'[data-t="op-push-de-t-a"]', txt:'Selecciona <b>PUSH de T&amp;A</b>.', hasta:'dlg-abierto' },
          ...reinicioOk,
          pasoMenu,
          { t:'[data-t="m-red"]', txt:'Ahora la red. Entra a <b>Red</b>.', hasta:'pantalla:red' },
          { t:'[data-t="r-ethernet"]', txt:'Los equipos siempre van <b>conectados por cable</b> a la red. Toca <b>Ethernet</b>.', hasta:'pantalla:ethernet' },
          { t:'[data-t="e-dhcp"]', txt:'Lo único importante aquí: <b>DHCP activo</b>. Por defecto puede venir apagado. Actívalo.', hasta:'dlg-abierto' },
          ...reinicioOk,
          pasoMenu,
          { t:'[data-t="m-red"]', txt:'Entra de nuevo a <b>Red</b>.', hasta:'pantalla:red' },
          { t:'[data-t="r-pc"]', txt:'Toca <b>Conexión a PC</b>.', hasta:'pantalla:pc' },
          { t:'[data-t="pc-clave"]', txt:'La <b>clave de comunicación</b> queda configurada en <b>123456</b>. Tócala.', hasta:'kb:clave' },
          { t:'.zk-kb', txt:'Escribe <b>123456</b> y toca <b>OK</b>.', hasta:'clave-ok' },
          { t:'[data-t="pc-https"]', txt:'<b>HTTPS</b> debe quedar <b>desactivado</b>. Desactívalo.', hasta:'dlg-abierto' },
          ...reinicioOk,
          pasoMenu,
          { t:'[data-t="m-red"]', txt:'Entra a <b>Red</b> una vez más.', hasta:'pantalla:red' },
          { t:'[data-t="r-nube"]', txt:'Toca <b>Conf. Srvr. de Nube</b>.', hasta:'pantalla:nube' },
          { t:'[data-t="n-ip"]', txt:'Lo único importante: la <b>Dirección del Servidor</b>. Tócala.', hasta:'kb:ip' },
          { t:'.zk-kb', txt:'Escribe la IP del servidor remoto: <b>10 · 80 · 8 · 105</b>. Toca cada casilla (o usa las flechas) y al final toca <b>OK</b>.', hasta:'ip-ok' },
          { t:'[data-t="atras"]', txt:'Vuelve con la flecha.', hasta:'pantalla:red' },
          { t:'[data-t="atras"]', txt:'Vuelve otra vez al menú principal.', hasta:'pantalla:menu' },
          { t:'[data-t="m-sistema"]', txt:'Por último, la seguridad. Entra a <b>Sistema</b>.', hasta:'pantalla:sistema' },
          { t:'[data-t="s-seguridad"]', txt:'Toca <b>Configuración de seguridad</b>.', hasta:'pantalla:seguridad' },
          { t:'[data-act="seg"]', txt:'Deja <b>activas</b>: Comunicación Standalone, SSH, Enmascaramiento de ID de usuario y Guardar foto como plantilla. Las dos de <b>"Mostrar…"</b> quedan apagadas.', hasta:'seg-ok' }
        ] }
    }
  };

  const T = { activo:false, def:null, i:0, objetivos:[] };
  let guia = null;

  function emitir(ev, dato){
    if (!T.activo) return;
    const p = T.def.pasos[T.i];
    if (p && p.hasta === ev){ const en = T.i; setTimeout(() => { if (T.activo && T.i === en) tourSiguiente(); }, 80); }
    // Si el teclado se cerró sin el valor esperado, volver al paso que lo abre
    if (p && p.t === '.zk-kb' && (ev === 'kb-cerrado' || ev === 'clave-mal' || ev === 'ip-mal')){
      if (ev !== 'kb-cerrado') sacudir();
      T.i = Math.max(0, T.i - 1);
      tourPintar();
    }
  }
  function tourIniciar(clave){
    E.d = estadoInicial(); E.kb = null; E.dlg = null; E.reiniciando = false; E.pantalla = 'home';
    T.activo = true; T.def = TOURS[guia][clave]; T.i = 0;
    document.body.classList.toggle('zk-movil-tour', esMovil());
    pfConsulta(`${guia === 'admin' ? 'Administradores' : 'Coordinadores'} · ${T.def.titulo}`);
    pintar(true);
    tourPintar();
    ajustar();
  }
  function tourSiguiente(){
    T.i++;
    if (T.i >= T.def.pasos.length){ tourFin(); return; }
    tourPintar();
  }
  function limpiarResaltado(){ T.objetivos.forEach(el => el.classList.remove('zk-hl')); T.objetivos = []; }
  function tourPintar(){
    const p = T.def.pasos[T.i], b = $('zkBurbuja');
    const pct = Math.round(T.i * 100 / T.def.pasos.length);
    const acciones = p.siguiente
      ? '<button type="button" class="tx" data-tour="salir">Salir ✕</button><button type="button" class="tn" data-tour="sig">Siguiente →</button>'
      : `<button type="button" class="tx" data-tour="salir">Salir ✕</button><span class="th">${p.t ? 'Toca donde se indica' : 'Espera un momento'}</span>`;
    b.innerHTML = `<div class="barra"><i style="width:${pct}%"></i></div><div class="tc">${T.def.titulo} · Paso ${T.i + 1} de ${T.def.pasos.length}</div><div class="tt">${p.txt}</div><div class="ta">${acciones}</div>`;
    b.hidden = false;
    ajustar();
    tourResaltar();
  }
  function tourResaltar(){
    if (!T.activo) return;
    limpiarResaltado();
    const p = T.def.pasos[T.i];
    const els = p.t ? [...document.querySelectorAll('#zkEquipo ' + p.t)] : [];
    els.forEach(el => el.classList.add('zk-hl'));
    T.objetivos = els;
    // En el celular la burbuja va abajo: encuadrar el equipo arriba de ella
    if (esMovil()){
      const st = $('zkStage').getBoundingClientRect();
      if (Math.abs(st.top - 8) > 4) window.scrollTo(0, window.scrollY + st.top - 8);
    }
    // Que el elemento resaltado quede a la vista dentro de las listas de la pantalla
    if (els[0]){
      const lista = els[0].closest('.zs-cuerpo');
      if (lista && lista !== els[0]){
        const r = els[0].getBoundingClientRect(), rl = lista.getBoundingClientRect();
        if (r.bottom > rl.bottom) lista.scrollTop += r.bottom - rl.bottom + 8;
        else if (r.top < rl.top) lista.scrollTop -= rl.top - r.top + 8;
      }
    }
    colocarBurbuja(els[0]);
  }
  function colocarBurbuja(el){
    const b = $('zkBurbuja');
    if (esMovil()){ b.style.left = ''; b.style.top = ''; return; }
    const eq = $('zkEquipo').getBoundingClientRect();
    const ref = el ? el.getBoundingClientRect() : eq;
    const m = 18, bw = b.offsetWidth, bh = b.offsetHeight;
    let left = eq.left - bw - m;
    if (left < 12) left = Math.min(window.innerWidth - bw - 12, eq.right + m);
    let top = ref.top + ref.height / 2 - bh / 2;
    top = Math.max(12, Math.min(top, window.innerHeight - bh - 12));
    b.style.left = left + 'px';
    b.style.top = top + 'px';
  }
  function sacudir(){ const b = $('zkBurbuja'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  function tourDetener(){
    T.activo = false;
    limpiarResaltado();
    $('zkBurbuja').hidden = true;
    document.body.classList.remove('zk-movil-tour');
    ajustar();
  }
  function tourFin(){
    const fin = T.def.fin;
    tourDetener();
    $('zkFinTxt').textContent = fin;
    $('zkFin').hidden = false; $('zkFinFondo').hidden = false;
    $('zkFinOtro').focus();
  }
  $('zkBurbuja').addEventListener('click', e => {
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    if (b.dataset.tour === 'sig') tourSiguiente();
    if (b.dataset.tour === 'salir'){ tourDetener(); E.kb = null; E.dlg = null; pintar(); }
  });
  // Bloqueo: durante el recorrido solo responde lo resaltado (y el teclado del equipo cuando el paso es escribir)
  ['click', 'mousedown', 'touchstart'].forEach(tipo => document.addEventListener(tipo, e => {
    if (!T.activo) return;
    if (e.target.closest('#zkBurbuja, #zkVolver')) return;
    if (T.objetivos.some(el => el.contains(e.target))) return;
    if (tipo !== 'click' && !e.target.closest('#zkEquipo')) return;   // dejar desplazar la página en el celular
    e.stopPropagation(); e.preventDefault();
    if (tipo === 'click') sacudir();
  }, true));
  window.addEventListener('scroll', () => { if (T.activo && !esMovil()) colocarBurbuja(T.objetivos[0]); }, { passive:true });

  /* =======================================================================
     Página: elegir guía, contraseña, modos
     ======================================================================= */
  const GUIAS = {
    coord:{ titulo:'Guía para coordinadores y jefes de planta', badge:'Planta Centenario', sub:'Aprende a registrar al personal en el biométrico: crear un usuario con su cédula, huella y rostro; editarlo o borrarlo. Usa el equipo como si estuvieras frente a él.' },
    admin:{ titulo:'Guía para administradores DEOP', badge:'Configuración', sub:'Configuración inicial del biométrico: tipo de dispositivo, red, conexión a PC, servidor de nube y seguridad. Sigue el orden: el primer paso borra lo que tenga el equipo.' }
  };
  function mostrarGuia(clave){
    guia = clave;
    const g = GUIAS[clave];
    $('zkGuiaTitulo').textContent = g.titulo;
    $('zkGuiaBadge').textContent = g.badge;
    $('zkGuiaBadge').classList.toggle('rojo', clave === 'admin');
    $('zkGuiaSub').textContent = g.sub;
    $('zkSql').hidden = clave !== 'admin';
    const tours = TOURS[clave];
    $('zkTours').innerHTML = Object.keys(tours).map((k, i) => `<button type="button" class="zk-tour" data-tour-ini="${k}"><span class="zk-tour-n">${i + 1}</span><span><strong>${esc(tours[k].titulo)}</strong><small>${esc(tours[k].desc)}</small></span></button>`).join('');
    E.d = estadoInicial(); E.pantalla = 'home'; E.kb = null; E.dlg = null;
    modo('guiado');
    $('zkInicio').hidden = true; $('zkGuia').hidden = false;
    window.scrollTo(0, 0);
    pintar(true);
    ajustar();
    pfConsulta(clave === 'admin' ? 'Administradores' : 'Coordinadores');
  }
  function modo(m){
    document.querySelectorAll('.zk-modo').forEach(b => { const on = b.dataset.modo === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('zkPanelGuiado').hidden = m !== 'guiado';
    $('zkPanelLibre').hidden = m !== 'libre';
  }
  document.querySelectorAll('.zk-modo').forEach(b => b.addEventListener('click', () => { if (T.activo) tourDetener(); modo(b.dataset.modo); }));
  $('zkTours').addEventListener('click', e => { const b = e.target.closest('[data-tour-ini]'); if (b) tourIniciar(b.dataset.tourIni); });
  $('zkReiniciarDemo').addEventListener('click', () => { E.d = estadoInicial(); E.kb = null; E.dlg = null; E.reiniciando = false; ir('home'); });
  $('zkVolver').addEventListener('click', () => { tourDetener(); $('zkGuia').hidden = true; $('zkInicio').hidden = false; window.scrollTo(0, 0); });
  $('zkFinOtro').addEventListener('click', () => { cerrarFin(); modo('guiado'); E.d = estadoInicial(); ir('home'); });
  $('zkFinLibre').addEventListener('click', () => { cerrarFin(); modo('libre'); });
  function cerrarFin(){ $('zkFin').hidden = true; $('zkFinFondo').hidden = true; }

  /* Contraseña de la guía de administradores (barrera simple: el sitio es estático) */
  const ss = { get(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v){ try { sessionStorage.setItem(k, v); } catch (e) {} } };
  $('btnGuiaCoord').addEventListener('click', () => mostrarGuia('coord'));
  $('btnGuiaAdmin').addEventListener('click', () => {
    if (ss.get('zkAdmin') === '1'){ mostrarGuia('admin'); return; }
    $('zkClaveError').hidden = true; $('zkClaveInput').value = '';
    $('zkClave').hidden = false; $('zkClaveFondo').hidden = false;
    $('zkClaveInput').focus();
  });
  function cerrarClave(){ $('zkClave').hidden = true; $('zkClaveFondo').hidden = true; }
  $('zkClaveCancelar').addEventListener('click', cerrarClave);
  $('zkClaveFondo').addEventListener('click', cerrarClave);
  document.addEventListener('keydown', e => { if (e.key === 'Escape'){ if (!$('zkClave').hidden) cerrarClave(); if (!$('zkFin').hidden) cerrarFin(); } });
  $('zkClaveForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('zkClaveInput').value;
    if (!window.crypto || !crypto.subtle){ $('zkClaveError').textContent = 'Abre esta guía desde el enlace de POLARIS.'; $('zkClaveError').hidden = false; return; }
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(buf => {
      const hex = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
      if (hex === HASH_ADMIN){ ss.set('zkAdmin', '1'); cerrarClave(); mostrarGuia('admin'); }
      else { $('zkClaveError').textContent = 'Contraseña incorrecta.'; $('zkClaveError').hidden = false; $('zkClaveInput').select(); }
    });
  });

  pintar(true);
})();
