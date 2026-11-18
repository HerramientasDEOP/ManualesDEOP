CREATE TABLE IF NOT EXISTS coliseo_retos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  pregunta TEXT NOT NULL DEFAULT '',
  opciones TEXT NOT NULL DEFAULT '[]',
  correcta INTEGER NOT NULL DEFAULT 0,
  abre_ms INTEGER NOT NULL,
  cierra_ms INTEGER NOT NULL,
  publicado INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coliseo_intentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reto_id INTEGER NOT NULL REFERENCES coliseo_retos(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  orden TEXT NOT NULL DEFAULT '[]',
  inicio_ms INTEGER NOT NULL,
  respondido_ms INTEGER,
  opcion INTEGER,
  tiempo_ms INTEGER,
  herramientas TEXT NOT NULL DEFAULT '[]',
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reto_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_coliseo_intentos_reto ON coliseo_intentos(reto_id, respondido_ms);

INSERT OR IGNORE INTO coliseo_retos (numero, titulo, pregunta, opciones, correcta, abre_ms, cierra_ms, publicado) VALUES
  (1, 'Reto #1', '¿Cuál fue el cumplimiento del Mejor Estimado (ME) vs el volumen real, según Eureka, de la planta Medellín en marzo de 2026?', '["88%", "97%", "102%", "110%"]', 2, 1794978000000, 1795409999999, 1),
  (2, 'Reto #2', '', '[]', 0, 1795410000000, 1796014799999, 0),
  (3, 'Reto #3', '', '[]', 0, 1796014800000, 1796619599999, 0),
  (4, 'Reto #4', '', '[]', 0, 1796619600000, 1797224399999, 0);
