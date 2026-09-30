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
  if (!email) return json({ ok: false, error: 'correo_invalido', mensaje: 'Usa tu correo corporativo @cemex.com.' }, 400);

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
  if (!email) return json({ ok: false, error: 'correo_invalido', mensaje: 'Usa tu correo corporativo @cemex.com.' }, 400);

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
  return e.length <= 120 && /^[a-z0-9._%+-]+@cemex\.com$/.test(e) ? e : null;
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
