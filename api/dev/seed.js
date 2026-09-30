// Genera datos FALSOS realistas para la base D1 LOCAL de pruebas (nunca la real).
// Uso:  node seed.js > seed.sql
// ~60 usuarios, ~90 días de actividad, días hábiles y horas laborales de Colombia
// (las fechas se guardan en UTC, como hace el Worker: hora Colombia + 5 h).
let s = 20260930;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pad = (n) => String(n).padStart(2, '0');

const NOMBRES = ['Ana', 'Carlos', 'Luisa', 'Andrés', 'María', 'Jorge', 'Camila', 'Felipe', 'Laura', 'Santiago',
  'Valentina', 'Juan', 'Daniela', 'Sebastián', 'Paula', 'Diego', 'Natalia', 'Julián', 'Catalina', 'Mateo'];
const APELLIDOS = ['Gómez', 'Rodríguez', 'Martínez', 'López', 'García', 'Pérez', 'Ramírez', 'Torres', 'Díaz',
  'Vargas', 'Moreno', 'Rojas', 'Castro', 'Ortiz', 'Muñoz', 'Jiménez', 'Herrera', 'Suárez'];
const SECCIONES = [
  ['Eureka', 'Tiempo real', 30], ['Eureka', 'Histórico', 18], ['Orion', 'App', 16],
  ['Orion', 'Tablero', 12], ['Locombo', 'Tablero', 10], ['Locombo', 'App', 4],
];
const TOTAL_PESO = SECCIONES.reduce((a, x) => a + x[2], 0);
const seccionAlAzar = () => {
  let r = rnd() * TOTAL_PESO;
  for (const x of SECCIONES) { if ((r -= x[2]) < 0) return x; }
  return SECCIONES[0];
};
// Hora laboral de Colombia con picos a media mañana y media tarde
const horaLaboral = () => pick([7, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12, 14, 14, 15, 15, 16, 16, 17, 18]);

const hoy = new Date(Date.now() - 5 * 3600 * 1000);              // "ahora" en Colombia
hoy.setUTCHours(0, 0, 0, 0);
const DIAS = 90;
const AHORA = Date.now();
// fecha Colombia (día offset + hora/min) -> texto UTC para D1
function utc(diaOffset, h, m) {
  const d = new Date(hoy.getTime() - diaOffset * 86400000);
  d.setUTCHours(h + 5, m, Math.floor(rnd() * 60));
  if (d.getTime() > AHORA) d.setTime(AHORA - Math.floor(rnd() * 3600000)); // nada en el futuro
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
const esHabil = (off) => { const d = new Date(hoy.getTime() - off * 86400000).getUTCDay(); return d !== 0 && d !== 6; };
const q = (v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const out = ['DELETE FROM consultas_manual; DELETE FROM accesos; DELETE FROM sesiones; DELETE FROM usuarios; DELETE FROM visitas_anonimas;',
  "DELETE FROM sqlite_sequence WHERE name IN ('usuarios','accesos','consultas_manual','visitas_anonimas');"];
const usados = new Set();
for (let id = 1; id <= 60; id++) {
  let nombre, email;
  do {
    nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    email = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + '@cemex.com';
  } while (usados.has(email));
  usados.add(email);
  // Más registros al inicio (lanzamiento) y un goteo después
  const offReg = rnd() < 0.45 ? DIAS - Math.floor(rnd() * 10) : Math.floor(rnd() * DIAS);
  const hReg = horaLaboral();
  const creado = utc(offReg, hReg, Math.floor(rnd() * 60));
  const intensidad = pick([0.03, 0.06, 0.1, 0.15, 0.25, 0.4]);    // usuarios ocasionales y frecuentes
  const eventos = [];
  eventos.push(`INSERT INTO accesos (usuario_id, tipo, fecha, user_agent) VALUES (${id}, 'registro', ${q(creado)}, 'Mozilla/5.0 (Windows NT 10.0) Chrome/140');`);
  for (let i = 0; i < 1 + Math.floor(rnd() * 3); i++) {
    const [m, sec] = seccionAlAzar();
    eventos.push(`INSERT INTO consultas_manual (usuario_id, manual, seccion, fecha) VALUES (${id}, ${q(m)}, ${q(sec)}, ${q(utc(offReg, hReg, Math.min(59, 5 + i * 12)))});`);
  }
  let ultimo = creado;
  for (let off = offReg - 1; off >= 0; off--) {
    if (!esHabil(off) || rnd() > intensidad) continue;
    const h = horaLaboral();
    const f = utc(off, h, Math.floor(rnd() * 40));
    eventos.push(`INSERT INTO accesos (usuario_id, tipo, fecha, user_agent) VALUES (${id}, ${q(rnd() < 0.7 ? 'regreso' : 'login')}, ${q(f)}, 'Mozilla/5.0 (Windows NT 10.0) Chrome/140');`);
    for (let i = 0; i < 1 + Math.floor(rnd() * 3); i++) {
      const [m, sec] = seccionAlAzar();
      eventos.push(`INSERT INTO consultas_manual (usuario_id, manual, seccion, fecha) VALUES (${id}, ${q(m)}, ${q(sec)}, ${q(utc(off, h, 41 + i * 6))});`);
    }
    ultimo = f;
  }
  out.push(`INSERT INTO usuarios (id, nombre, email, creado_en, ultimo_acceso) VALUES (${id}, ${q(nombre)}, ${q(email)}, ${q(creado)}, ${q(ultimo)});`);
  out.push(...eventos);
}
// Visitas anónimas ("Entrar sin registrarme")
for (let off = DIAS; off >= 0; off--) {
  if (!esHabil(off)) continue;
  for (let i = 0; i < Math.floor(rnd() * 5); i++) {
    const [m, sec] = seccionAlAzar();
    out.push(`INSERT INTO visitas_anonimas (manual, seccion, fecha) VALUES (${q(m)}, ${q(sec)}, ${q(utc(off, horaLaboral(), Math.floor(rnd() * 60)))});`);
  }
}
console.log(out.join('\n'));
