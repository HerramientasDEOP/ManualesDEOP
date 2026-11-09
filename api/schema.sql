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

CREATE TABLE IF NOT EXISTS preguntas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  herramienta TEXT NOT NULL,
  seccion TEXT,
  pagina TEXT,
  categoria TEXT NOT NULL DEFAULT 'uso',
  titulo TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'abierta',
  origen TEXT NOT NULL DEFAULT 'centro',
  calificacion INTEGER,
  no_leido_usuario INTEGER NOT NULL DEFAULT 0,
  no_leido_admin INTEGER NOT NULL DEFAULT 1,
  faq_id INTEGER,
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en TEXT NOT NULL DEFAULT (datetime('now')),
  respondida_en TEXT,
  cerrada_en TEXT
);
CREATE INDEX IF NOT EXISTS idx_preguntas_usuario ON preguntas(usuario_id, actualizada_en);
CREATE INDEX IF NOT EXISTS idx_preguntas_estado ON preguntas(estado, actualizada_en);

CREATE TABLE IF NOT EXISTS pregunta_mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pregunta_id INTEGER NOT NULL REFERENCES preguntas(id),
  autor_tipo TEXT NOT NULL,
  autor_nombre TEXT,
  contenido TEXT NOT NULL,
  interno INTEGER NOT NULL DEFAULT 0,
  metadatos TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mensajes_pregunta ON pregunta_mensajes(pregunta_id, id);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  herramienta TEXT NOT NULL,
  seccion TEXT,
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  activa INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  util_si INTEGER NOT NULL DEFAULT 0,
  util_no INTEGER NOT NULL DEFAULT 0,
  pregunta_origen_id INTEGER,
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizada_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_faqs_unica ON faqs(herramienta, pregunta);
