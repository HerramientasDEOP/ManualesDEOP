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

INSERT OR IGNORE INTO faqs (herramienta, seccion, pregunta, respuesta, orden) VALUES
  ('Orion', 'App', '¿Cuándo queda inhabilitada una mixer (o su ticket)?', 'Cuando su ticket está En Entrada o En Salida del taller.
O cuando el programador del taller, al hacer la programación, marca la disponibilidad del vehículo como Inoperativo.', 0),
  ('Orion', 'App', '¿Quién crea las solicitudes de despegue?', 'El coordinador de la planta monta el ticket de tipo Despegue.
El programador del taller le da entrada apenas lo ve.', 1),
  ('Orion', 'App', '¿Me avisan cuando asignan mi ticket?', 'Sí. Todos los tickets se notifican por correo cuando se asignan.
También puedes seguir su estatus en Mis solicitudes y escribir en Mis chats.', 2),
  ('Orion', 'App', '¿De dónde sale la lista de mixers y placas?', 'Se actualiza desde el maestro de vehículos de SAP.
Si una placa no aparece o tiene datos desactualizados, debe corregirse en SAP.', 3),
  ('Orion', 'Tablero', '¿Cómo se calcula la disponibilidad?', 'Disponibilidad = (Dispo total − vehículos en taller) ÷ Dispo objetivo
La dispo objetivo son los vehículos asignados a rodar en la planta: todos los que no están en reserva de mantenimiento ni de operación.', 4),
  ('Orion', 'App', '¿Qué pasos debe tener un ticket?', 'Todos los tickets deben pasar por toda su gestión: Abierto → En espera → En programación → En entrada → En salida → Cierre técnico.
Cualquier ticket puede ser rechazado en cualquier paso de la programación.', 5),
  ('Orion', 'App', '¿Qué diferencia hay entre Crítico, No crítico y Despegue?', 'Crítico (varada): la mixer no puede operar, se atiende el mismo día.
No crítico: puede seguir operando y se programa después.
Despegue: retirar concreto seco de la olla, suele tomar el día completo.', 6),
  ('Orion', 'App', 'No encuentro la placa al crear la solicitud, ¿qué hago?', 'Revisa que tengas marcado el tipo de placa correcto (MIXER o BOMBA).
Busca solo una parte de la placa.
Si aun así no aparece, la placa debe crearse o actualizarse en el maestro de vehículos de SAP.', 7),
  ('Orion', 'App', '¿Cómo sé en qué va mi solicitud?', 'En Mis solicitudes la columna Estatus te dice en qué paso está.
Con la flecha azul ves el resumen y lo que diligenció el programador (OT, comentarios).', 8),
  ('Orion', 'App', '¿Cómo hablo con el programador de mi ticket?', 'Entra a Mis chats (o al ícono de chat de la fila en Mis solicitudes) y escribe en el chat de ese ticket.', 9),
  ('Orion', 'App', '¿Por qué no me deja enviar la entrada al taller?', 'En la etapa Entrada son obligatorios Safety Features Operativos y la OT. Mientras falte alguno, Enviar queda bloqueado y la app te dice qué falta.', 10),
  ('Orion', 'App', '¿Por qué no aparece el botón Enviar al rechazar?', 'Las observaciones del rechazo son obligatorias: el botón aparece cuando escribes el motivo.', 11),
  ('Orion', 'App', '¿Qué diferencia hay entre Programador y Programador bomba?', 'Es el mismo Gestor de novedades. Programador muestra las solicitudes de mixers y Programador bomba las de bombas.', 12),
  ('Orion', 'App', '¿Por qué no veo las opciones de Programador en el menú?', 'Solo aparecen para usuarios con rol programador. Si lo necesitas, solicita el permiso al equipo de Desarrollo de Operaciones.', 13),
  ('Locomboo', 'App', '¿Qué hago si hay un error de usuario al ingresar?', 'Cierra por completo y reinicia la aplicación.
Intenta iniciar sesión nuevamente.', 0),
  ('Locomboo', 'App', '¿Cómo solucionar problemas de internet en la tablet?', 'Verifica que la tablet esté correctamente conectada a una red Wi-Fi.
Asegúrate de que la tarjeta SIM esté insertada y la conexión activada.', 1),
  ('Locomboo', 'App', '¿Por qué mi usuario está bloqueado para hacer cambios?', 'Por motivos de seguridad o configuración inicial, es posible que tu perfil no tenga los permisos necesarios para editar información.
Solicita la habilitación de estos permisos o la revisión del estado de tu cuenta.', 2),
  ('Locomboo', 'App', '¿Qué hacer si la tablet no reconoce la planta?', 'Valida que la tablet cuente con una conexión a internet activa.
Si no hay conexión, sigue los pasos de la pregunta "¿Cómo solucionar problemas de internet en la tablet?".
Si la conexión es estable y el sistema sigue sin reconocer la planta, solicita soporte técnico.', 3),
  ('Locomboo', 'App', 'El escáner no lee mi carnet, ¿qué hago?', 'Limpia el código de barras y verifica que no esté rayado ni doblado.
Ubícate con buena luz y acerca o aleja el carnet hasta que la cámara enfoque.
Si aun así no lo lee, avisa a tu coordinador: él puede registrar tu ingreso o salida en "Ingresos / Salidas manuales".', 4),
  ('Locomboo', 'App', 'Olvidé registrar mi ingreso o mi salida, ¿cómo lo corrijo?', 'Avísale a tu coordinador lo antes posible.
Él lo registra en "Ingresos / Salidas manuales" con la fecha, la hora real y la razón "Olvidó registrar".', 5),
  ('Locomboo', 'App', 'Perdí o se me dañó el carnet, ¿qué hago?', 'Informa a tu coordinador.
Mientras tanto, tus ingresos y salidas se registran de forma manual.
El coordinador puede reimprimir tu carnet desde "Gestor de personal" → "Carnet".', 6),
  ('Locomboo', 'App', '¿Por qué el botón Enviar / Solicitar está gris?', 'Se habilita solo cuando la información está completa.
Revisa que hayas escaneado tu carnet (o seleccionado al operario) y que llenaste las fechas y los campos obligatorios (tipo Vive CEMEX u Observaciones).
Si la fecha de regreso es anterior a la de salida, la solicitud no se habilita.', 7),
  ('Locomboo', 'App', '¿Cómo se calculan los "Días solicitados"?', 'La app los calcula sola con la fecha de salida y la de regreso: cuenta los días calendario entre las dos.
Si sales y regresas el mismo día, cuenta 1 día.', 8),
  ('Locomboo', 'App', '¿Cuál es la diferencia entre Préstamo y Reasignación?', 'Préstamo: el operario apoya otra planta por un tiempo (horas o días) y luego vuelve a la suya.
Reasignación: el operario se traslada de forma definitiva: la nueva planta queda como su planta asignada.', 9),
  ('Locomboo', 'App', '¿Quién puede entrar a Gestor de personal y a Revisión de personal?', 'Solo los coordinadores con usuario y contraseña habilitados.
Si eres coordinador y no tienes credenciales, solicítalas a soporte.', 10),
  ('Locomboo', 'App', '¿Qué significa que un curso o la licencia aparezca "Vencida"?', 'La fecha de vigencia ya pasó y el operario debe renovar ese curso o su licencia.
Coordina la renovación con RH: cuando se renueve, RH actualiza la fecha en "Gestor de personal" → Edición.', 11),
  ('Locomboo', 'App', 'En Gestor de personal, ¿qué diferencia hay entre Operación y Recursos Humanos?', 'Operación solo puede cambiar el Estado y el Préstamo del operario.
Recursos Humanos puede editar todos los datos y es la única área que habilita Ingreso, Edición y Retiro.', 12),
  ('Locomboo', 'App', '¿Dónde veo las horas extras que se registraron?', 'En el menú de coordinador → "Horas extras" → pestaña "Seguimiento".
Puedes filtrar por operario (seleccionándolo en la lista) o por planta.', 13),
  ('POLARIS', 'Portal', '¿Los datos que veo en los manuales son reales?', 'No. Los manuales son simulaciones para aprender a usar cada herramienta.
Los datos, nombres de ejemplo y cifras son ilustrativos y nada de lo que hagas en ellos se envía de verdad.', 0),
  ('POLARIS', 'Acceso y cuenta', '¿Con qué correo puedo ingresar a POLARIS?', 'Con tu correo corporativo @cemex.com o @ext.cemex.com.', 1),
  ('POLARIS', 'Acceso y cuenta', 'Me aparece un aviso de conexión de la red de CEMEX, ¿qué hago?', 'Haz clic en Activar conexión y luego en Continuar en la advertencia que aparece.
Después vuelve a POLARIS y haz clic en Reintentar.', 2),
  ('POLARIS', 'Portal', '¿Cómo hago seguimiento a una pregunta que ya envié?', 'En el menú lateral de POLARIS entra a Seguimiento de preguntas.
Ahí ves el estado de cada pregunta y las respuestas del equipo.', 3),
  ('Eureka', NULL, '¿Qué mide el Cumplimiento de Servicio?', 'Mide el porcentaje de viajes que llegan al cliente dentro del horario acordado.
Se calcula como viajes cumplidos ÷ viajes totales × 100.
Un viaje es cumplido si llega dentro de la hora pactada con el cliente, con una tolerancia de ±30 minutos.', 0),
  ('Eureka', NULL, '¿Qué significan los colores de los indicadores?', 'La mayoría de indicadores usa el semáforo general:
Verde (Bueno): 85% o más.
Amarillo (Atención): de 80% a menos de 85%.
Naranja (Riesgo): de 70% a menos de 80%.
Rojo (Crítico): menos de 70%.
Dispo. Mixer, Operatividad, Calidad, AS Rod vs Ingresos y Cancel% tienen su propio semáforo. Los indicadores de tiempo se comparan contra su estándar.', 1),
  ('Eureka', NULL, '¿Cómo se calcula la Capacidad de Servicio?', 'Mide qué tan preparada está la operación para prestar el servicio.
Es un promedio ponderado: Disp. Planta (OEE) × 50% + Dispo. Mixer × 25% + Disponibilidad AS × 25%.', 2),
  ('Eureka', NULL, '¿Qué es la Disp. Planta (OEE) y cómo se calcula?', 'Mide qué tan eficiente fue la planta en su conjunto.
Es el promedio de tres componentes: Operatividad, Rendimiento y Calidad.', 3),
  ('Eureka', NULL, '¿Qué miden Operatividad, Rendimiento y Calidad?', 'Operatividad: qué porcentaje de la jornada la planta estuvo disponible para operar (horas disponibles ÷ horas totales de la jornada, que va del primer al último cargue). Las paradas salen de Novedades ReadyMix, categoría "Paro total".
Rendimiento: qué tan rápido se cargó frente a la tasa ideal de cargue definida por Mantenimiento Industrial.
Calidad: porcentaje de viajes sin retrabajo, según los registros de Consulticket en SAP.', 4),
  ('Eureka', NULL, '¿Cómo se calcula la Dispo. Mixer y de dónde sale el dato?', 'Es el porcentaje de mixers que la operación necesita y que realmente están disponibles: placas disponibles y operativas ÷ placas asignadas a rodar.
Las mixers en reserva, aunque estén operativas, no cuentan como asignadas a rodar.
El dato sale de la aplicación Orion.
Verde si es mayor a 95%, rojo si es 95% o menos.', 5),
  ('Eureka', NULL, '¿Qué mide la Disponibilidad AS?', 'Es el porcentaje de agentes de servicio requeridos según el lineamiento operativo que realmente ingresaron a trabajar.
Se calcula como agentes de servicio que ingresaron por Locomboo ÷ agentes de servicio requeridos según el lineamiento operativo.', 6),
  ('Eureka', 'Tiempo real', '¿Qué significa AS Rod vs Ingresos por encima o por debajo de 100%?', 'Compara los agentes de servicio que hicieron al menos un viaje con los que registraron su ingreso en Locomboo.
Más de 100%: hay agentes rodando que no aparecen registrados en Locomboo.
Menos de 100%: hay personas registradas en Locomboo que no están rodando.
Lo ideal es 100%.', 7),
  ('Eureka', NULL, '¿Qué diferencia hay entre Actual, Proyección y vs Prog. en Volumen Real vs ME?', 'Los tres comparan el volumen contra el Mejor Estimado (ME) del equipo comercial:
Actual: volumen real acumulado hasta la hora de corte ÷ media diaria del ME.
Proyección: dónde terminaría el día si se entrega todo lo confirmado: (volumen real acumulado + volumen confirmado pendiente) ÷ media diaria del ME.
vs Prog.: volumen real acumulado hasta la hora de corte ÷ volumen programado al cierre del día anterior.
Si alguno supera el 100%, se muestra en amarillo.', 8),
  ('Eureka', NULL, '¿Cómo se lee el Over-Booking?', 'Mide qué tanto la programación de viajes supera la capacidad de la operación. La capacidad depende de los vehículos disponibles según el lineamiento operativo y del Tiempo de Ciclo.
Ejemplo: 165 viajes confirmados frente a una capacidad de 120 viajes: (165 ÷ 120) − 100% = 37,5%, es decir, 38% de sobre-programación.
En Tiempo real, las Alertas son las horas del día en que hubo sobre-programación.', 9),
  ('Eureka', NULL, '¿Qué es el Cancel% y por qué un valor bajo es mejor?', 'Es el porcentaje de viajes cancelados frente a los viajes programados: viajes cancelados ÷ viajes programados × 100.
Se interpreta al revés que los demás: entre más bajo, mejor.
Verde si es 15% o menos, rojo si supera el 15%.', 10),
  ('Eureka', NULL, '¿Cómo se calcula el Tiempo de Ciclo y cuáles son sus estándares?', 'Es la duración total de un viaje: Cargue + Alistamiento + Hacia obra + En obra + Hacia planta. El objetivo es 180 minutos.
Estándares de cada tramo:
Alistamiento (de fin de cargue a salida de planta): 18 min.
Hacia obra: 30 min.
En obra: 60 min.
Hacia planta: 30 min.
El Cargue se mide en minutos por m³ y se compara contra la tasa ideal de Mantenimiento Industrial.
Verde por debajo del estándar, rojo por encima.', 11),
  ('Eureka', 'Tiempo real', '¿Para qué sirve el botón Recursos Teóricos?', 'Activa una vista que compara los recursos que están rodando con los recursos teóricos necesarios para atender el volumen programado del día.
Con la vista activa, Dispo. Mixer muestra Mx Roda / Mx Teórico y Disponibilidad AS muestra AS Roda / AS Teórico.', 12),
  ('Eureka', 'Tiempo real', '¿Cómo filtro Eureka por cluster o por planta?', 'Haz clic en uno de los botones de cluster (Antioquia, Centro, Sur Oriente, Occidente o Santander) para filtrar el tablero. Haz clic de nuevo para volver a la vista general.
Para ver una planta, haz clic en su barra en la gráfica Cumplimiento Servicio por planta.', 13),
  ('Eureka', 'Histórico', '¿Qué significan la flecha y los pp en Eureka Histórico?', 'Muestran la variación frente al periodo anterior en puntos porcentuales (pp).
Ejemplo: +2,68 pp significa que el indicador subió 2,68 puntos.', 14),
  ('Eureka', 'Histórico', '¿Cómo comparo varios indicadores en la gráfica histórica?', 'Elige un indicador con los botones debajo de la gráfica. Para compararlo con otro, mantén Ctrl (⌘ en Mac) y haz clic en el segundo.
Pasa el cursor sobre la gráfica para ver el detalle de cada fecha.', 15),
  ('Eureka', 'Histórico', '¿Cómo leo la gráfica Causa Perdida Cumplimiento?', 'Parte del 100% de cumplimiento y cada barra es una categoría de pérdida, por ejemplo "Demoras en obra". Su tamaño son los puntos porcentuales que esa categoría restó hasta llegar al cumplimiento final.
La información sale de los registros que el equipo de logística guarda en Novedades ReMix 2.0.
Pasa el cursor sobre una barra para ver los comentarios de cada día.', 16),
  ('Eureka', 'Histórico', '¿Qué es la Utilización en Eureka Histórico?', 'Mide qué tanto se aprovechó la disponibilidad operativa de la planta: horas en que la planta estuvo realmente cargando ÷ jornada completa de la planta.', 17),
  ('Eureka', 'Histórico', '¿Cómo filtro el ranking y las tarjetas por una planta?', 'En el Ranking de plantas por cumplimiento de servicio, haz clic sobre una planta: las tarjetas e indicadores se filtran por ella. Haz clic de nuevo sobre la misma planta para volver a la vista general.
También puedes usar los filtros de Planta y de Fecha en la parte superior.', 18);

UPDATE consultas_manual SET manual = 'Locomboo' WHERE manual = 'Locombo';
UPDATE visitas_anonimas SET manual = 'Locomboo' WHERE manual = 'Locombo';
