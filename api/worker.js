// ===== API de la plataforma de manuales CEMEX — Fase 1 =====
const DIAS_SESION = 90;        // cuánto dura la sesión guardada en el navegador
const MIN_REGRESO = 30;        // si vuelve tras 30+ min sin actividad, cuenta como nuevo acceso
const MIN_DEDUP_CONSULTA = 10; // no contar 2 veces el mismo manual en menos de 10 min

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
        if (request.method === 'GET' && path === '/activar') {
      return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8">
   <meta name="viewport" content="width=device-width,initial-scale=1"><title>Conexión activada</title></head>
   <body style="font-family:Segoe UI,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f4f6fa">
   <div style="background:#fff;padding:32px 40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);text-align:center">
   <div style="font-size:48px">OKAY</div><h2 style="color:#173a70;margin:8px 0">Conexión activada</h2>
   <p style="color:#555">Ya puedes cerrar esta pestaña y volver al manual.</p></div>
   <script>setTimeout(function(){ window.close(); }, 1500);</script></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    try {
      if (request.method === 'GET' && (path === '/' || path === '/health')) {
        const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM usuarios').first();
        return json({ ok: true, servicio: 'manuales-api', usuarios: r.n });
      }
      if (request.method !== 'POST') return json({ ok: false, error: 'metodo_no_permitido' }, 405);

      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'json_invalido' }, 400); }
      const ua = (request.headers.get('User-Agent') || '').slice(0, 300);

      if (path.startsWith('/admin/')) return await admin(env, path, body);

      switch (path) {
        case '/anon-view':   return await visitaAnonima(env, body);
        case '/register':    return await registrar(env, body, ua);
        case '/login':       return await login(env, body, ua);
        case '/session':     return await sesion(env, body);
        case '/manual-view': return await consultaManual(env, body);
        case '/logout':      return await logout(env, body);
        case '/ayuda/faqs':         return await faqsPublicas(env);
        case '/ayuda/faq-voto':     return await votarFaq(env, body);
        case '/preguntas/crear':    return await crearPregunta(env, body);
        case '/preguntas/mias':     return await misPreguntas(env, body);
        case '/preguntas/detalle':  return await detallePregunta(env, body);
        case '/preguntas/responder': return await responderUsuario(env, body);
        case '/preguntas/calificar': return await calificarPregunta(env, body);
        case '/preguntas/cerrar':   return await cerrarPregunta(env, body);
        default:             return json({ ok: false, error: 'ruta_no_existe' }, 404);
      }
    } catch (e) {
      return json({ ok: false, error: 'error_servidor', detalle: String(e && e.message || e) }, 500);
    }
  },
};

// ---------- Rutas ----------
async function registrar(env, body, ua) {
  const nombre = limpiarNombre(body.nombre);
  const email = limpiarEmail(body.email);
  if (!nombre) return json({ ok: false, error: 'nombre_invalido', mensaje: 'Escribe tu nombre (mínimo 2 letras).' }, 400);
  if (!email) return json({ ok: false, error: 'correo_invalido', mensaje: 'Usa tu correo corporativo @cemex.com o @ext.cemex.com.' }, 400);

  const existe = await env.DB.prepare('SELECT id FROM usuarios WHERE email = ?').bind(email).first();
  if (existe) return json({ ok: false, error: 'ya_registrado', mensaje: 'Este correo ya está registrado. Ingresa solo con tu correo.' }, 409);

  let usuarioId;
  try {
    const ins = await env.DB.prepare("INSERT INTO usuarios (nombre, email, ultimo_acceso) VALUES (?, ?, datetime('now'))")
      .bind(nombre, email).run();
    usuarioId = ins.meta.last_row_id;
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return json({ ok: false, error: 'ya_registrado', mensaje: 'Este correo ya está registrado. Ingresa solo con tu correo.' }, 409);
    }
    throw e;
  }
  const token = await crearSesion(env, usuarioId, 'registro', ua);
  return json({ ok: true, token, usuario: { nombre, email } });
}

async function login(env, body, ua) {
  const email = limpiarEmail(body.email);
  if (!email) return json({ ok: false, error: 'correo_invalido', mensaje: 'Usa tu correo corporativo @cemex.com o @ext.cemex.com.' }, 400);

  const u = await env.DB.prepare('SELECT id, nombre, email FROM usuarios WHERE email = ?').bind(email).first();
  if (!u) return json({ ok: false, error: 'no_registrado', mensaje: 'Este correo no está registrado. Regístrate primero.' }, 404);

  await env.DB.prepare("UPDATE usuarios SET ultimo_acceso = datetime('now') WHERE id = ?").bind(u.id).run();
  const token = await crearSesion(env, u.id, 'login', ua);
  return json({ ok: true, token, usuario: { nombre: u.nombre, email: u.email } });
}

async function sesion(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return json({ ok: false, error: 'sesion_invalida' }, 401);

  const stmts = [
    env.DB.prepare("UPDATE sesiones SET ultima_actividad = datetime('now') WHERE token = ?").bind(s.token),
    env.DB.prepare("UPDATE usuarios SET ultimo_acceso = datetime('now') WHERE id = ?").bind(s.usuario_id),
  ];
  if (s.inactivo) {
    stmts.push(env.DB.prepare("INSERT INTO accesos (usuario_id, tipo) VALUES (?, 'regreso')").bind(s.usuario_id));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, usuario: { nombre: s.nombre, email: s.email } });
}

async function consultaManual(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return json({ ok: false, error: 'sesion_invalida' }, 401);

  const manual = limpiarTexto(body.manual, 60);
  const seccion = limpiarTexto(body.seccion, 80);
  if (!manual) return json({ ok: false, error: 'manual_invalido' }, 400);

  const reciente = await env.DB.prepare(
    `SELECT id FROM consultas_manual
     WHERE usuario_id = ? AND manual = ? AND IFNULL(seccion, '') = IFNULL(?, '')
       AND fecha > datetime('now', ?) LIMIT 1`
  ).bind(s.usuario_id, manual, seccion, `-${MIN_DEDUP_CONSULTA} minutes`).first();

  const stmts = [env.DB.prepare("UPDATE sesiones SET ultima_actividad = datetime('now') WHERE token = ?").bind(s.token)];
  if (!reciente) {
    stmts.push(env.DB.prepare('INSERT INTO consultas_manual (usuario_id, manual, seccion) VALUES (?, ?, ?)')
      .bind(s.usuario_id, manual, seccion));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, registrado: !reciente });
}

async function logout(env, body) {
  if (typeof body.token === 'string') {
    await env.DB.prepare('DELETE FROM sesiones WHERE token = ?').bind(body.token).run();
  }
  return json({ ok: true });
}

// Visita de alguien que entró con "Entrar sin registrarme": sin datos personales.
async function visitaAnonima(env, body) {
  const manual = limpiarTexto(body.manual, 60);
  const seccion = limpiarTexto(body.seccion, 80);
  if (!manual) return json({ ok: false, error: 'manual_invalido' }, 400);
  await env.DB.prepare('INSERT INTO visitas_anonimas (manual, seccion) VALUES (?, ?)').bind(manual, seccion).run();
  return json({ ok: true });
}

// ---------- Admin (Fase 3: dashboard de métricas) ----------
// Fechas en D1: UTC 'YYYY-MM-DD HH:MM:SS'. Colombia = UTC-5 (sin horario de verano).
// Todo lo que se agrupa o se devuelve para mostrar va por col(fecha) = datetime(fecha, '-5 hours').
// Los filtros desde/hasta llegan como fecha de Colombia y se convierten a un rango UTC
// (fecha >= inicio AND fecha < fin) para poder usar los índices.
const ESPERA_CLAVE_MALA_MS = 800;
const MAX_DIAS_SERIE = 1100;
const col = (campo) => `datetime(${campo}, '-5 hours')`;

async function admin(env, path, body) {
  if (!env.ADMIN_KEY) return json({ ok: false, error: 'admin_no_configurado', mensaje: 'Falta configurar ADMIN_KEY en Cloudflare.' }, 500);
  if (!(await claveValida(body.clave, env.ADMIN_KEY))) {
    await new Promise((r) => setTimeout(r, ESPERA_CLAVE_MALA_MS));
    return json({ ok: false, error: 'clave_invalida', mensaje: 'Clave incorrecta.' }, 401);
  }
  switch (path) {
    case '/admin/resumen':  return await adminResumen(env, body);
    case '/admin/usuarios': return await adminUsuarios(env, body);
    case '/admin/usuario':  return await adminUsuario(env, body);
    case '/admin/preguntas':         return await adminPreguntas(env, body);
    case '/admin/pregunta':          return await adminPregunta(env, body);
    case '/admin/pregunta-responder': return await adminResponder(env, body);
    case '/admin/pregunta-estado':   return await adminEstado(env, body);
    case '/admin/faqs':              return await adminFaqs(env);
    case '/admin/faq-guardar':       return await adminFaqGuardar(env, body);
    default:                return json({ ok: false, error: 'ruta_no_existe' }, 404);
  }
}

// Compara en tiempo constante (hash SHA-256 de ambas para igualar longitudes).
async function claveValida(clave, real) {
  if (typeof clave !== 'string' || !clave || clave.length > 200) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(clave)),
    crypto.subtle.digest('SHA-256', enc.encode(real)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}

function hoyColombia() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}
function fechaValida(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z')) ? v : null;
}
function sumarDias(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function lunesDe(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  return sumarDias(ymd, -((d.getUTCDay() + 6) % 7));
}

// Rango de fechas de Colombia -> límites UTC. Sin "desde" = desde el primer dato registrado.
async function rango(env, body) {
  const hasta = fechaValida(body.hasta) || hoyColombia();
  let desde = fechaValida(body.desde);
  if (!desde) {
    const r = await env.DB.prepare(
      `SELECT MIN(f) AS f FROM (
         SELECT MIN(creado_en) AS f FROM usuarios
         UNION ALL SELECT MIN(fecha) FROM accesos
         UNION ALL SELECT MIN(fecha) FROM consultas_manual
         UNION ALL SELECT MIN(fecha) FROM visitas_anonimas)`
    ).first();
    desde = r && r.f ? String(r.f).replace(' ', 'T') : null;
    desde = desde ? new Date(Date.parse(desde + 'Z') - 5 * 3600 * 1000).toISOString().slice(0, 10) : hasta;
  }
  if (desde > hasta) desde = hasta;
  if (sumarDias(desde, MAX_DIAS_SERIE) < hasta) desde = sumarDias(hasta, -MAX_DIAS_SERIE);
  // 00:00 de Colombia = 05:00 UTC
  const ini = `${desde} 05:00:00`;
  const fin = `${sumarDias(hasta, 1)} 05:00:00`;
  const manual = limpiarTexto(body.manual, 60);
  return { desde, hasta, ini, fin, manual };
}

async function adminResumen(env, body) {
  const R = await rango(env, body);
  const { ini, fin, manual } = R;
  const fm = manual ? ' AND manual = ?' : '';           // filtro de manual (solo consultas / visitas)
  const pm = manual ? [manual] : [];
  const q = (sql, ...p) => env.DB.prepare(sql).bind(...p);

  const res = await env.DB.batch([
    /* 0 */ q('SELECT COUNT(*) AS n FROM usuarios WHERE creado_en < ?', fin),
    /* 1 */ q('SELECT COUNT(*) AS n FROM usuarios WHERE creado_en >= ? AND creado_en < ?', ini, fin),
    /* 2 */ q(`SELECT COUNT(*) AS activos, SUM(CASE WHEN dias >= 2 THEN 1 ELSE 0 END) AS recurrentes FROM (
                SELECT usuario_id, COUNT(DISTINCT date(f)) AS dias FROM (
                  SELECT usuario_id, ${col('fecha')} AS f FROM accesos WHERE fecha >= ? AND fecha < ?
                  UNION ALL
                  SELECT usuario_id, ${col('fecha')} FROM consultas_manual WHERE fecha >= ? AND fecha < ?
                ) GROUP BY usuario_id)`, ini, fin, ini, fin),
    /* 3 */ q('SELECT COUNT(*) AS n FROM accesos WHERE fecha >= ? AND fecha < ?', ini, fin),
    /* 4 */ q(`SELECT COUNT(*) AS n, COUNT(DISTINCT usuario_id) AS personas FROM consultas_manual
               WHERE fecha >= ? AND fecha < ?${fm}`, ini, fin, ...pm),
    /* 5 */ q(`SELECT COUNT(*) AS n FROM visitas_anonimas WHERE fecha >= ? AND fecha < ?${fm}`, ini, fin, ...pm),
    /* 6 */ q(`SELECT date(${col('fecha')}) AS dia, COUNT(*) AS n FROM accesos
               WHERE fecha >= ? AND fecha < ? GROUP BY dia`, ini, fin),
    /* 7 */ q(`SELECT date(${col('fecha')}) AS dia, COUNT(*) AS n FROM consultas_manual
               WHERE fecha >= ? AND fecha < ?${fm} GROUP BY dia`, ini, fin, ...pm),
    /* 8 */ q(`SELECT date(${col('fecha')}) AS dia, COUNT(*) AS n FROM visitas_anonimas
               WHERE fecha >= ? AND fecha < ?${fm} GROUP BY dia`, ini, fin, ...pm),
    /* 9 */ q(`SELECT date(${col('creado_en')}) AS dia, COUNT(*) AS n FROM usuarios
               WHERE creado_en >= ? AND creado_en < ? GROUP BY dia`, ini, fin),
    /* 10 */ q(`SELECT manual, IFNULL(seccion, '') AS seccion, COUNT(*) AS consultas, COUNT(DISTINCT usuario_id) AS personas
                FROM consultas_manual WHERE fecha >= ? AND fecha < ?${fm}
                GROUP BY manual, IFNULL(seccion, '') ORDER BY consultas DESC`, ini, fin, ...pm),
    /* 11 */ q(`SELECT CAST(strftime('%H', ${col('fecha')}) AS INTEGER) AS hora, COUNT(*) AS n FROM consultas_manual
                WHERE fecha >= ? AND fecha < ?${fm} GROUP BY hora`, ini, fin, ...pm),
    /* 12 */ q(`SELECT e.fecha, u.nombre, u.email, e.tipo, e.manual, e.seccion FROM (
                  SELECT ${col('fecha')} AS fecha, usuario_id, tipo, NULL AS manual, NULL AS seccion, fecha AS f_utc
                  FROM accesos WHERE fecha >= ? AND fecha < ?
                  UNION ALL
                  SELECT ${col('fecha')}, usuario_id, 'consulta', manual, seccion, fecha
                  FROM consultas_manual WHERE fecha >= ? AND fecha < ?${fm}
                ) e JOIN usuarios u ON u.id = e.usuario_id
                ORDER BY e.f_utc DESC LIMIT 50`, ini, fin, ini, fin, ...pm),
  ]);
  const rows = (i) => res[i].results || [];
  const uno = (i) => rows(i)[0] || {};

  const activos = uno(2).activos || 0;
  const consultas = uno(4).n || 0;
  const personasConsulta = uno(4).personas || 0;

  // Serie diaria con días en 0
  const mapa = (i) => Object.fromEntries(rows(i).map((r) => [r.dia, r.n]));
  const mA = mapa(6), mC = mapa(7), mV = mapa(8);
  const serie_diaria = [];
  for (let d = R.desde; d <= R.hasta; d = sumarDias(d, 1)) {
    serie_diaria.push({ dia: d, accesos: mA[d] || 0, consultas: mC[d] || 0, visitas_anonimas: mV[d] || 0 });
  }

  // Registros por semana (semana = lunes, hora de Colombia) con semanas en 0
  const porSemana = {};
  for (const r of rows(9)) { const s = lunesDe(r.dia); porSemana[s] = (porSemana[s] || 0) + r.n; }
  const registros_semanales = [];
  for (let s = lunesDe(R.desde); s <= R.hasta; s = sumarDias(s, 7)) {
    registros_semanales.push({ semana: s, nuevos: porSemana[s] || 0 });
  }

  const mH = Object.fromEntries(rows(11).map((r) => [r.hora, r.n]));
  const por_hora = Array.from({ length: 24 }, (_, h) => ({ hora: h, consultas: mH[h] || 0 }));

  return json({
    ok: true,
    rango: { desde: R.desde, hasta: R.hasta, manual: R.manual, zona: 'America/Bogota (UTC-5)' },
    kpis: {
      usuarios_total: uno(0).n || 0,
      usuarios_nuevos: uno(1).n || 0,
      usuarios_activos: activos,
      accesos: uno(3).n || 0,
      consultas,
      pct_recurrentes: activos ? Math.round((uno(2).recurrentes || 0) * 1000 / activos) / 10 : 0,
      consultas_por_usuario: personasConsulta ? Math.round(consultas * 10 / personasConsulta) / 10 : 0,
      visitas_anonimas: uno(5).n || 0,
    },
    serie_diaria,
    registros_semanales,
    por_manual: rows(10).map((r) => ({ ...r, seccion: r.seccion || null })),
    por_hora,
    actividad_reciente: rows(12),
  });
}

async function adminUsuarios(env, body) {
  const { ini, fin, desde, hasta } = await rango(env, body);
  const r = await env.DB.prepare(
    `SELECT u.id, u.nombre, u.email, ${col('u.creado_en')} AS creado_en,
            CASE WHEN u.ultimo_acceso IS NULL THEN NULL ELSE ${col('u.ultimo_acceso')} END AS ultimo_acceso,
            (SELECT COUNT(*) FROM accesos a WHERE a.usuario_id = u.id AND a.fecha >= ?1 AND a.fecha < ?2) AS accesos,
            (SELECT COUNT(*) FROM consultas_manual c WHERE c.usuario_id = u.id AND c.fecha >= ?1 AND c.fecha < ?2) AS consultas,
            (SELECT c.manual FROM consultas_manual c WHERE c.usuario_id = u.id AND c.fecha >= ?1 AND c.fecha < ?2
               GROUP BY c.manual ORDER BY COUNT(*) DESC, MAX(c.fecha) DESC LIMIT 1) AS manual_favorito
     FROM usuarios u WHERE u.creado_en < ?2
     ORDER BY u.ultimo_acceso DESC`
  ).bind(ini, fin).all();
  return json({ ok: true, rango: { desde, hasta }, usuarios: r.results || [] });
}

async function adminUsuario(env, body) {
  const id = Number(body.usuario_id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: 'usuario_invalido' }, 400);
  const [u, a, c] = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, nombre, email, ${col('creado_en')} AS creado_en,
              CASE WHEN ultimo_acceso IS NULL THEN NULL ELSE ${col('ultimo_acceso')} END AS ultimo_acceso
       FROM usuarios WHERE id = ?`).bind(id),
    env.DB.prepare(`SELECT ${col('fecha')} AS fecha, tipo FROM accesos WHERE usuario_id = ? ORDER BY fecha DESC`).bind(id),
    env.DB.prepare(`SELECT ${col('fecha')} AS fecha, manual, seccion FROM consultas_manual WHERE usuario_id = ? ORDER BY fecha DESC`).bind(id),
  ]);
  const usuario = (u.results || [])[0];
  if (!usuario) return json({ ok: false, error: 'usuario_no_existe' }, 404);
  return json({ ok: true, usuario, accesos: a.results || [], consultas: c.results || [] });
}

// ---------- Centro de ayuda ----------
// Una pregunta es una conversación: `preguntas` guarda el caso y `pregunta_mensajes` cada mensaje.
// autor_tipo: 'usuario' | 'agente' | 'ia' | 'sistema'. Hoy responde 'agente' (panel admin).
// Para el asistente de IA: generar la respuesta con `faqs` como base de conocimiento y llamar a
// registrarRespuesta(env, id, { tipo: 'ia', nombre: 'Asistente POLARIS', contenido, metadatos }).
const CATALOGO = {
  POLARIS: ['Acceso y cuenta', 'Portal'],
  Eureka: ['Tiempo real', 'Histórico'],
  Orion: ['App', 'Tablero'],
  Locomboo: ['App', 'Tablero', 'Cemento - Cemento', 'Cemento - Caracolito', 'Cemento - Portería', 'Cemento - Nómina'],
};
const CATEGORIAS = ['uso', 'error', 'dato', 'sugerencia'];
const ESTADOS = ['abierta', 'en_proceso', 'respondida', 'cerrada'];
const MAX_PREGUNTAS_HORA = 8;
const MAX_MENSAJES_HORA = 30;
const NOMBRE_AGENTE = 'Equipo POLARIS';
const SIN_SESION = () => json({ ok: false, error: 'sesion_invalida', mensaje: 'Tu sesión terminó. Ingresa de nuevo para continuar.' }, 401);
const NO_EXISTE = () => json({ ok: false, error: 'pregunta_no_existe', mensaje: 'No encontramos esa pregunta.' }, 404);

// Texto de varias líneas: quita caracteres de control y exige un largo entre min y max.
function limpiarLargo(v, min, max) {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
  return t.length >= min && t.length <= max ? t : null;
}
const idValido = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

// Devuelve { herramienta, seccion } si la combinación existe en el catálogo; seccion puede ser null ("no estoy seguro").
function destinoValido(herramienta, seccion) {
  if (typeof herramienta !== 'string' || !Object.prototype.hasOwnProperty.call(CATALOGO, herramienta)) return null;
  if (seccion === null || seccion === undefined || seccion === '') return { herramienta, seccion: null };
  return CATALOGO[herramienta].includes(seccion) ? { herramienta, seccion } : null;
}

async function faqsPublicas(env) {
  const r = await env.DB.prepare(
    `SELECT id, herramienta, seccion, pregunta, respuesta, util_si, util_no
     FROM faqs WHERE activa = 1 ORDER BY herramienta, orden, id`).all();
  return json({ ok: true, faqs: r.results || [] });
}

async function votarFaq(env, body) {
  const id = idValido(body.faq_id);
  if (!id || typeof body.util !== 'boolean') return json({ ok: false, error: 'voto_invalido' }, 400);
  const campo = body.util ? 'util_si' : 'util_no';
  await env.DB.prepare(`UPDATE faqs SET ${campo} = ${campo} + 1 WHERE id = ? AND activa = 1`).bind(id).run();
  return json({ ok: true });
}

async function crearPregunta(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return SIN_SESION();
  const destino = destinoValido(body.herramienta, body.seccion);
  if (!destino) return json({ ok: false, error: 'herramienta_invalida', mensaje: 'Elige la herramienta sobre la que tienes la duda.' }, 400);
  const categoria = CATEGORIAS.includes(body.categoria) ? body.categoria : 'uso';
  const titulo = limpiarLargo(body.titulo, 5, 140);
  if (!titulo) return json({ ok: false, error: 'titulo_invalido', mensaje: 'Escribe tu pregunta (entre 5 y 140 caracteres).' }, 400);
  const detalle = body.detalle ? limpiarLargo(body.detalle, 0, 2000) : '';
  if (detalle === null) return json({ ok: false, error: 'detalle_invalido', mensaje: 'El detalle no puede pasar de 2000 caracteres.' }, 400);
  const pagina = limpiarTexto(body.pagina, 80);
  const origen = ['feed', 'herramienta', 'contexto', 'centro'].includes(body.origen) ? body.origen : 'centro';

  const rec = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM preguntas WHERE usuario_id = ? AND creada_en > datetime('now', '-1 hour')"
  ).bind(s.usuario_id).first();
  if (rec.n >= MAX_PREGUNTAS_HORA) {
    return json({ ok: false, error: 'demasiadas_preguntas', mensaje: 'Enviaste varias preguntas seguidas. Espera un momento antes de hacer otra.' }, 429);
  }
  const ins = await env.DB.prepare(
    `INSERT INTO preguntas (usuario_id, herramienta, seccion, pagina, categoria, titulo, detalle, origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(s.usuario_id, destino.herramienta, destino.seccion, pagina, categoria, titulo, detalle, origen).run();
  return json({ ok: true, id: ins.meta.last_row_id });
}

const CAMPOS_PREGUNTA = (p) => `${p}id, ${p}herramienta, ${p}seccion, ${p}pagina, ${p}categoria, ${p}titulo, ${p}detalle, ${p}estado, ${p}origen, ${p}calificacion,
  ${col(p + 'creada_en')} AS creada_en, ${col(p + 'actualizada_en')} AS actualizada_en,
  CASE WHEN ${p}respondida_en IS NULL THEN NULL ELSE ${col(p + 'respondida_en')} END AS respondida_en`;

async function misPreguntas(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return SIN_SESION();
  const r = await env.DB.prepare(
    `SELECT ${CAMPOS_PREGUNTA('p.')}, p.no_leido_usuario AS no_leido,
       (SELECT m.contenido FROM pregunta_mensajes m WHERE m.pregunta_id = p.id AND m.interno = 0 AND m.autor_tipo <> 'sistema'
        ORDER BY m.id DESC LIMIT 1) AS ultimo_mensaje
     FROM preguntas p WHERE p.usuario_id = ? ORDER BY p.actualizada_en DESC, p.id DESC LIMIT 200`
  ).bind(s.usuario_id).all();
  const preguntas = r.results || [];
  return json({ ok: true, preguntas, no_leidas: preguntas.filter((x) => x.no_leido).length });
}

async function preguntaDe(env, id, usuarioId) {
  return env.DB.prepare(`SELECT ${CAMPOS_PREGUNTA('')} FROM preguntas WHERE id = ? AND usuario_id = ?`).bind(id, usuarioId).first();
}
async function mensajesDe(env, id, conInternos) {
  const r = await env.DB.prepare(
    `SELECT id, autor_tipo, autor_nombre, contenido, interno, ${col('creado_en')} AS creado_en
     FROM pregunta_mensajes WHERE pregunta_id = ?${conInternos ? '' : ' AND interno = 0'} ORDER BY id`
  ).bind(id).all();
  return r.results || [];
}

async function detallePregunta(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return SIN_SESION();
  const id = idValido(body.id);
  const pregunta = id && await preguntaDe(env, id, s.usuario_id);
  if (!pregunta) return NO_EXISTE();
  const mensajes = await mensajesDe(env, id, false);
  await env.DB.prepare('UPDATE preguntas SET no_leido_usuario = 0 WHERE id = ?').bind(id).run();
  return json({ ok: true, pregunta, mensajes });
}

async function responderUsuario(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return SIN_SESION();
  const id = idValido(body.id);
  const pregunta = id && await preguntaDe(env, id, s.usuario_id);
  if (!pregunta) return NO_EXISTE();
  const contenido = limpiarLargo(body.contenido, 1, 2000);
  if (!contenido) return json({ ok: false, error: 'mensaje_invalido', mensaje: 'Escribe tu mensaje (máximo 2000 caracteres).' }, 400);
  const rec = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM pregunta_mensajes m JOIN preguntas p ON p.id = m.pregunta_id
     WHERE p.usuario_id = ? AND m.autor_tipo = 'usuario' AND m.creado_en > datetime('now', '-1 hour')`
  ).bind(s.usuario_id).first();
  if (rec.n >= MAX_MENSAJES_HORA) {
    return json({ ok: false, error: 'demasiados_mensajes', mensaje: 'Enviaste muchos mensajes seguidos. Espera un momento.' }, 429);
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO pregunta_mensajes (pregunta_id, autor_tipo, autor_nombre, contenido) VALUES (?, 'usuario', ?, ?)")
      .bind(id, s.nombre, contenido),
    // Si ya estaba respondida o cerrada, vuelve a la bandeja del equipo.
    env.DB.prepare(
      `UPDATE preguntas SET no_leido_admin = 1, actualizada_en = datetime('now'), cerrada_en = NULL,
         estado = CASE WHEN estado IN ('respondida', 'cerrada') THEN 'en_proceso' ELSE estado END
       WHERE id = ?`).bind(id),
  ]);
  return json({ ok: true });
}

async function calificarPregunta(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return SIN_SESION();
  const id = idValido(body.id);
  const pregunta = id && await preguntaDe(env, id, s.usuario_id);
  if (!pregunta) return NO_EXISTE();
  if (typeof body.util !== 'boolean') return json({ ok: false, error: 'voto_invalido' }, 400);
  if (pregunta.estado !== 'respondida') return json({ ok: false, error: 'no_respondida', mensaje: 'Esta pregunta todavía no tiene una respuesta para calificar.' }, 409);
  if (body.util) {
    await env.DB.prepare(
      `UPDATE preguntas SET calificacion = 1, estado = 'cerrada', cerrada_en = datetime('now'), actualizada_en = datetime('now') WHERE id = ?`
    ).bind(id).run();
  } else {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO pregunta_mensajes (pregunta_id, autor_tipo, autor_nombre, contenido) VALUES (?, 'sistema', 'POLARIS', ?)")
        .bind(id, 'La respuesta no resolvió la duda. El caso volvió a revisión.'),
      env.DB.prepare(
        `UPDATE preguntas SET calificacion = -1, estado = 'en_proceso', no_leido_admin = 1, actualizada_en = datetime('now') WHERE id = ?`
      ).bind(id),
    ]);
  }
  return json({ ok: true });
}

async function cerrarPregunta(env, body) {
  const s = await validarSesion(env, body.token);
  if (!s) return SIN_SESION();
  const id = idValido(body.id);
  const pregunta = id && await preguntaDe(env, id, s.usuario_id);
  if (!pregunta) return NO_EXISTE();
  await env.DB.prepare(
    `UPDATE preguntas SET estado = 'cerrada', cerrada_en = datetime('now'), actualizada_en = datetime('now'), no_leido_admin = 0 WHERE id = ?`
  ).bind(id).run();
  return json({ ok: true });
}

// Único punto por donde entra una respuesta (hoy el panel admin; mañana también el asistente de IA).
async function registrarRespuesta(env, id, r) {
  const stmts = [env.DB.prepare(
    'INSERT INTO pregunta_mensajes (pregunta_id, autor_tipo, autor_nombre, contenido, interno, metadatos) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, r.tipo, r.nombre, r.contenido, r.interno ? 1 : 0, r.metadatos ? JSON.stringify(r.metadatos) : null)];
  if (!r.interno) {
    stmts.push(env.DB.prepare(
      `UPDATE preguntas SET estado = 'respondida', respondida_en = COALESCE(respondida_en, datetime('now')),
         actualizada_en = datetime('now'), cerrada_en = NULL, no_leido_usuario = 1, no_leido_admin = 0 WHERE id = ?`
    ).bind(id));
  }
  await env.DB.batch(stmts);
}

async function adminPreguntas(env, body) {
  const donde = [], params = [];
  if (ESTADOS.includes(body.estado)) { donde.push('p.estado = ?'); params.push(body.estado); }
  if (typeof body.herramienta === 'string' && CATALOGO[body.herramienta]) { donde.push('p.herramienta = ?'); params.push(body.herramienta); }
  const q = limpiarTexto(body.q, 80);
  if (q) {
    const like = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    donde.push("(p.titulo LIKE ? ESCAPE '\\' OR p.detalle LIKE ? ESCAPE '\\' OR u.nombre LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')");
    params.push(like, like, like, like);
  }
  const where = donde.length ? 'WHERE ' + donde.join(' AND ') : '';
  const [lista, est, por, tiempos] = await env.DB.batch([
    env.DB.prepare(
      `SELECT ${CAMPOS_PREGUNTA('p.')}, p.no_leido_admin AS no_leido, u.nombre, u.email
       FROM preguntas p JOIN usuarios u ON u.id = p.usuario_id ${where}
       ORDER BY p.no_leido_admin DESC, p.actualizada_en DESC, p.id DESC LIMIT 300`).bind(...params),
    env.DB.prepare('SELECT estado, COUNT(*) AS n FROM preguntas GROUP BY estado'),
    env.DB.prepare('SELECT herramienta, COUNT(*) AS n FROM preguntas GROUP BY herramienta ORDER BY n DESC'),
    env.DB.prepare(
      `SELECT AVG((julianday(respondida_en) - julianday(creada_en)) * 24) AS horas,
              SUM(CASE WHEN calificacion = 1 THEN 1 ELSE 0 END) AS util_si,
              SUM(CASE WHEN calificacion = -1 THEN 1 ELSE 0 END) AS util_no
       FROM preguntas`),
  ]);
  const t = (tiempos.results || [])[0] || {};
  return json({
    ok: true,
    preguntas: lista.results || [],
    por_estado: Object.fromEntries((est.results || []).map((r) => [r.estado, r.n])),
    por_herramienta: por.results || [],
    horas_primera_respuesta: t.horas == null ? null : Math.round(t.horas * 10) / 10,
    util_si: t.util_si || 0,
    util_no: t.util_no || 0,
  });
}

async function adminPregunta(env, body) {
  const id = idValido(body.id);
  const pregunta = id && await env.DB.prepare(
    `SELECT ${CAMPOS_PREGUNTA('p.')}, p.faq_id, u.nombre, u.email FROM preguntas p JOIN usuarios u ON u.id = p.usuario_id WHERE p.id = ?`
  ).bind(id).first();
  if (!pregunta) return NO_EXISTE();
  const mensajes = await mensajesDe(env, id, true);
  await env.DB.prepare('UPDATE preguntas SET no_leido_admin = 0 WHERE id = ?').bind(id).run();
  return json({ ok: true, pregunta, mensajes });
}

async function adminResponder(env, body) {
  const id = idValido(body.id);
  const existe = id && await env.DB.prepare('SELECT id FROM preguntas WHERE id = ?').bind(id).first();
  if (!existe) return NO_EXISTE();
  const contenido = limpiarLargo(body.contenido, 1, 4000);
  if (!contenido) return json({ ok: false, error: 'mensaje_invalido', mensaje: 'Escribe la respuesta (máximo 4000 caracteres).' }, 400);
  await registrarRespuesta(env, id, { tipo: 'agente', nombre: NOMBRE_AGENTE, contenido, interno: body.interno === true });
  return json({ ok: true });
}

async function adminEstado(env, body) {
  const id = idValido(body.id);
  if (!id || !ESTADOS.includes(body.estado)) return json({ ok: false, error: 'estado_invalido', mensaje: 'Estado no válido.' }, 400);
  const r = await env.DB.prepare(
    `UPDATE preguntas SET estado = ?, actualizada_en = datetime('now'),
       cerrada_en = CASE WHEN ? = 'cerrada' THEN datetime('now') ELSE NULL END WHERE id = ?`
  ).bind(body.estado, body.estado, id).run();
  if (!r.meta.changes) return NO_EXISTE();
  return json({ ok: true });
}

async function adminFaqs(env) {
  const r = await env.DB.prepare(
    `SELECT id, herramienta, seccion, pregunta, respuesta, activa, util_si, util_no, pregunta_origen_id
     FROM faqs ORDER BY herramienta, orden, id`).all();
  return json({ ok: true, faqs: r.results || [] });
}

async function adminFaqGuardar(env, body) {
  const destino = destinoValido(body.herramienta, body.seccion);
  if (!destino) return json({ ok: false, error: 'herramienta_invalida', mensaje: 'Elige la herramienta de la pregunta frecuente.' }, 400);
  const pregunta = limpiarLargo(body.pregunta, 5, 200);
  const respuesta = limpiarLargo(body.respuesta, 5, 4000);
  if (!pregunta || !respuesta) return json({ ok: false, error: 'faq_invalida', mensaje: 'Escribe la pregunta y la respuesta.' }, 400);
  const activa = body.activa === false ? 0 : 1;
  const id = idValido(body.id);
  const origen = idValido(body.pregunta_origen_id);
  try {
    if (id) {
      const r = await env.DB.prepare(
        `UPDATE faqs SET herramienta = ?, seccion = ?, pregunta = ?, respuesta = ?, activa = ?, actualizada_en = datetime('now') WHERE id = ?`
      ).bind(destino.herramienta, destino.seccion, pregunta, respuesta, activa, id).run();
      if (!r.meta.changes) return json({ ok: false, error: 'faq_no_existe', mensaje: 'No encontramos esa pregunta frecuente.' }, 404);
      return json({ ok: true, id });
    }
    const ins = await env.DB.prepare(
      'INSERT INTO faqs (herramienta, seccion, pregunta, respuesta, activa, pregunta_origen_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(destino.herramienta, destino.seccion, pregunta, respuesta, activa, origen).run();
    const nuevo = ins.meta.last_row_id;
    if (origen) await env.DB.prepare('UPDATE preguntas SET faq_id = ? WHERE id = ?').bind(nuevo, origen).run();
    return json({ ok: true, id: nuevo });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return json({ ok: false, error: 'faq_repetida', mensaje: 'Ya existe una pregunta frecuente igual para esa herramienta.' }, 409);
    }
    throw e;
  }
}

// ---------- Ayudas ----------
async function crearSesion(env, usuarioId, tipo, ua) {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sesiones (token, usuario_id, expira_en) VALUES (?, ?, datetime('now', ?))")
      .bind(token, usuarioId, `+${DIAS_SESION} days`),
    env.DB.prepare('INSERT INTO accesos (usuario_id, tipo, user_agent) VALUES (?, ?, ?)').bind(usuarioId, tipo, ua),
  ]);
  return token;
}

async function validarSesion(env, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
  return env.DB.prepare(
    `SELECT s.token, s.usuario_id, u.nombre, u.email,
            (s.ultima_actividad < datetime('now', ?)) AS inactivo
     FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = ? AND s.expira_en > datetime('now')`
  ).bind(`-${MIN_REGRESO} minutes`, token).first();
}

function limpiarEmail(v) {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  // Solo correos corporativos: @cemex.com o @ext.cemex.com (externos/contratistas)
  return e.length <= 120 && /^[a-z0-9._%+-]+@(ext\.)?cemex\.com$/.test(e) ? e : null;
}
function limpiarNombre(v) {
  if (typeof v !== 'string') return null;
  const n = v.trim().replace(/\s+/g, ' ');
  return n.length >= 2 && n.length <= 80 ? n : null;
}
function limpiarTexto(v, max) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t && t.length <= max ? t : null;
}
