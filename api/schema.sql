CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  ultimo_acceso TEXT
);

CREATE TABLE IF NOT EXISTS sesiones (
  token TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  ultima_actividad TEXT NOT NULL DEFAULT (datetime('now')),
  expira_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accesos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS consultas_manual (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  manual TEXT NOT NULL,
  seccion TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS puntuaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  puntaje INTEGER NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accesos_usuario ON accesos(usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_consultas_manual ON consultas_manual(manual, fecha);
CREATE INDEX IF NOT EXISTS idx_puntuaciones ON puntuaciones(puntaje DESC);

CREATE TABLE IF NOT EXISTS visitas_anonimas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manual TEXT NOT NULL,
  seccion TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visitas_anon ON visitas_anonimas(fecha);
