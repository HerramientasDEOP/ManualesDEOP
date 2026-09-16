# Contexto del proyecto — Manuales Interactivos Eureka

## Qué es esto
Dos manuales de usuario interactivos activos, cada uno un "conjunto"
que fusiona 2 tableros/apps relacionados en un solo archivo (más 2
archivos legacy que quedaron absorbidos dentro de ellos, ver notas):

1. **[`Manual_Eureka.html`](Manual_Eureka.html)** — **manual conjunto**:
   contiene tanto "Eureka" (tiempo real) como "Eureka Histórico" en un
   solo archivo, con una pantalla inicial para elegir cuál ver y botones
   de navegación cruzada entre ambos. Ver la sección propia
   "Manual 1 — `Manual_Eureka.html` (conjunto EurekaRT + Eureka
   Histórico)" más abajo — incluye el detalle técnico completo de cómo
   se fusionaron ambos tableros en un solo documento.

   > ⚠️ **`Manual_EurekaHistorico.html` quedó como archivo legacy/standalone**
   > — su contenido ya está 100% absorbido dentro de `Manual_Eureka.html`
   > (sección "Eureka Histórico"). Se conserva por si sirve de referencia,
   > pero **ya no es la fuente de verdad**: cualquier corrección a partir
   > de ahora debe hacerse directamente en `Manual_Eureka.html`. Candidato
   > a borrar cuando el usuario confirme que ya no lo necesita.

2. **[`Manual_Orion.html`](Manual_Orion.html)** — **manual conjunto**
   (desde 2026-09-11, mismo patrón que `Manual_Eureka.html`): contiene
   tanto el recorrido guiado de la **app Orion** (gestión de tickets de
   mantenimiento automotriz de mixers/camiones de concreto, con 2
   recorridos guiados paso a paso) como el **tablero de Power BI de
   Orion** (`#stageT`, 8 pantallas navegables con menú lateral
   "Páginas"), con una pantalla inicial para elegir cuál ver. Ver
   sección propia más abajo — incluye el detalle técnico de la fusión.

   > ⚠️ **`Manual_OrionTablero.html` quedó como archivo legacy/standalone**
   > — su contenido ya está 100% absorbido dentro de `Manual_Orion.html`
   > (como `#stageT`). Se conserva por si sirve de referencia, pero
   > **ya no es la fuente de verdad**. Candidato a borrar cuando el
   > usuario confirme que ya no lo necesita.

Cada tarjeta, botón, barra o punto del gráfico tiene un popup explicativo
(hover en escritorio, tap en móvil/tablet). Ambos son **archivos HTML
únicos y autocontenidos** (sin frameworks, sin servidor, sin dependencias
externas — ver sección de portabilidad abajo).

## Portabilidad: todas las imágenes van embebidas en base64
**Problema que se corrigió:** al principio las imágenes se referenciaban
con rutas relativas (`src="Recursos/Logo-Eureka.png"`), lo que solo
funcionaba si el archivo `.html` se abría junto a la carpeta `Recursos/`
en el mismo computador. Si se enviaba el `.html` suelto a otra persona,
las imágenes no cargaban.

**Solución:** todas las imágenes usadas en ambos archivos se convirtieron
a base64 y quedaron incrustadas directamente como
`src="data:image/png;base64,...."` dentro del propio HTML. Ya no hay
ninguna dependencia de la carpeta `Recursos/` — cada `.html` es 100%
autocontenido (por eso pesan ~2.3–2.4 MB cada uno). Verificado copiando
cada archivo a una carpeta vacía sin `Recursos/` al lado y confirmando que
todo (logo, íconos, popups de imagen) carga igual.

**Si se agregan imágenes nuevas más adelante:** hay que repetir el mismo
proceso (convertir a base64 e incrustar) — si se agrega un `<img
src="Recursos/...">` con ruta relativa se va a romper para cualquiera que
no tenga esa carpeta exacta al lado del archivo.

---

# Manual 1 — `Manual_Eureka.html` (conjunto EurekaRT + Eureka Histórico)

## Estructura general (flujo de entrada del manual conjunto)
1. **`#welcomeScreen`** — imagen `InicioManualEureka.png` (splash de
   bienvenida con branding CEMEX, reemplazó a `Eurekainicio.png`) + botón
   "Comenzar →".
2. **`#chooseManualScreen`** (nueva pantalla) — "¿Qué manual quieres
   ver?" con 2 botones: "Eureka Tiempo Real" (`#btnChooseRT`) y "Eureka
   Histórico" (`#btnChooseH`). Cada uno oculta esta pantalla, muestra
   `#appContent` y llama a `showRT()` / `showHistorico()` respectivamente.
3. **`#appContent`** — contiene **ambos tableros a la vez** en el DOM,
   uno oculto con `display:none`:
   - `#stage` / `#boardWrap` (id sin sufijo) — tablero **Eureka RT**,
     ancho de diseño 1650px, función de escalado `fitBoard()`.
   - `#stageH` / `#boardWrapH` (sufijo **H** en todo lo propio de este
     tablero) — tablero **Eureka Histórico**, ancho de diseño 1700px,
     función de escalado `fitBoardH()`. Ver la sección "Cómo se
     fusionaron los dos tableros" más abajo para el detalle completo de
     qué se renombró y por qué.
   - El `<h1 id="pageHeaderTitle">` / `<span id="pageHeaderBadge">` /
     `<p id="pageHeaderSub">` de arriba (compartidos por ambos) se
     actualizan por JS dentro de `showRT()`/`showHistorico()` para que
     el badge diga "Tiempo real" o "Histórico" según cuál esté activo.
4. **Navegación cruzada**: el botón "Eureka Histórico" que ya existía
   dentro del tablero RT (`data-key="eurekaHistorico"`, ahora también
   `id="btnEurekaHistoricoNav"`) y el botón "Eureka RT" dentro del
   tablero Histórico (`data-key="eurekaRT"`, ahora también
   `id="btnEurekaRTNav"`) llaman a `showHistorico()`/`showRT()`
   directamente — **antes solo tenían popup explicativo, ahora navegan
   de verdad**. "Eureka DELFOS" en ambos tableros sigue siendo solo
   informativo (esa tercera herramienta no forma parte de este manual).

## Estructura del tablero Eureka RT (dentro de `#stage`/`#boardWrap`)
- **`#board`** — parte 1 (logo, Cump. Servicio, Cargue/Alistamiento, En
  Obra/Tiempo Ciclo, Capacidad de Servicio, Dispo. Mixer/Disp.
  Planta/Disponibilidad As, Operatividad/Rendimiento/Calidad/AS Rod vs
  Ingresos, Volumen Real vs ME, Over-Booking, Cancel%).
- **`#board2`** — parte 2 (filtros de región + gráfico "Cumplimiento
  Servicio" por planta + leyenda + logo CEMEX).

## Vistas dinámicas (estado del tablero)
`currentView` puede ser `'general'`, cualquiera de las **5 claves de
cluster** (`'antioquia' | 'centro' | 'suroriente' | 'occidente' |
'santander'`) o `'plant:<Nombre>'` para **cualquiera de las 20 plantas**
del gráfico general (ej. `'plant:El Dorado'`). Todo pasa por la función
central `renderView(view)`.

> ⚠️ **Actualizado 2026-09-09**: originalmente solo Antioquia (cluster) y
> Florida (planta) eran seleccionables — los otros 4 filtros de región
> decían "todavía no está habilitado" y las demás 19 barras del gráfico
> solo mostraban un popup de "pendiente de confirmar". El usuario pidió
> volver esto funcional para **las 20 plantas y los 5 clusters**,
> inventando datos con tal de que "tengan sentido" (correlacionados con
> el %Cumpto real de cada barra, no aleatorios sueltos). Ver detalle
> técnico completo más abajo, sección "Filtro funcional por planta y por
> cluster (generador de datos ilustrativos)".

- **General** (por defecto): fila de 5 filtros de región
  (`#regionTabsGeneral`, **nunca se oculta**) + gráfico completo de 20
  plantas (`#chartGeneral`).
- **Cluster** (clic en cualquiera de los 5 botones de la fila de
  filtros): los otros 4 botones se ocultan (`visibility:hidden`) y el
  elegido **se queda clavado en su misma posición horizontal** dentro de
  la fila, solo que con fondo negro (clase `.tab-btn-cluster-active` —
  ver detalle de por qué `visibility` y no `display:none` más abajo) +
  el gráfico de 20 barras se reemplaza por uno más chico solo con las
  plantas de ese cluster (`#chartCluster`, generado por JS en
  `buildClusterChartHTML(key)` — antes era un `<div id="chartAntioquia">`
  con 3 barras hardcodeadas a mano en el HTML, ahora es un contenedor
  vacío que se llena dinámicamente para cualquiera de los 5 clusters).
  Clic de nuevo en el mismo botón (sigue visible y activo) vuelve a
  `'general'`.
- **Planta individual** (clic en cualquiera de las 20 barras del gráfico
  general, o en una barra dentro de un cluster — hace drill-down a esa
  planta): igual que con un cluster, se ocultan los otros 4 botones y
  queda visible solo el del cluster al que pertenece esa planta — pero
  **sin** el estilo activo/negro, es puramente informativo (dice a qué
  cluster pertenece la planta elegida, mismo rol que tenía
  `santanderCrossFilter` originalmente solo para Florida→Santander). La
  barra en el gráfico queda resaltada (verde oscuro si la planta es
  verde, **rojo oscuro** si es roja — `.bar.red.bar-highlight`, agregado
  para que "El Dorado" no se vea verde al seleccionarla) con su etiqueta
  en negrita y las demás barras se ven difuminadas
  (`faded-green`/`faded-red`). Todos los KPI cambian a los datos de esa
  planta. Clic de nuevo en la barra vuelve a `'general'`. Ver detalle
  técnico completo (por qué `visibility:hidden` y no `display:none`, qué
  estilos NO se pueden cambiar en `.tab-btn-cluster-active` sin que el
  botón se corra unos px) en "Corrección posterior: los 5 botones de
  cluster nunca cambian de contenedor" más abajo.

Todas las vistas comparten el mismo mecanismo: `applyView(view)` recorre
el dataset correspondiente y pisa `textContent`/`className` de cada
elemento por `id` (patrón `v-nombreDelCampo`, ej. `v-cumpServicio`,
`v-dispoMixer`, `v-volActualPct`, etc.) — `VIEW_VALUES[view]` para
`'general'`/clusters, `PLANT_VIEWS[nombre]` para `'plant:<Nombre>'`. Para
agregar una vista nueva a mano (no generada): agregar su bloque de datos
en `VIEW_VALUES`, asegurarse de que tenga **todas** las mismas claves que
las otras vistas (si falta una, ese campo se queda con el valor de la
vista anterior).

### Filtro funcional por planta y por cluster (generador de datos ilustrativos)
Antioquia y Florida ya tenían datasets escritos a mano
(`VIEW_VALUES.antioquia` / `VIEW_VALUES.florida`, **sin tocar** en este
cambio). Para las otras **19 plantas** y los otros **3 clusters** (Centro,
Sur Oriente, Occidente — Santander solo tiene a Florida como miembro, así
que `VIEW_VALUES.santander` es simplemente un alias de
`VIEW_VALUES.florida`) escribir ~22 bloques de datos a mano habría sido
enorme y fácil de dejar inconsistente, así que se optó por un
**generador determinístico** (`buildIllustrativeKPI(basePct, seed)`, cerca
de `VIEW_VALUES` en el script): a partir del %Cumpto real de la barra (el
mismo `data-pct` que ya estaba en el HTML) calcula el resto de
indicadores relacionados con una fórmula + una semilla de texto (nombre de
la planta o `'cluster:<key>'`) que pasa por `seededRandom(seed)` — mismo
seed = mismo resultado siempre (no cambia entre visitas ni entre
hover/clic repetidos). La idea es que una planta/cluster con mejor
cumplimiento también salga con mejores indicadores relacionados (menos
cancelación, menos over-booking, KPIs más verdes) y viceversa — "que
tengan sentido" en vez de números sueltos al azar, como pidió el usuario.

- **`CLUSTERS`** (objeto): las 5 claves de cluster → `{label, plants:[...]}`.
  La agrupación de las 20 plantas en clusters **la dio el usuario
  directamente** (no es una suposición geográfica como en el primer
  intento de esta función, que sí era inventada y tuvo que corregirse) —
  Antioquia: Rionegro, Medellín, Bello; Centro: Bosa, Soacha, Sur, Puente
  Aranda, Tocancipa, 240, PHC, Centenario, El Dorado, 170 (10 plantas);
  Sur Oriente: Fusa, Ibague, Sumapaz; Occidente: Tulua, Cali Sur, Pereira;
  Santander: Florida (sin cambios). Si se agrega alguna planta nueva al
  tablero, hay que decirle a mano a qué cluster pertenece — no hay forma
  de inferirlo del nombre.
- **`PLANT_VIEWS`** (objeto, se construye una vez al cargar la página
  leyendo `#chartGeneral .chart-bar[data-plant]`): dataset completo por
  planta, `PLANT_VIEWS.Florida` es simplemente `VIEW_VALUES.florida`
  (reusado, no regenerado); las otras 19 se generan.
- **`buildClusterChartHTML(key)`**: arma el HTML del mini-gráfico de un
  cluster (barras + labels + eje) leyendo el color/alto/pct directo de
  las barras ya existentes en `#chartGeneral` para esas plantas — no hay
  datos de barra duplicados en dos lugares.
- **Delegación de eventos en `.chart-bar`**: como las barras de
  `#chartCluster` se regeneran por JS (innerHTML) cada vez que cambia el
  cluster activo, un `addEventListener` puesto directo en cada barra al
  cargar la página (como era antes, solo para `#barFlorida`) no las
  alcanzaría. Se cambió a listeners delegados en `document` (hover con
  `mouseover`/`mouseout`, clic con `click`) que hacen
  `e.target.closest('.chart-bar')`. **Bug real encontrado y corregido en
  esta tarea:** en modo táctil (sin mouse), el `.chart-card` que envuelve
  todo el gráfico es también un `.hotspot`, y su propio listener de clic
  (fase de burbuja) hace `e.stopPropagation()` — eso cortaba el evento
  antes de que llegara a los listeners delegados en `document`, así que
  tocar una barra en móvil no filtraba nada. Solución: los listeners
  delegados de `.chart-bar` se registraron en **fase de captura**
  (tercer argumento `true` en `addEventListener`), que corre antes que
  la fase de burbuja del `.chart-card`, así el `stopPropagation()`
  posterior ya no afecta. Si se agregan más elementos `.hotspot` que
  envuelvan contenido con su propio filtro/clic delegado, tener este
  mismo riesgo en cuenta.
- El popup expandido de Over-Booking (`ExpandidaVistaOverB*.png`) no
  tiene una imagen de referencia real por cada cluster/planta nueva —
  `pickOverBookingImage(view)` cae a la imagen de Antioquia para
  cualquier cluster nuevo y a la de Florida para cualquier planta nueva
  (antes caía siempre a la general para todo lo que no fuera Antioquia/
  Florida exactos).

#### Corrección posterior: los 5 botones de cluster nunca cambian de contenedor
La primera versión de esta función reemplazaba **toda la fila** de 5
botones (`#regionTabsGeneral`) por un botón genérico aparte
(`#regionTabsClusterActive`/`#btnClusterActive`) igual al patrón viejo de
Antioquia, y otro genérico para la planta
(`#regionTabsPlantActive`/`#btnPlantCluster`). El usuario señaló que eso
estaba mal: el botón elegido debe **quedarse exactamente en el mismo
lugar** donde ya estaba dentro de la fila de 5 (solo desaparecen los
otros 4), y al deseleccionar deben volver a aparecer los 5. Se rehizo así
— ya **no existen** `#regionTabsClusterActive`/`#regionTabsPlantActive`/
`#btnClusterActive`/`#btnPlantCluster`, `#regionTabsGeneral` **nunca se
oculta**:
- Los 5 botones (`btnAntioquia`, `btnCentro`, `btnSurOriente`,
  `btnOccidente`, `btnSantander`) viven siempre en la misma fila.
  `updateRegionTabs(view)` (cerca de `renderView`) decide, en cada
  cambio de vista, cuál de los 5 se queda visible y cómo se ve:
  - **Vista `'general'`**: los 5 visibles, estilo normal.
  - **Vista de cluster** (ej. `'centro'`): solo el botón de ese cluster
    visible, con la clase `.tab-btn-cluster-active` (fondo negro) — los
    otros 4 se ocultan con `visibility:hidden` (¡no `display:none`!).
  - **Vista de planta** (ej. `'plant:El Dorado'`): solo el botón del
    cluster al que pertenece esa planta visible (vía `plantClusterKey`),
    con estilo **normal** (sin `.tab-btn-cluster-active` — es solo
    informativo, dice a qué cluster pertenece la planta elegida, igual
    que hacía `santanderCrossFilter` originalmente con Florida).
- **Por qué `visibility:hidden` y no `display:none`:** la fila usa
  `justify-content:space-between`. Si un botón se oculta con
  `display:none` deja de contar en el cálculo de espacio del flexbox y
  los demás (o el único que queda) se recorren de posición — exactamente
  lo que el usuario NO quería. `visibility:hidden` sigue reservando el
  espacio del botón (sigue "ocupando su lugar" en el layout) pero no se
  ve ni es clicleable, así que el botón visible se queda clavado en su
  posición horizontal original.
- **Ojo con `.tab-btn-cluster-active`:** a propósito **no** cambia
  `padding`, `border-width` ni `font-weight` respecto al botón normal —
  cualquiera de esos cambia el ancho intrínseco del botón y, con
  `space-between`, eso mueve 2-3px la posición de todos los botones de la
  fila (se detectó probando con Playwright, medí el `getBoundingClientRect()`
  antes/después). Solo cambian `background`/`color`/`border-color`/
  `box-shadow` (no afectan el tamaño de la caja).
- Los `data-key` de los 5 botones también se actualizan en
  `updateRegionTabs`: `filtroXxx` (normal) ↔ `xxxActivo` (cluster
  seleccionado, ya existían en `INDICATORS`) ↔ `plantCrossFilter`
  (informativo de planta, texto `mide` se reescribe al vuelo con el
  nombre de la planta y el cluster).
- Como sigue siendo el **mismo botón físico** (mismo id, mismo listener
  de `bindClusterButton`), un clic sobre el botón que quedó visible en
  modo "informativo de planta" SÍ navega a la vista de ese cluster
  completo (no estaba pedido, pero es gratis por reusar el mismo botón
  en vez de duplicar uno aparte, y es coherente: "ver todo el cluster de
  esta planta").

#### Corrección posterior: "Última actualización" — reloj en vivo
Antes cada vista (general/Antioquia/Florida/Recursos/clusters/plantas)
tenía su propia fecha/hora **fija** para `v-ultimaAct` (varias fechas de
septiembre 2026 distintas, algunas ni siquiera eran "hoy"). El usuario
pidió que siempre muestre la **fecha real de hoy** con la **hora actual
menos 3 minutos**, todo el tiempo. Se sacó `v-ultimaAct` de
`VIEW_VALUES`/`PLANT_VIEWS`/`buildIllustrativeKPI` por completo (ya no es
un campo "por vista") y se agregó, cerca de donde se arma `PLANT_VIEWS`:
`formatUltimaAct(d)` (formatea `M/D/YYYY h:mm:ss AM/PM`, mismo patrón que
antes) + `updateUltimaAct()` (pisa `#v-ultimaAct` con
`new Date(Date.now() - 3*60*1000)`) — se actualiza solo, sin importar qué
vista esté activa, mientras la página siga abierta.

> ⚠️ **Corrección 2026-09-10**: el intervalo inicial era
> `setInterval(updateUltimaAct, 1000)` (recalculaba cada segundo, así que
> los segundos se veían "correr" en pantalla). El usuario pidió que se
> vea **estática** — que solo cambie la hora cada 3 minutos, sin
> segundero visible. Se cambió a
> `setInterval(updateUltimaAct, 3 * 60 * 1000)`. El valor mostrado sigue
> siendo "ahora menos 3 min" en el momento en que se recalcula, solo que
> ahora se recalcula cada 3 min en vez de cada segundo.

## Popups divididos por pieza dentro de una tarjeta (2026-09-09)
El usuario pidió, tarjeta por tarjeta, dejar de usar **un solo popup para
toda la tarjeta** cuando esa tarjeta muestra varios números/piezas de
información distintas — cada pieza debe tener su propio popup específico
al pasar el cursor (o tocar) solo esa pieza. Patrón aplicado (y a seguir
para cualquier tarjeta nueva con el mismo problema):

- **No hace falta un rectángulo invisible superpuesto.** Cada pieza ya es
  su propio elemento HTML (un `<span>`, un `<div>`) — simplemente se le
  agrega `class="hotspot"` + `data-key="..."` directamente a ESE elemento
  (en vez de a un contenedor que envuelve todo). El motor de tooltips
  genérico (`INDICATORS`/`showTooltip`/`hideTooltip`) ya soporta esto sin
  cambios: cada `.hotspot` es independiente.
- **Anidar un `.hotspot` dentro de otro `.hotspot` funciona bien** (ya
  existía un precedente: `.half[data-key="alistamiento"]` dentro de
  `.split-card.hotspot[data-key="cargue"]`). Al entrar al hijo con el
  mouse, el propio `mouseenter` del hijo se dispara igual (aunque ya
  estabas dentro del padre) y pisa el tooltip con el contenido del hijo —
  no hace falta ningún `hideTooltip()` manual extra. En táctil, el
  `e.stopPropagation()` que ya tiene el manejador de clic de cada
  `.hotspot` evita que el tap en el hijo también dispare el del padre.
  Se usó este patrón para el ícono (hipervínculo) que vive DENTRO del
  título de una tarjeta (Over-Booking, Volumen Real vs ME, Cancel%).
- **Cuando la tarjeta entera era un solo hotspot**, se le quita `hotspot`
  + `data-key` al contenedor exterior (se queda solo con `card
  border-blue`, sin popup propio) y se reparte entre las piezas internas.
  No queda ningún "popup de repuesto" para el espacio vacío entre piezas
  — eso es intencional (pedido explícito del usuario).

### Tarjetas ya divididas
- **Over-Booking** (`overbooking-card`): `overBooking` (título, general),
  `overBookingIcon` (ícono, solo la nota de hipervínculo),
  `overBookingViajes` (el `165 / 120 viajes`), `overBookingAlertas` (el
  `2 alertas`), `overBookingPct` (el `38%`). La barrita azul
  (`#overBookingBarWrap`) sigue con su popup de imagen aparte, sin
  cambios — eso ya estaba bien.
- **Volumen Real vs ME** (`volumen-card`): `volumenRealME` (título),
  `volumenRealMEIcon` (ícono), `volumenActual`, `volumenProyeccion`,
  `volumenVsProg` (una por cada fila Actual/Proyección/vs Prog.).
- **Cargue / Alistamiento / En Obra / Tiempo Ciclo** (los 2 `split-card`
  bajo el logo): cada uno de los 4 ahora tiene DOS popups —
  `<metric>` en el `.half-title` (solo "Qué mide", la explicación
  general) y `<metric>Valor` en el `.half-value-row` (el número + qué
  significa la flecha — antes todo esto vivía junto en un solo popup por
  tarjeta). Los 4 `split-card`/`.half` exteriores ya no son hotspot ellos
  mismos.
- **Capacidad de Servicio, Dispo. Mixer, Disp. Planta (OEE),
  Disponibilidad As**: el `<img>` del ícono ahora es su propio hotspot
  (`capacidadServicioIcon`/`dispoMixerIcon`/`dispPlantaOEEIcon`/
  `disponibilidadAsIcon`, solo la nota de hipervínculo) y el
  `.content`/`.kpi-text` (título+valor) es OTRO hotspot separado con el
  `data-key` original (`capacidadServicio`/`dispoMixer`/etc., sin
  `hasIconLink` ya que eso se movió al ícono). Icono y contenido son
  hermanos (no anidados) en estas 4 — más simple que Over-Booking/Cancel%
  porque en el HTML original el ícono nunca estuvo dentro del título.
- **Cancel%**: mismo criterio que Over-Booking (ícono anidado dentro del
  título) — `cancelPct` (título+valor juntos, no se dividieron esos dos)
  y `cancelPctIcon` (ícono, anidado).

Estas son las **7 tarjetas con hipervínculo** (`hasIconLink`) — todas ya
tienen el ícono separado del resto de la explicación del indicador.

## Los popups de BOTONES ya no usan "Qué mide"/"Cómo se calcula" (2026-09-09)
El usuario señaló que no tiene sentido que un botón (algo que se hace
clic para que pase algo) tenga un popup con encabezados "Qué mide" /
"Cómo se calcula" — esos campos (`mide`/`calculo`/`fuente`/`flecha`) son
para **indicadores** (tarjetas que muestran un dato). Para elementos que
son **acciones** (botones reales, no tarjetas de datos), la entrada en
`INDICATORS` ahora usa **solo** `accion` (se renderiza bajo "Qué puedes
hacer"), sin `mide`. Ya corregidos en la parte RT: `eurekaHistorico`,
`eurekaDelfos`, `recursosTeor` (el toggle, con toda la explicación de qué
cambia metida en el propio `accion`), `filtroAntioquia/Centro/
SurOriente/Occidente/Santander`, `antioquiaActivo/centroActivo/
surorienteActivo/occidenteActivo/santanderActivo`, y `plantCrossFilter`
(este último se patchea en runtime desde `updateRegionTabs()` — ojo que
ahora escribe en `INDICATORS.plantCrossFilter.accion`, **no** `.mide`, si
se vuelve a tocar ese código). Los botones equivalentes del lado Eureka
Histórico (`eurekaRT`, `eurekaDelfosH`, etc.) **no se tocaron todavía** —
quedan pendientes para cuando se pula esa parte del manual.

### Recursos Teóricos (toggle independiente, no es una "vista" más)
Botón cuadrado azul sólido `#btnRecursosTeor` (ya no es el pill+knob
original — se cambió por pedido del usuario para que coincida con la
imagen real). `recursosTeorActive` es un booleano aparte de
`currentView`: al activarlo aplica el dataset `VIEW_VALUES.recursos`
(que también cambia los **títulos** de 3 tarjetas: "Capacidad de
Servicio" → "Capacidad de Servicio Teórico", "Dispo. Mixer" → "Mx Roda
/Mx Teórico", "Disponibilidad As" → "AS Roda /AS Teórico", vía los ids
`v-capacidadServicioTitle`, `v-dispoMixerTitle`,
`v-disponibilidadAsTitle`). Al cambiar de cluster/planta
(`renderView(...)`) se **desactiva automáticamente** porque no hay datos
de referencia para combinar Recursos Teóricos con Antioquia/Florida.

## Popups nativos estilo Power BI (además del tooltip oscuro genérico)
- **`#tooltip`** (oscuro): explicación genérica de cada tarjeta/botón,
  fuente de verdad = objeto `INDICATORS` (igual que antes).
- **`#chartTooltip`** (blanco, estilo tabla nativa de Power BI): aparece
  al pasar el mouse por **cualquier barra** de los gráficos de
  Cumplimiento Servicio (clase `.chart-bar`, tanto las 20 del general
  como las de cualquier cluster activo en `#chartCluster`). Muestra
  "Planta_Corta / <nombre>" y "%Cumpto / <valor>" + una nota de acción
  ("💡 clic para filtrar" o "🔄 clic para volver" si esa planta ya está
  activa) — **todas las barras son clicleables ahora**, ya no hay nota de
  "pendiente de confirmar" (ver sección "Filtro funcional por planta y
  por cluster" arriba). **Importante:** `showChartTooltip()` llama
  `hideTooltip()` primero para que no se empalme con el tooltip oscuro
  del `.chart-card` contenedor (bug ya corregido).
- **`#overBookingPopup`** (imagen real): al pasar el mouse por la
  barrita azul de Over-Booking (`#overBookingBarWrap`) aparece la imagen
  correspondiente a la vista activa — `ExpandidaVistaOverB.png`
  (general), `ExpandidaVistaOverBCLuster.png` (Antioquia),
  `ExpandidaVistaOverBPlanta.png` (Florida) — las 3 ya embebidas en
  base64. Es la réplica literal del popup expandido de Power BI (dos
  gráficos combinados de barra+línea), no un gráfico recreado a mano.

## Íconos reales (ya no emojis)
`Ajuste.png` (engranaje de Capacidad de Servicio), `Dispo.Mixer.png`,
`Disp.Planta.png`, `DisponibilidadAs.png` — las 3 tarjetas de Dispo.
Mixer/Disp. Planta (OEE)/Disponibilidad As se reestructuraron a layout
**ícono a la izquierda + texto a la derecha** (clase
`.kpi-card-icon-left`) para que coincida con el original (antes tenían
el ícono arriba centrado).

## Alineación (ajuste de fidelidad visual)
Las tarjetas "En Obra/Tiempo Ciclo" (columna izq.), "Operatividad /
Rendimiento / Calidad / AS Rod vs Ingresos" (columna centro) y
"Over-Booking / Cancel%" (columna derecha) quedan **con el mismo borde
inferior**, igual que en el tablero real — se verificó midiendo píxel a
píxel contra `Eurekacompleto.png`. El ajuste clave fue
`.bottom-right-row{margin-top:34px;}` para que Over-Booking baje al
mismo nivel.

## Indicadores/elementos — todos confirmados
Ya **no quedan** entradas `pending:true` en `INDICATORS` de este
archivo (ni en la parte RT ni en la parte Histórica fusionada) — el
equipo confirmó la definición de los 10 indicadores que faltaban
(Capacidad de Servicio, Dispo. Mixer, Disp. Planta (OEE), Disponibilidad
As, Operatividad, Rendimiento, Calidad, AS Rod vs Ingresos, Volumen Real
vs ME, Over-Booking) más los elementos de interfaz (logo, título,
botones, Recursos Teor., Última actualización) y el gráfico de
Cumplimiento Servicio por planta.

**Solo 7 tarjetas tienen ícono con hipervínculo real** (campo
`hasIconLink:true` en su entrada de `INDICATORS`, que agrega la sección
"🔗 Ícono" al popup): Capacidad de Servicio (`capacidad.png`), Dispo.
Mixer (`Disp.Mixer.png`), Disp. Planta OEE (`Disp.Planta.png`),
Disponibilidad As (`DisponibilidadAS.png`), Volumen Real vs ME
(`VolumenReal.png`), Over-Booking (`Over.png`) y Cancel%
(`cancel.png`) — son los mismos 7 íconos que el usuario compartió como
imágenes sueltas. **El logo NO tiene hipervínculo** (corrección
explícita del usuario — el logo es solo el logo, sin funcionalidad); el
resto de tarjetas (Cumplimiento Servicio, Cargue, Alistamiento, En
Obra, Tiempo de Ciclo, Operatividad, Rendimiento, Calidad, AS Rod vs
Ingresos) usan el ícono genérico `icon-building`/SVG decorativo sin
enlace, o no tienen ícono.

**Calidad** (confirmado, sin ambigüedad): viajes con retrabajo ÷ viajes
totales, dato del **Consulticket en SAP** — ya no lleva nota de "falta
confirmar" (antes se dudaba si el % mostrado era esta proporción directa
o su complemento; el usuario confirmó que es directa, "nada más nada
menos").

**Over-Booking** (reescrito con la explicación real que dio el usuario):
- `2 alertas` = cantidad de horas de toda la franja horaria del día en
  las que hubo sobre-programación (ej. 2 horas del día).
- `165 / 120 viajes` = viajes confirmados (165) vs. capacidad real (120,
  calculada con los carros por lineamiento operativo × tiempo de ciclo
  promedio).
- `38%` = 165÷120 = 137,5% − 100% = 37,5% ≈ 38%.
- El popup expandido (`#overBookingPopup`, aparece al pasar el mouse por
  la barrita azul) ahora incluye una leyenda (`.ob-caption`) explicando
  que ambas gráficas comparan carros disponibles vs. programación,
  franja horaria por franja horaria.
- ⚠️ El valor "23:05" que aparecía en una versión anterior de la
  explicación **se eliminó por completo** — el usuario aclaró que era
  el minuto de una grabación de reunión, sin relación con el indicador.

---

# Manual 2 — `Manual_EurekaHistorico.html` (⚠️ LEGACY — absorbido en `Manual_Eureka.html`)

> **Este archivo ya no se edita.** Todo su contenido (HTML/CSS/JS) fue
> fusionado dentro de `Manual_Eureka.html` (sección "Eureka Histórico",
> ids con sufijo `H`) — ver "Manual 1" arriba y la sección "Cómo se
> fusionaron los dos tableros en un solo archivo" justo después de esta.
> El resto de esta sección describe el diseño **tal como se construyó
> originalmente en el archivo standalone**; sigue siendo válido como
> referencia de qué hace cada pieza, solo que ahora esas piezas viven
> dentro de `Manual_Eureka.html` con nombres `*H`
> (`buildLineChart`→sigue igual pero ahora acepta `(view, metrics)` y
> soporta selección múltiple — ver nota de la gráfica de línea más
> abajo — `renderViewH`, `applyHValues`, `fitBoard`→`fitBoardH`, etc.).

Archivo nuevo, tablero distinto y más largo (3 secciones apiladas que no
caben en una pantalla), por eso tiene su **propio scroll interno** con
scrollbar delgada estilizada: `#scrollArea{max-height:720px;
overflow-y:auto;}` dentro de `#boardWrap` (ancho de diseño 1700px). Usa
la misma pantalla de bienvenida (`Eurekainicio.png` + "Comenzar →") y el
mismo mecanismo de `fitBoard()` para escalar responsive.

## Las 3 partes (imágenes de referencia: `Recursos/EurekaRT/Eurekah1.png`,
`Eurekah2.png`, `Eurekah3.png`)
1. **`#partH1`** — tarjeta "Cumplimiento" (arriba izq.), título "Eureka
   Histórico" + filtros Planta/Fecha (decorativos, no funcionales),
   botones "Eureka RT"/"Eureka DELFOS" + logo Eureka + CEMEX Desarrollo
   (arriba der.), **gráfico de línea** en el tiempo (generado por SVG vía
   JS, no hardcodeado), fila de 9 "metric tabs" (decorativa), y 5
   tarjetas KPI (Capacidad de servicio, Volumen Real Vs ME, Dispo. Planta
   (OEE), %Cancel, OverBooking).
2. **`#partH2`** — "Indicadores clave (Drivers)" (Dispo. Mixer/Dispo. AS),
   "Dispo. Planta (OEE)" (Operatividad/Rendimiento/Calidad/Utilización),
   "Tiempos promedio del proceso" (Cargue/Alistamiento/Hacia
   obra/En obra/Hacia planta + total "TC"), y el **gráfico de ranking de
   plantas** (20 barras con el % en texto blanco dentro de cada barra).
3. **`#partH3`** — **gráfico waterfall** "Causa Perdida Cumplimiento" (18
   categorías + barra "Total" en azul marino, conectadas por líneas
   grises tipo escalera).

## Vistas dinámicas: `'general' | 'bello'`
Mismo patrón que el Manual 1, función central `renderViewH(view)`:
- `applyHValues(view)` — pisa texto/clase de los ids `hv-*` (dataset
  `HVALUES`).
- `buildLineChart(LINE_DATA[view])` — reconstruye el SVG del gráfico de
  línea (puntos, polyline, eje Y) desde cero cada vez.
- `buildRankingChart(highlightPlant)` — reconstruye las 20 barras;
  cuando `highlightPlant='Bello'` las demás quedan difuminadas
  (`faded-green/gold/orange`) y Bello queda resaltada
  (`bar-highlight`, verde oscuro) con su label en negrita.
- `buildWaterfall(WATERFALL_DATA[view], isBello)` — reconstruye las
  barras del waterfall (posición/altura calculadas por acumulado).

**Selección de planta "Bello"** (clic en la barra "Bello" del ranking,
`renderViewH('bello')`): cambia **las 3 partes completas** a los valores
exactos de `Eureka1Bello.png` / `Eureka2Bello.png` / `Eureka3Bello.png`.
Clic de nuevo en la barra (ahora resaltada) vuelve a `'general'`.

⚠️ **Bug ya corregido dos veces durante la construcción:** en
`WATERFALL_DATA`, la categoría "Cumplimiento" debe ser `type:'red'`
(barra roja), **no** `'navy'` — solo "Total" es azul marino. Si se
edita este dataset, cuidado con volver a poner "Cumplimiento" en navy.

## Tarjetas divididas por pieza (2026-09-09)
Mismo pedido y mismo patrón que ya se aplicó en Eureka RT (ver la sección
"Popups divididos por pieza dentro de una tarjeta" en el bloque del
Manual 1 más arriba) — un solo `hotspot` por tarjeta entera se reemplaza
por un `hotspot` independiente en cada pieza (fila/valor/ícono), sin
rectángulos invisibles: se le agrega `class="hotspot"` + `data-key`
directo al elemento que ya existe. Aplicado a las 3 tarjetas de
`#partH2` que el usuario señaló como "muy cargadas de info":

- **"Indicadores clave (Drivers)"** (antes un solo `data-key="driversH"`
  en toda la tarjeta): ahora el título (`driversH`, explicación general)
  y cada fila por separado — `dispoMixerH` / `dispoAsH` (número+cálculo)
  y `dispoMixerHIcon` / `dispoAsHIcon` (el ícono chico junto al label,
  anidado dentro de `.dlabel`, solo la nota de hipervínculo).
- **"Dispo. Planta (OEE)" — detalle** (`oeeH`, la tarjeta con
  Operatividad/Rendimiento/Calidad/Utilización): título (`oeeH`) + una
  fila por componente (`operatividadH`/`rendimientoH`/`calidadH`/
  `utilizacionH`). Los íconos chicos (`icon-sm`) dentro de cada fila
  **se dejaron decorativos, sin hotspot propio** — a diferencia de
  Drivers, esta tarjeta nunca tuvo `hasIconLink:true` confirmado, así
  que no se inventó un hipervínculo que no está confirmado.
- **"Tiempos promedio del proceso"** (`tiemposH`): título (con su
  ícono chico también decorativo, mismo criterio que arriba) + una fila
  por tramo (`cargueH`/`alistamientoH`/`haciaObraH`/`enObraH`/
  `haciaPlantaH`) + el bloque "TC" aparte (`tcTotalH`, explica que es la
  suma de los 5 tramos).
- **Las 5 tarjetas KPI de `#partH1`** (Capacidad de servicio, Volumen
  Real Vs ME, Dispo. Planta (OEE), %Cancel, OverBooking): mismo criterio
  que sus equivalentes en RT — el `<img>` del ícono es su propio hotspot
  anidado (`capacidadServicioHIcon`/`volumenRealHIcon`/`dispPlantaHIcon`/
  `cancelHIcon`/`overBookingHIcon`, solo la nota de hipervínculo) dentro
  de la tarjeta, que sigue siendo hotspot con su `data-key` original
  (`capacidadServicioH`/etc., ya sin `hasIconLink` — eso se movió al
  ícono). A diferencia de Drivers/OEE/Tiempos, aquí NO se dividió
  título-vs-valor dentro de la tarjeta (cada una ya mostraba un solo
  número, no varias filas) — solo se separó el ícono.

⚠️ Nota aparte, **no relacionada con este cambio, no se tocó**: el
`data-key="cumplimientoTop"` de la tarjeta "Cumplimiento" (arriba
izquierda de `#partH1`) no tiene entrada correspondiente en
`INDICATORS` — es un bug pre-existente (pasarle el cursor no muestra
ningún popup, `showTooltip()` simplemente no hace nada si `data` es
`undefined`). Pendiente para cuando se pula esa tarjeta específica.

## Popups interactivos
- **Punto del gráfico de línea:** hover muestra "Planta_Corta"... en
  realidad muestra fecha + "● Cumplimiento Servicio  <valor>%" (estilo
  nativo Power BI, igual a `Detallegrafica.png`). Fechas son 6 fechas
  consecutivas inventadas (24–29/08/2026) ya que la referencia solo daba
  el dato exacto del último punto (93,18%).
- **Barra del ranking:** hover muestra "Planta_Corta / %Cumpto" (igual a
  `rankingplantasdetalle.png`); la barra "Bello" además tiene la nota de
  acción (💡 clic para ver muestra ilustrativa / 🔄 clic para volver).
- **Barra del waterfall:** la categoría **"Demoras en obra"** muestra una
  **tabla completa de detalle** (`#tablePopup`, columnas FechaEntrega /
  categoria / NombreObra / VolPartida / comentario) — datos reales
  transcritos de `Detallebarra1%General.png` (30 filas, vista general) y
  `DetalleBarra3%.png` (10 filas, vista Bello). Las demás 17 categorías
  del waterfall solo muestran el popup nativo con el % y nota de
  "pendiente" (no tenemos tablas de detalle para esas).

## Íconos reales (carpeta `Recursos/EurekaRT/`)
`Disp.Planta.png` (grande en "Dispo. Planta (OEE)" de la parte 1, chico
—10 veces— en Dispo. Mixer, Dispo. AS, Operatividad, Rendimiento,
Calidad, Utilización y el título de Tiempos promedio/Causa Perdida),
`capacidad.png`, `VolumenReal.png`, `cancel.png`, `Over.png`. El logo
Eureka y CEMEX Desarrollo (esquina superior derecha) reusan
`Recursos/Logo-Eureka.png` y `Recursos/Desarrollo.png` (los mismos del
Manual 1, no están en la subcarpeta `EurekaRT`).

## Gráfico de línea "Cumplimiento en el tiempo" — ahora funcional (con selección múltiple)
Ya no es decorativo. Los 9 botones bajo la gráfica (`.metric-tab`,
`data-metric="..."`) son seleccionables:
- **Clic simple**: reemplaza la selección — grafica solo ese indicador.
- **Ctrl/⌘ + clic**: agrega (o quita, si ya estaba) ese indicador a la
  selección — permite comparar 2 o más series en la misma gráfica, cada
  una con su color (mismo color que el borde inferior de su botón).
- Estado: `let selectedMetrics = ['cumplimiento']` (array de keys).
  `renderLineChart()` llama a `buildLineChart(currentViewH,
  selectedMetrics)`, que dibuja una `<polyline>` + puntos por cada
  métrica seleccionada, con eje Y **fijo 0–100%** (antes era una escala
  ajustada solo a "Cumplimiento" — se cambió a fija para que las series
  sean comparables entre sí) y una leyenda (`#lcLegend`) con el nombre y
  color de cada una.
- Dataset `LINE_SERIES` (antes `LINE_DATA`, ahora con 9 métricas ×
  vista general/bello): **solo la serie `cumplimiento` viene de una
  captura real** (`Detallegrafica.png`). Las otras 8
  (`capacidad`/`dispoMixer`/`dispoAS`/`rendimiento`/`oeePlanta`/
  `overbooking`/`cancelacion`/`utilizacion`) son **inventadas** —
  rangos de valores parecidos a su indicador real, solo para que la
  comparación visual tenga sentido. Esto queda explícito en el popup
  del gráfico (`INDICATORS.lineChart.nota`) para que no se confunda con
  dato real. `METRIC_META` define el color y la etiqueta larga de cada
  métrica.

## Pendiente
- Tablas de detalle del waterfall para las categorías distintas a
  "Demoras en obra" (no tenemos las imágenes de referencia de esas).
- Confirmar si el filtro Planta/Fecha de la parte 1 debe volverse
  funcional o se queda decorativo (el usuario ya confirmó que por ahora
  se queda decorativo — el popup ya lo explica así).
- Las 8 series inventadas del gráfico de línea (todo excepto
  "Cumplimiento Servicio") son ilustrativas — reemplazar por datos
  reales si el equipo comparte capturas de cada indicador en el tiempo.

---

---

# Cómo se fusionaron los dos tableros en un solo archivo (`Manual_Eureka.html`)

Esta sección documenta la mecánica exacta de la fusión, por si hay que
tocarla de nuevo (agregar un tercer "sub-manual", depurar un choque de
nombres, etc.). El proceso fue: extraer el contenido de
`Manual_EurekaHistorico.html`, aplicarle un conjunto preciso de
renombres, e insertarlo dentro de `Manual_Eureka.html`. Se hizo con
scripts Node de un solo uso (ya borrados del repo tras terminar) — si
hace falta repetir el proceso, esta sección tiene todo lo necesario
para rehacerlo a mano o volver a escribir el script.

## Por qué hacía falta renombrar cosas
Ambos archivos comparten **exactamente el mismo patrón de motor de
tooltips** (`INDICATORS`, `buildTooltipHTML`, `showTooltip`,
`hideTooltip`, `positionTooltip`, `activeEl`, `hasHover`, CSS de
`#tooltip`/`#chartTooltip`/`.hotspot`) — eso se pudo **compartir tal
cual** (una sola copia, la de `Manual_Eureka.html`, sirve para los dos
tableros a la vez, porque `document.querySelectorAll('.hotspot')` ve
el documento completo sin importar qué tablero esté oculto). Pero
otros identificadores con el mismo nombre en ambos archivos representan
**cosas distintas** en cada uno, y sí había que diferenciarlos:

| Identificador (antes) | Por qué chocaba | Solución |
|---|---|---|
| `INDICATORS` (objeto) | Ninguna clave se repite entre los dos — es una unión segura | Se fusionó en un solo objeto (unión literal de ambos) |
| `#tooltip`, `#chartTooltip`, `activeEl`, `hasHover`, `showTooltip`, `hideTooltip`, `positionTooltip`, `buildTooltipHTML` | Motor de tooltip genérico idéntico en ambos archivos | Se dejó **una sola copia** (la de RT); se borró la copia duplicada del script de Histórico |
| `stage` / `boardWrap` / `fitBoard` / `resizeTimer` | Cada tablero tiene su propio ancho de diseño (1650 vs 1700) y su propio elemento a escalar | Los de Histórico se renombraron a `stageH` / `boardWrapH` / `fitBoardH` / `resizeTimerH` (ids HTML `id="stageH"` `id="boardWrapH"` incluidos) |
| `showChartTooltip` / `hideChartTooltip` / `positionChartTooltip` / `chartTooltipEl` | Firmas de función **distintas** entre los dos (RT: `showChartTooltip(bar)` arma el HTML internamente con `buildChartTooltipHTML`; Histórico: `showChartTooltip(el, html)` recibe el HTML ya armado) — no se podían fusionar sin reescribir las llamadas | Los de Histórico se renombraron con sufijo `H`: `showChartTooltipH`, `hideChartTooltipH`, `positionChartTooltipH`, `chartTooltipElH`. **Siguen usando el mismo `<div id="chartTooltip">` físico** (declarado una sola vez, por RT) — no hay conflicto porque solo un tablero está visible a la vez |
| `.board-wrap` (CSS) | RT: `width:1650px`; Histórico: `width:1700px` — **valores realmente distintos**, no se podían compartir | Clase de Histórico renombrada a `.board-wrap-h` (en el CSS y en el HTML del fragmento importado) |
| `.border-blue` (CSS) | RT: `border:2px solid`; Histórico: `border:1.5px solid` — también distintos | Clase de Histórico renombrada a `.border-blue-h` |
| `document.getElementById('btnComenzar')...` (handler de bienvenida) | Cada archivo tenía el suyo, apuntando a su propio `#appContent` | Se **eliminó** la copia de Histórico; el flujo de bienvenida unificado ahora vive solo en el script de RT (ver siguiente sección) |

Todo lo demás que compartía nombre entre los dos `<style>` (`:root`,
`.val-green/red/yellow`, `.hotspot:hover`, `body`, `html`, etc.) es
**contenido idéntico** en ambos archivos — dejarlo duplicado en el CSS
fusionado no rompe nada (una regla CSS repetida con los mismos valores
es inofensiva, solo redundante), así que no se tocó.

## Nuevo flujo de pantallas (reemplaza el `#welcomeScreen`→`#appContent` directo de cada archivo original)
```
#welcomeScreen (InicioManualEureka.png + "Comenzar →")
        ↓ click #btnComenzar
#chooseManualScreen ("¿Qué manual quieres ver?")
        ↓ click #btnChooseRT          ↓ click #btnChooseH
#appContent { #stage visible }    #appContent { #stageH visible }
        ⇄ click #btnEurekaHistoricoNav / #btnEurekaRTNav (navegación cruzada, en cualquier momento)
```
Funciones clave (en el script de RT, al final): `showRT()` y
`showHistorico()` — cada una oculta el `#stage`/`#stageH` contrario,
llama a `hideTooltip()`/`hideChartTooltip[H]()`/`hideTablePopup()` para
no dejar popups huérfanos del tablero que se oculta, actualiza el
`<h1 id="pageHeaderTitle">`/`<span id="pageHeaderBadge">`/`<p
id="pageHeaderSub">` compartido (badge "Tiempo real" vs "Histórico"), y
llama a `fitBoard()`/`fitBoardH()` para recalcular el escalado ahora
que el tablero es visible (mientras está oculto, `offsetWidth` da 0 —
inofensivo, `fitBoardH()` simplemente dejaría el tablero en 0×0 hasta
que se vuelva a llamar al mostrarlo).

## Verificación
Se probó con Playwright (Chromium headless, instalado temporalmente
solo para esta tarea y luego desinstalado) simulando: apertura →
Comenzar → elegir cada manual → hover real sobre varias tarjetas de
cada uno (incluyendo las que el usuario reportó "no funcionan":
Dispo.Mixer, Operatividad, Calidad, AS Rod vs Ingresos, Volumen Real vs
ME, Over-Booking — **todas funcionaron correctamente** en la prueba con
un hover directo; el reporte del usuario probablemente venía de haber
probado la versión anterior a la corrección de contenido de esa misma
conversación) → clic en botón de navegación cruzada en ambos sentidos →
selección múltiple del gráfico de línea con Ctrl+clic. Cero errores de
consola JS en todo el recorrido. Se guardó una copia de seguridad del
`Manual_Eureka.html` previo a la fusión en
`Manual_Eureka_PRE_MERGE_BACKUP.html` (no se borra sola — bórrala
cuando confirmes que ya no la necesitas).

## Ronda final de ajustes visuales en EurekaRT (2026-09-10)
Comparando contra la captura real `Recursos/Eureka1.jpeg`, cuadro por
cuadro:

- **Logo "libre" (sin tarjeta)**: `.logo-card` ya no lleva las clases
  `card border-blue` (solo queda `logo-card hotspot` — sigue siendo
  hotspot, solo que sin el borde/sombra de tarjeta). El popup del logo
  (`logoEureka`) se redujo a **solo el título "Logo Eureka"**, sin
  ninguna sección de explicación — el usuario fue explícito: "no es
  relevante ponerle explicación a un logo".
- **Ícono chico "Disp.Planta" en 9 lugares** (antes un SVG genérico de
  edificio, `#ico-building`, ya **eliminado del archivo** por quedar sin
  uso): Cump. Servicio, Operatividad, Rendimiento, Calidad, AS Rod vs
  Ingresos, Volumen Real vs ME, Over-Booking, Cancel% y la esquina de
  Tiempo Ciclo. Ahora son `<img class="icon-building hotspot"
  data-key="...">` **sin `src` en el HTML** — se llenan una sola vez al
  cargar la página copiando el `src` de un ícono ya existente en la
  parte Histórica (`document.querySelector('.oee-row .icon-sm').src`,
  función autoejecutable `fillIconBuildingSrc()` cerca de
  `updateUltimaAct()`), así no se repite la imagen en base64 9 veces
  más. Cada uno tiene su propio `data-key` (`cumpServicioIcon`,
  `operatividadIcon`, `rendimientoIcon`, `calidadIcon`,
  `asRodIngresosIcon`, `volumenRealMEIcon` [ya existía], `overBookingIcon`
  [ya existía], `cancelPctIcon` [ya existía], `tiempoCicloIcon`) y quedan
  separados del resto de la tarjeta (mismo patrón "hotspot anidado" de
  la ronda anterior — ver "Popups divididos por pieza" más abajo).
- **Texto del popup de ícono, ya sin la palabra "hipervínculo"**: el
  usuario pidió que no le interese a quien lee que técnicamente es un
  hipervínculo — solo que le diga a dónde lleva. Se cambió **en
  `buildTooltipHTML` (afecta a TODOS los `hasIconLink:true`, RT e
  Histórico por igual, un solo lugar)**: de *"Este ícono es un
  hipervínculo: en el tablero real de Power BI lleva a una vista con el
  detalle completo de este indicador."* a *"Te lleva al tablero con más
  información sobre este indicador."*
- **Flechas reales (`FlechaRoja.png`/`FlechaVerde.png`) en vez de los
  glifos ▼/▲ coloreados por CSS**: cambio **solo de CSS**, no se tocó
  el JS ni el generador de datos ilustrativos — las clases
  `arrow-down-green`/`arrow-up-red` (RT) y `tarrow-down`/`tarrow-up`
  (Histórico) que el JS ya venía asignando ahora traen
  `background-image` con la flecha real en vez de solo `color`. El
  texto (▼/▲) se oculta con `color:transparent;font-size:0`.
  **Bug real encontrado y corregido en el camino:** el `<span
  class="delta arrow-down-green">` (el numerito junto a la flecha, ej.
  "-0.14") comparte la misma clase de color que la flecha — al
  principio la regla con `background-image` se aplicó a
  `.arrow-down-green`/`.arrow-up-red` sueltas, así que también le puso
  una imagen de flecha encima al número del delta y lo tapó. Se corrigió
  escribiendo la regla de imagen con **ambas clases combinadas**
  (`.arrow.arrow-down-green`/`.arrow.arrow-up-red`, requiere que el
  elemento tenga también la clase `.arrow` — que solo tiene el span de
  la flecha, no el del delta) y dejando la regla vieja de solo-color
  para el caso genérico (usada por `.delta`). Si se agrega otro elemento
  que comparta esa clase de color por otro motivo, tener este mismo
  riesgo en cuenta.
- **Estándares agregados a las explicaciones de flecha** (antes decían
  genéricamente "compara contra el promedio histórico"): Cargue = tasa
  ideal de cargue (promedio país, sin cambios); Alistamiento = 18 min;
  Hacia obra (solo existe como tramo separado en Histórico) = 30 min; En
  obra = 60 min; Hacia planta (solo Histórico) = 30 min; Tiempo de Ciclo
  = menos de 180 min. En los 4 se explicita: **verde = por debajo del
  estándar (mejor), rojo = por encima (peor)**. Aplicado a
  `cargueValor`/`alistamientoValor`/`enObraValor`/`tiempoCicloValor` (RT)
  y `cargueH`/`alistamientoH`/`haciaObraH`/`enObraH`/`haciaPlantaH`/
  `tcTotalH` (Histórico, donde antes `cargueH`...`haciaPlantaH` no
  tenían campo `flecha` en absoluto).
  > ⚠️ **Posible discrepancia sin resolver**: el usuario escribió "si es
  > flecha roja esta por debajo de lo esperado, y si es verde por
  > encima" — literalmente lo contrario de lo que ya estaba confirmado
  > en una ronda anterior de esta misma sesión (el popup de
  > `cargueValor` ya decía, antes de este cambio, que -0.14 por DEBAJO
  > de la tasa ideal es "mejor" y va con flecha VERDE-abajo) y de lo que
  > muestran los propios archivos de imagen (`FlechaRoja.png` es una
  > flecha roja hacia ARRIBA, `FlechaVerde.png` es una flecha verde
  > hacia ABAJO). Se interpretó como un lapsus al escribir y se implementó
  > **verde=abajo=mejor, rojo=arriba=peor** (consistente con todo lo
  > demás). **Confirmado por el usuario 2026-09-10: sí, verde=abajo=mejor,
  > rojo=arriba=peor es correcto** — no hace falta tocar nada más de esto.
- **Descripción del gráfico de barras**: `cumplimientoServicioChart.accion`
  ahora empieza con *"Pasa el cursor sobre cada barra para ver el
  detalle de su cumplimiento."* antes de la instrucción de clic que ya
  existía.
- **Selección de planta DENTRO de un cluster ya no sale del cluster**:
  antes, clic en cualquier barra (estuviera en `#chartGeneral` o en
  `#chartCluster`) siempre mostraba `#chartGeneral` con esa planta
  resaltada. Ahora `currentView` para este caso usa un tercer formato,
  **`'plant:<Nombre>:<clusterKey>'`** (antes solo existía `'plant:<Nombre>'`,
  que se sigue usando cuando la barra se clickea desde el gráfico
  general de 20). El listener delegado de clic en `.chart-bar` revisa
  `bar.closest('#chartCluster')` para decidir cuál de los 2 formatos
  armar. Piezas nuevas/tocadas: `activeClusterOf(view)` (deriva el
  cluster activo tanto de una vista de cluster plana como de una
  `plant:X:cluster`), `applyView(view)` (ahora extrae el nombre de
  planta con `view.split(':')[1]` en vez de `slice(6)`, para no romperse
  con el tercer segmento), `applyPlantBarHighlight(selectedPlant,
  containerId)` (ahora recibe explícitamente en qué contenedor pintar —
  `renderView` la llama 2 veces, una por `chartGeneral` y otra por
  `chartCluster`, limpiando el que no aplica), `updateRegionTabs(view)`
  (el botón del cluster se pinta **activo/negro** tanto si se
  seleccionó el cluster directamente como si se seleccionó una planta
  DENTRO de él — solo se muestra "informativo, sin pintar" cuando la
  planta se eligió desde el gráfico general de 20), y
  `buildChartTooltipHTML` (el mensaje de "vuelve a hacer clic" ahora
  distingue si te devuelve a "todas las plantas del cluster" o "la
  vista general", según de dónde viene el clic).
- **Popup en la escala de colores** (`.legend-row`, las 4 bolitas
  verde/amarillo/naranja/rojo debajo del gráfico): nuevo hotspot
  `data-key="colorScale"` explicando que la mayoría de indicadores
  siguen esa escala, salvo Cancel%/Over-Booking/tiempos de ciclo que
  tienen su propia regla (ver cada tarjeta).
  > ✅ **Resuelto 2026-09-10** (tras 2 rondas de preguntas): la regla
  > "menor a 100% = rojo" para Cancel%/Over-Booking es **literal** y
  > **solo aplica a Eureka Histórico** — en Eureka RT esos 2 indicadores
  > se dejan exactamente como estaban (siempre verde, sin regla de color
  > nueva). Como el valor de estos 2 casi nunca pasa de 100%, en la
  > práctica van a verse **casi siempre en rojo** en Histórico — el
  > usuario confirmó explícitamente que eso es lo esperado. Implementado
  > solo del lado Histórico: `hv-cancel`/`hv-overbooking` cambiaron de
  > `val-green` a `val-red` (tanto en el HTML inicial como en los 2
  > datasets `HVALUES.general`/`HVALUES.bello`), y se agregó un campo
  > `flecha` a `cancelH`/`overBookingH` explicando la regla ("El color
  > no sigue la escala general del gráfico: se muestra en rojo cuando el
  > valor está por debajo de 100%"). Si en el futuro alguno de los 2
  > llegara a pasar de 100% real, habría que decidir si se agrega lógica
  > dinámica de color — hoy es un valor fijo, no hay generador para estas
  > 2 tarjetas en Histórico (solo existen las vistas 'general'/'bello').

---

# Manual 3 — `Manual_Orion.html` (app "Orion")

## Qué es distinto de los manuales 1 y 2
No es la réplica de un tablero fijo, sino un **recorrido navegable por
pantallas** de una aplicación real (Orion — gestión de tickets de
mantenimiento correctivo para mixers/camiones de concreto). En vez de un
solo `#boardWrap` con vistas que cambian valores, hay **9
`.app-screen`** dentro de un `#frameWrap` (ancho de diseño 1300px, mismo
mecanismo `fitFrame()`/scale-to-fit que `fitBoard()` en los otros
manuales) y una función central `goToScreen(id)` que oculta todas y
muestra la que corresponde:

0. **`#welcomeScreen`** (fuera de `#frameWrap`, splash inicial del
   manual) — imagen `InicioManuaOrion.png` (mismo patrón que
   `InicioManualEureka.png` del Manual 1) + botón "Comenzar →". Al hacer
   clic muestra `#appContent` y arranca en `#screenRole`.
1. `#screenRole` — selección de rol (Usuario General / Programadores),
   pantalla propia diseñada para el manual (no hay imagen de referencia
   de esta pantalla en la app real), con popup explicando cada rol.
   Ahora navega a `#screenNavMode` (antes iba directo a `#screenLogin`).
1.5. **`#screenNavMode`** (nueva) — "¿Cómo quieres explorar Orion?":
   Navegación libre (`#btnNavLibre` → `#screenLogin`, el flujo normal
   sin restricciones) o Navegación guiada (`#btnNavGuiada` →
   `#screenGuidedMenu`). Botón de regreso circular a `#screenRole`.
1.6. **`#screenGuidedMenu`** (nueva) — "Preguntas frecuentes": lista de
   recorridos guiados disponibles. Hoy solo "¿Cómo crear una solicitud?"
   está activo (`#faqCrearSolicitud`, dispara `startTour()`); "¿Cómo
   revisar mis solicitudes?" está deshabilitado a propósito (`.faq-item.disabled`,
   badge "Próximamente") — el usuario pidió dejarlo pendiente. Botón de
   regreso circular a `#screenNavMode`.
2. `#screenLogin` — réplica de `O1.png` (logo CEMEX Desarrollo de
   Operaciones + Orion + Concretodos, botón "Ingresar" funcional, avatar
   con popup "este es tu usuario").
3. `#screenLoading` — réplica de `O2.png`, barra de progreso animada y
   avance automático a los **4 segundos** (`setTimeout` en
   `goToScreen()`) hacia `#screenFeed`.
4. `#screenFeed` — réplica de `O3Feed.png`/`O3Feed2.png`: sidebar
   colapsado/expandido (clase `.expanded`, overlay con backdrop propio
   por pantalla — ver nota de IDs duplicados abajo), botones Ayuda/
   Indicadores (solo explicativos, no navegan), "Envía nueva solicitud" y
   el "Acceder" de la tarjeta "Nueva solicitud" abren el mismo modal
   (`data-open-modal`).
5. `#screenCreate` — réplica de `O5CreacionS.png`: panel izquierdo con
   buscador + lista de placas filtrable (`PLATES` array, datos reales de
   `O6Placas1.png`/`O7Placas2.png`), panel derecho con los 3 radios de
   tipo de solicitud y el formulario que cambia según el tipo
   (`FIELD_SETS`), sección "Información general" que se autocompleta al
   elegir una placa, contador de Observaciones (0/40), y botón Enviar
   que se activa solo cuando hay placa seleccionada (muestra un toast de
   confirmación simulado, no hay backend real). También contiene el
   overlay `#tourComplete` (pantalla de cierre del recorrido guiado, ver
   sección propia más abajo).
6. `#screenMisSolicitudes` — réplica de `O11MisSlobby.png`/`O12Filtrar.png`/
   `O13Flecha.png`: tabla de tickets (`TICKETS`) con filtros combinables,
   panel de filtros deslizante y modal "Información" por fila. Ver
   sección propia más abajo.
7. `#screenMisChats` — réplica de `O14Chat.png`/`O15MisChats.png`: lista
   de chats por ticket + resumen + hilo de conversación simulado. Ver
   sección propia más abajo.

## Modal "¿Qué tipo de mantenimiento deseas solicitar?"
Réplica de `O4NuevaSGeneral.png`/`O4NuevaSDetalle.png`. Las 3 opciones
(mismo texto explicativo reutilizado en los radios de `#screenCreate`):
- **Crítico (Varada):** la mixer queda varada, no puede cargar ni
  transportar concreto — impacta la operación en tiempo real, debe
  atenderse el mismo día.
- **No Crítico:** novedad que no impide seguir operando hoy, se puede
  programar más adelante (pintura, ajustes menores, etc.).
- **Despegue:** hay que despegar concreto ya seco de la olla de la
  mixer (taladro, suele tomar el día completo) — también afecta
  disponibilidad mientras se hace.

## Los 3 formularios de "Detalle de la novedad" (`FIELD_SETS`)
Verificado campo por campo contra `O8Critico1/2.png`, `O9NoCritico1/2.png`,
`O10Despegue1/2.png`:
- **Crítico:** Nombre AS, Teléfono AS, Planta de reporte, Sistema,
  Subsistema, Condición/Falla, Complemento, Sitio de varada, Lleva carga
  → Disponibilidad=Inoperativo, Tipo de novedad=Crítico (Varada).
- **No Crítico:** igual pero sin Sitio de varada ni Lleva carga →
  Disponibilidad=Operativo, Tipo de novedad=No Crítico.
- **Despegue:** solo Nombre AS, Teléfono AS, Planta de reporte →
  Disponibilidad=Inoperativo, Tipo de novedad=Despegue.

Los demás campos (Nombre AS, Sistema, Subsistema, etc.) son selects
decorativos ("Find items", no funcionales) — a propósito, el usuario
pidió explicar por ahora solo "Información general" (autocompletado por
placa) y "Observaciones" (mensaje), el resto queda pendiente de definir.

## Portabilidad — solo 3 imágenes embebidas (no toda la pantalla)
A diferencia de los manuales 1 y 2 (que reconstruyen cada tarjeta a mano
pero también embeben íconos/imágenes reales sueltas), Orion **no
embebe capturas de pantalla completas**: las 5 pantallas están hechas
100% en HTML/CSS/SVG a mano siguiendo las capturas de referencia en
`Recursos/OrionApp/` como guía visual. Las únicas 3 imágenes
incrustadas en base64 son las de marca, reutilizadas varias veces:
`OrionLogo.png`, `Concretodos.png`, `DesarrollodeOP.png` (logo CEMEX
Desarrollo de Operaciones). Por eso el archivo pesa ~720KB en vez de los
~2.3MB de los otros dos. El avatar de usuario ("ER") es un círculo CSS
con iniciales, no una foto recortada (no había un asset de foto de
usuario suelto en `Recursos/OrionApp/`, solo dentro de las capturas
completas O1/O2).

Las imágenes de captura completas (`O1.png` … `O10Despegue2.png`) se
usaron **solo como referencia de diseño** durante la construcción, no
están embebidas en el HTML final — si se necesita rehacer o comparar
contra el original, están en `Recursos/OrionApp/`.

## Nota de implementación: backdrop del sidebar
`#screenFeed`, `#screenCreate`, `#screenMisSolicitudes` y
`#screenMisChats` tienen cada uno su propio sidebar colapsable/
expandible (4 instancias en el DOM a la vez). El backdrop (fondo oscuro
al expandir, clic afuera para cerrar) usa la clase `.sidebar-backdrop`
(no un id fijo) precisamente por eso — usar un id repetido rompería
`getElementById`. Si se agregan más pantallas con sidebar, seguir el
mismo patrón: un `<div class="sidebar-backdrop"></div>` propio dentro de
cada `.app-screen`, `wireSidebar()` ya lo localiza vía
`sb.parentElement.querySelector('.sidebar-backdrop')`.

## Módulo "Mis Solicitudes" / "Mis Chats" (O11–O15)
Dos pantallas nuevas (`#screenMisSolicitudes`, `#screenMisChats`), mismo
patrón de `.app-screen` + sidebar propio (`sidebarMisSol`/`sidebarMisChats`,
con su propio `.sidebar-backdrop`) + `wireSidebar(...)`. Se llega desde
cualquiera de los 4 puntos de entrada ya existentes: sidebar (Home/Create
ya tenían los botones "Mis solicitudes"/"Mis chats", ahora con
`data-go="screenMisSolicitudes"`/`data-go="screenMisChats"`) y las
tarjetas "Acceder" del feed (mismo `data-go`, agregado sobre el hotspot
que ya tenían).

**Dataset `TICKETS`** (dentro del `<script>`, justo antes de `Init`): 21
tickets — 19 son datos reales transcritos campo a campo de
`O11MisSlobby.png`/`O11MisSlobby1.png`/`O11MisSlobby2.png` (ticket, tipo,
placa, planta, planta reporte, fecha, estatus, solicitante, novedad); los
2 primeros (`MV015315`/`MV015314`, tipo `despegue`) son sintéticos —
se agregaron solo porque el tipo "Despegue" no aparecía en las capturas
y hacía falta para poder probar ese filtro, fechados "hoy" (6 sept 2026)
para que aparezcan primero. Si se agregan más filas reales, seguir el
mismo `fechaSort` en formato `'YYYY-MM-DD HH:MM'` (string comparable) —
el orden por defecto de la tabla es simplemente el orden del array (ya
viene de más a menos reciente, igual que en las capturas).

**Tabla (`#screenMisSolicitudes`):**
- `renderTicketsTable()` aplica `filters` (objeto: `planta`, `estatus`,
  `placa`, `ticket`, `tipo`, `nombre`) + `sortRecentState.on` y repinta
  `#ticketsTbody`. Se llama cada vez que cambia cualquier filtro Y cada
  vez que se entra a la pantalla (`goToScreen('screenMisSolicitudes')`).
- **Filtros realmente funcionales** (combinables entre sí, AND lógico):
  Planta, Estatus y Tipo Novedad (selects poblados desde `TICKETS` por
  `populateFilterSelects()`), Placa/Ticket/Nombre (texto, `includes()`).
  El buscador "Buscar placa" de la barra superior y el campo "Placa" del
  panel de filtros están sincronizados (comparten `filters.placa`, cada
  input actualiza el otro).
- **Año & Mes y Fecha (Desde/Hasta) son decorativos a propósito** —
  mismo criterio que los campos "Find items" del formulario de creación:
  no se fabrica lógica de fechas sin que el equipo confirme qué rango/
  agrupación esperan.
- "Filtrar por comentario reciente" (`#btnSortRecent`) alterna
  `sortRecentState.on` y reordena por `fechaSort` desc — como el dataset
  ya viene ordenado así por defecto, el efecto visible es sutil; lo
  importante es que demuestra la acción (botón queda "activo" en verde).
- "Centro" es 100% decorativo (hotspot explicando Centro vs Externas, ver
  `roleProgramador` en la pantalla de selección de rol).
- El panel de filtros (`#filterPanel`) es **deslizante de verdad**: usa
  `flex-basis`/`width` animados con `transition` (clase `.open`), no un
  overlay que tape la tabla — la tabla se angosta, igual que en
  `O12Filtrar.png`. Cada campo tiene su botón "Limpiar" (`data-clear`,
  solo en los campos funcionales) y arriba hay "Limpiar todo"
  (`#btnClearAllFilters`) que resetea `filters` completo.
- Cada fila tiene 2 botones (`.icon-round-btn`): el de chat (navy) fija
  `currentChatTicket` + `chatReturnScreen='screenMisSolicitudes'` y
  navega a `#screenMisChats`; el de flecha (azul) abre `#infoModalOverlay`
  ("Información", réplica de `O13Flecha.png`) vía `openInfoModal(ticket)`.

**Modal "Información" (`#infoModalOverlay`):** vive dentro de
`#screenMisSolicitudes` (mismo patrón que `#modalOverlay` dentro de
`#screenFeed` — un overlay por pantalla, no uno global). Columna
izquierda (Información general + Novedad) y derecha (Gestor Ticket).
**Solo el ticket `MV015313` tiene todos los datos reales** (id, CR,
mtto preventivo, subsistema, condición, detalle) porque es el único con
captura de referencia (`O13Flecha.png`) — el resto de tickets muestra
"—" en esos campos en vez de inventar datos (mismo criterio que el resto
del proyecto: no fabricar información no confirmada). El panel "Gestor
Ticket" queda siempre vacío ("—") para todos, porque la única captura de
referencia que tenemos lo muestra así (ticket sin asignar todavía).

**`#screenMisChats` (O14/O15):** columna izquierda con buscador de
ticket + lista de tarjetas (`renderChatList()`, reutiliza el mismo
`TICKETS`), columna central con el resumen del ticket seleccionado
(`selectChatTicket()`, mismas 3 tarjetas Información general/Novedad/
Datos adjuntos que se ven en las capturas), columna derecha con una caja
gris (placeholder de imagen/adjunto, igual a las capturas) + hilo de
chat + textarea. El envío de mensajes **sí es interactivo** (se guarda
en memoria en `CHAT_MESSAGES[ticket]`, no persiste al recargar ni va a
ningún backend — es la única pieza de "funcionalidad mínima" real de
este submódulo, a propósito, para que se entienda el flujo de
conversación). Botón "←" (`#btnChatBack`) vuelve a `chatReturnScreen`
— se fija a `'screenMisSolicitudes'` cuando se entra desde el botón de
chat de una fila, o a la pantalla activa en ese momento cuando se entra
por el sidebar/tarjeta del feed (lógica en el listener genérico de
`[data-go]`).

**Logos reutilizados sin duplicar base64:** los `<img>` nuevos (ícono
Orion redondo del `sb-head`, logo CEMEX Desarrollo del `topbar`) se
insertan **sin `src`** en el HTML; al final del script se copia el
`.src` de una instancia ya existente (`#sidebarFeed .sb-head img`, `.topbar
img.tb-logo[src]`) a todas las que no tienen `src` — evita re-incrustar
~80KB/~15KB de base64 cada vez que se agrega una pantalla nueva con
sidebar/topbar.

## Navegación libre vs. guiada + motor de recorrido guiado (tour)
Después de elegir el rol, el usuario elige el **modo de navegación**
(`#screenNavMode`): "Navegación libre" es exactamente el flujo que ya
existía (acceso sin restricciones a toda la app); "Navegación guiada"
lleva a `#screenGuidedMenu` (preguntas frecuentes), cada una arranca un
recorrido paso a paso construido sobre la app real — **no es una copia
aparte de las pantallas, es la misma app** con una capa de guía encima.

**Motor** (`TOUR_STEPS`, `tourState`, cerca del final del `<script>`,
justo antes del bloque `/* Init */`):
- `TOUR_STEPS` es un array de pasos `{ target, text, advanceOn, mode }`.
  `target` es un selector CSS (o `null` para un paso sin elemento
  específico, como "espera a que cargue"). `mode` controla qué muestra
  la burbuja: `'click'` → hint "👆 Haz clic donde se indica" (el paso
  avanza solo cuando ocurre la acción real); `'manual'` → botón
  "Siguiente →" (para pasos que no tienen un único clic obligatorio,
  como "confirma el tipo" o "llena Observaciones").
- **El recorrido "¿Cómo crear una solicitud?" tiene 8 pasos**: Ingresar
  → esperar carga → Acceder/Envía nueva solicitud → elegir tipo de
  mantenimiento → buscar y seleccionar placa → confirmar tipo (manual)
  → escribir Observaciones (auto-avanza en cuanto se escribe algo,
  `tourNotify('obsFilled')` en el listener de `input` de `#obsBox`) →
  Enviar. Al terminar se muestra `#tourComplete` (overlay dentro de
  `#screenCreate`, con "🎉 ¡Listo!" y botón "Finalizar recorrido" que
  regresa a `#screenGuidedMenu`).
- **Cómo se conecta con el código existente:** no hay una copia paralela
  de la lógica de la app — se agregó una llamada a `tourNotify('<evento>')`
  dentro de los handlers que YA existían (`btnIngresar` → `ingresarClicked`,
  `goToScreen()` cuando `id==='screenFeed'` → `feedShown`, el forEach de
  `[data-open-modal]` → `modalOpened`, el forEach de `[data-choose]` →
  `typeChosen`, `selectPlate()` → `plateSelected`, el input de `#obsBox`
  → `obsFilled`, el click de `#btnEnviar` → `enviarClicked`).
  `tourNotify(eventName)` solo actúa si `tourState.active` es true y el
  paso actual espera exactamente ese evento — si el usuario no está en
  modo guiado, estas llamadas son no-ops. Esto significa que **cualquier
  cambio futuro a esos flujos** (agregar un paso al formulario, cambiar
  cómo se abre el modal, etc.) hay que revisar si también hay que mover
  o agregar el `tourNotify(...)` correspondiente para que el recorrido
  guiado no se quede "colgado" esperando un evento que ya no ocurre.
- **Resaltado visual:** clase `.tour-highlight` (borde ámbar pulsante,
  `outline` + `box-shadow` animado) se agrega/quita del elemento
  objetivo en cada paso. `#tourBubble` es la burbuja de instrucción
  (`position:fixed`, reposicionada con `positionTourBubble()` — misma
  lógica que `positionTooltip()` de arriba/abajo según espacio
  disponible). **Bug real encontrado y corregido durante las pruebas:**
  la burbuja, al posicionarse debajo de un campo con contenido
  scrolleable justo debajo (ej. `#plateSearch` con la lista de placas
  pegada abajo), quedaba **encima** de las tarjetas de placa y
  bloqueaba el clic (`pointer-events` por defecto intercepta el click
  aunque visualmente parezca que se puede hacer clic "a través" del
  texto). Solución: `#tourBubble{pointer-events:none;}` +
  `#tourBubble .tour-actions{pointer-events:auto;}` — el texto/fondo de
  la burbuja deja pasar el clic hacia lo que está debajo, pero los
  botones "Salir"/"Siguiente" siguen siendo clickeables. Si se agregan
  más pasos, tener en cuenta este mismo riesgo si la burbuja puede
  quedar sobre contenido interactivo.
- **`tourReposition()`** se llama al final de `goToScreen()` (si
  `tourState.active`) para que la burbuja/resaltado se recalculen en
  cada cambio de pantalla — importante porque varios pasos ocurren en
  pantallas distintas (login → loading → feed → create) sin que el
  usuario "salga" del tour.
- **Salir del recorrido** (`#tourExitBtn`, visible en todas las
  burbujas) llama a `exitTour()`: quita el resaltado, oculta la
  burbuja, y navega a `#screenGuidedMenu` — **no bloquea nada más**: el
  usuario puede navegar libremente en cualquier momento del recorrido
  (sidebar, otras pantallas, etc.); si se aleja del flujo esperado, la
  burbuja simplemente se queda mostrando el paso actual sobre lo que
  encuentre (o centrada, si el `target` de ese paso no existe en la
  pantalla donde está parado) — es una guía visual, no un bloqueo duro.
- Probado end-to-end con Playwright (Chromium headless): los 8 pasos,
  el auto-avance de la pantalla de carga y de Observaciones, el botón
  "Siguiente" manual, el resaltado correcto en cada paso, y la vuelta a
  navegación libre después de salir del tour — todo sin errores de
  consola.

## Pendiente
- Confirmar/enriquecer las explicaciones de los campos "decorativos" del
  formulario (Sistema, Subsistema, Condición/Falla, Complemento, Sitio
  de varada, Lleva carga, Planta de reporte, Nombre AS) cuando el equipo
  las defina — hoy están sin popup a propósito.
- Año & Mes y Fecha (Desde/Hasta) del panel de filtros de "Mis
  Solicitudes" son decorativos — falta definir con el equipo qué rango/
  agrupación esperan antes de conectarlos a `filters`.
- El panel "Gestor Ticket" del modal "Información" y la mayoría de
  campos de detalle (Id, CR, mtto preventivo, subsistema, condición,
  detalle) solo están confirmados para el ticket `MV015313` — al resto
  les falta una captura de referencia para poder completarlos sin
  inventar datos.
- El botón "Indicadores" y "Ayuda" son solo explicativos (no hay enlace
  real al Power BI ni al manual todavía).
- **Recorrido guiado "¿Cómo revisar mis solicitudes?"** — pedido
  explícitamente por el usuario, pero dejado pendiente a propósito por
  ahora ("este dejalo pendiente por ahora, vamonos con esa" [la de
  crear solicitud]). El ítem ya existe en `#screenGuidedMenu` como
  `.faq-item.disabled` con badge "Próximamente" — cuando se defina el
  recorrido, agregar sus `TOUR_STEPS` (puede ser un array nuevo,
  p. ej. `TOUR_REVISAR_SOLICITUDES`, y una función `startTour(steps)`
  parametrizada en vez de usar siempre `TOUR_STEPS` fija) y cambiar ese
  `<div class="faq-item disabled">` por un `<button class="faq-item">`
  igual que `#faqCrearSolicitud`.

---

---

# Manual 4 — `Manual_OrionTablero.html` (tablero de Power BI "Orion")

> ⚠️ **Legacy/standalone desde 2026-09-11** — igual que pasó con
> `Manual_EurekaHistorico.html` en el Manual 2, todo el contenido de
> este archivo (CSS, HTML y JS) ya está **absorbido dentro de
> `Manual_Orion.html`**, como `#stageT` (ver la sección "Fusión de
> `Manual_Orion.html` + `Manual_OrionTablero.html` en un solo manual"
> más abajo). Este archivo se conserva de referencia pero **ya no es
> la fuente de verdad** — cualquier corrección de aquí en adelante va
> directo en `Manual_Orion.html`. Candidato a borrar cuando el usuario
> confirme que ya no lo necesita.

## Qué es esto
Réplica del tablero de indicadores de Power BI que se alimenta de la app
Orion (no confundir con el tablero "Eureka" de los Manuales 1/2 — es un
tablero distinto, propio de mantenimiento automotriz/talleres). Igual que
el Manual 3, está **hecho 100% a mano en HTML/CSS/JS** siguiendo las
capturas de `Recursos/OrionTablero/` como guía visual — no se embeben
capturas completas, solo el logo de marca
(`LogoOrionTablero.png`, incrustado una vez en base64 dentro de la
imagen del splash/bienvenida y reutilizado en el resto de pantallas
copiando su `.src` por JS — mismo truco que usa `Manual_Orion.html` con
sus logos, ver más abajo).

## Estructura de navegación (2 niveles: "hub" → "hoja")
8 `.tablero-screen` dentro de `#boardWrap` (ancho de diseño 1650px,
mismo mecanismo `fitBoard()`/scale-to-fit que los Manuales 1 y 2). Cada
pantalla tiene su propia fila de filtros decorativos (`.filter-chip`,
todos en "Todas" excepto donde la captura mostraba un valor real
seleccionado) y, si no es la pantalla de inicio, una flechita circular
de regreso (`.back-arrow-btn`) a la izquierda de los filtros.

- **`#tabResumen`** ("Resumen solicitudes") es la **pantalla de
  inicio** — no tiene flecha de regreso. Su fila de menú
  (`#menuResumen`, dataset `MENU_MAIN`) tiene 4 botones: Resumen
  solicitudes (activo), Status – Taller, Disponibilidad operacion,
  Disponibilidad - Actual por horas.
- **Dos de esos botones son "hub"**: `#tabStatusTaller` y
  `#tabDispOperacion`. Cada uno tiene su **propia** fila de menú (5 y 4
  botones respectivamente — datasets `MENU_STATUS_TALLER` /
  `MENU_DISP_OPERACION`) con su flecha de regreso apuntando siempre a
  `tabResumen` (`data-back="tabResumen"`, fijo).
- Los botones de esas filas que no son "Resumen solicitudes" ni el
  propio hub llevan a **pantallas "hoja"** (`#tabIngresosProg`,
  `#tabHistoricoDisp`, `#tabCompPlacas` desde Status-Taller;
  `#tabHistoricoTickets` y `#tabCompPlacas` desde Disponibilidad
  operación — **`tabCompPlacas` es compartida por los dos hubs**). Las
  hojas **no tienen fila de menú**, solo filtros + flecha de regreso
  con `data-back="dynamic"`: la variable `dashReturnScreen` se fija al
  hub actual justo antes de navegar (en el listener delegado de
  `.menu-btn[data-go]`, ver `LEAF_SCREENS`), así la flecha vuelve al
  hub correcto sin importar desde cuál de los dos se haya entrado a
  Comportamiento-placas.
- **`#tabDispHoras`** ("Disponibilidad - Actual por horas") es un
  **stub pendiente** a propósito (`.pending-stub`) — el usuario pidió
  dejarlo así porque todavía no hay capturas de esa sección.

La navegación real es un solo listener delegado en `document` (busca
`.menu-btn[data-go]` y `.back-arrow-btn[data-back]` por `closest()`),
no un listener por botón — importante porque los menús se generan
dinámicamente por JS (`renderMenuRow`), así que no hace falta re-atar
listeners cada vez que se re-renderiza un menú.

## "Control deslizante" = scroll interno, no swipe/carrusel
Igual que en `Manual_EurekaHistorico.html`, lo que el usuario describe
como "control deslizante" (ej. `OT1.png`+`OT2.png`, o cada par
`XxxYyy1.png`/`XxxYyy2.png`) es **una sola pantalla de Power BI más alta
que el viewport**, con su propia barra de scroll interna delgada
(`.dash-scroll{max-height:700px;overflow-y:auto;}`). No son dos
"páginas" que se cambian con un botón — todo el contenido de la parte 1
y la parte 2 está apilado verticalmente dentro del mismo
`.dash-scroll` y solo hace falta desplazarse. El gráfico "Novedades por
Planta en gestión" (`#panelNovedadesPlanta`) tiene además su **propio
scroll interno anidado** (`.hstack-scroll`) porque en el original ese
widget específico se desplaza independiente del resto de la página
(confirmado comparando `Novedades1.png` vs `Novedades2.png` — mismo
gráfico, mismo eje, solo cambian las plantas visibles).

## Datos: qué es transcripción exacta y qué es aproximado
Todo el texto/valores de este manual viene de `Recursos/OrionTablero/`.
Se transcribió **exacto** todo lo que se leía con claridad en las
capturas (KPIs de `#tabResumen`, la tabla `Detalle Novedades`, el
gráfico `Novedades por Planta en gestión` — los 22 planteles con sus 3
segmentos, `Placas con mayor cantidad de...` de Comportamiento-placas,
los 4 KPI de Histórico-Tickets, etc.). Donde el original mostraba
**números muy pequeños dentro de segmentos diminutos de una barra
apilada** (difíciles de leer con certeza en una captura de pantalla) se
optó por **no inventar** un valor exacto y en su lugar:
- Repartir el remanente (total confirmado − segmentos legibles) en la
  categoría "Despegue" del gráfico `Novedades por Planta en gestión`
  (dato real: el total de cada planta SÍ es exacto, solo el reparto
  interno de 1-2 categorías chiquitas es una inferencia razonable, no
  un dato inventado de la nada).
- Usar proporciones aproximadas y decirlo en el tooltip/CONTEXTO donde
  no había forma de leerlo (`Ingresos por Planta` e `Ingresos vs Flota`
  de Ingresos-Programación, `Programación Plantas` de esa misma
  pantalla, y el gráfico `Programación de la semana` de Status-Taller,
  que además se simplificó de ~24 puntos diarios por tipo de novedad a
  una serie única de ~12 fechas representativas).
- Reducir tablas muy largas a una **muestra representativa** de filas
  (las que sí se leían bien en la captura) en vez de fabricar filas
  adicionales — ej. `Detalle Novedades` (23 filas reales),
  `panelStatusDetalle` (10 de las ~13 visibles), `panelOperSistema`/
  `panelOperEstado` (12 de las visibles), `panelCompDetalle` (14 filas
  del árbol PlantaUnica → Placa → Ticket, aplanado con sangría por
  espacios en vez de un árbol colapsable de verdad).
- El donut `Detalle Placas`: los 4 valores grandes (Cerrado 52,14%,
  Cierre Técnico 36,84%, Rechazado 5,04%, Backlog 0,83%) son exactos;
  las 6 categorías restantes de la leyenda (En Espera, En Programación,
  En Entrada, Abierto, En Salida, En blanco) suman ~5,15% pero no se
  distinguían individualmente en la captura, así que se agrupan en un
  solo arco "Otros" — la leyenda sigue mostrando las 6 por separado
  (fiel al original) pero sin porcentaje individual inventado.

## Componentes reutilizables (JS)
Para no repetir HTML a mano en cada uno de los ~25 paneles, hay
funciones genéricas (todas cerca de `/* Generic reusable renderers */`
en el `<script>`):
- `renderSimpleTable(containerId, title, tipText, headers, rows, maxHeight)`
  — cualquier tabla con scroll propio.
- `renderRankingBars(containerId, title, tipText, rows, color)` — barras
  horizontales tipo ranking (Comportamiento-placas, Histórico-Tickets).
- `renderPctStackChart(containerId, title, tipText, legendTitle, legendItems, rows, nameWidth)`
  — barras 100%-apiladas (Disponibilidad por Planta, Ejecución PM, etc.).
- `renderAbsBarChart(containerId, title, tipText, rows, color1, color2)`
  — barras apiladas de valor absoluto (no %), usado en "Status por
  Taller" (En Entrada/En Salida).
- `statCardHtml(label, value, bg, big)` — tarjeta de número grande
  suelta (Disponibilidad operación, Histórico-Tickets).
- `truckCategoryHtml(label, pct, count, color, tipText)` — las tarjetas
  con silueta de mixer (Operativas/En Taller/Varadas...); el ícono es
  un SVG genérico de mixer (`TRUCK_SVG`), no una foto — no había un
  asset suelto de las ilustraciones de camión a color en
  `Recursos/OrionTablero/`, solo dentro de las capturas completas.

## Logo reutilizado sin duplicar base64
Mismo patrón que `Manual_Orion.html`: el único `<img>` con `src`
inline (base64 de `LogoOrionTablero.png`) es el de la pantalla de
bienvenida y el de `#tabResumen` (clase compartida `.dash-logo-img`).
Todas las demás pantallas tienen `<img class="dash-logo-img" alt="Orion">`
**sin** `src`, y al final del script se copia `.src` del primero a
todos los que no lo tengan (`document.querySelector('.dash-logo-img[src]').src`).

## Pendiente
- **`Disponibilidad - Actual por horas`** — sección completa pendiente,
  el usuario no ha compartido capturas todavía. Es el único botón
  marcado `pending:true` en `MENU_MAIN` (estilo atenuado, clase
  `.menu-btn.pending`) y lleva a un stub (`.pending-stub`) con el aviso.
- Los filtros (`.filter-chip`) de las 8 pantallas son decorativos (fijan
  "Todas" y muestran un tooltip genérico) — falta que el equipo defina
  cuáles deben ser realmente funcionales y cómo deben combinarse.
- Todos los `data-tip-text` de este manual son **explicaciones
  genéricas/placeholder** a propósito — el usuario pidió primero dejar
  la réplica visual y la infraestructura de popups lista (`.hotspot` en
  cada tarjeta/gráfico/botón), y va a indicar después, sección por
  sección, qué debe decir cada explicación en detalle.
- Datos aproximados a refinar si llegan capturas más nítidas o el
  equipo confirma los valores exactos: ver la lista completa en
  "Datos: qué es transcripción exacta y qué es aproximado" arriba.
- El gráfico de línea "% Operativos histórico" (superpuesto en
  `Recuento Placa y Operativos histórico por Hora`, Histórico
  disponibilidad) y la línea "Prom reportes" (superpuesta en
  `Ingresos vs Flota`, Ingresos-Programación) no se reconstruyeron —
  ambos paneles hoy solo muestran las barras. Si se quiere el gráfico
  combinado completo, se puede reusar la técnica de `buildLineChart()`
  de `Manual_EurekaHistorico.html` (SVG generado por JS).

---

## Decisiones de diseño compartidas (por si hay que tocar esto después)
- **Responsive = "zoom", no reflow.** Ancho de diseño fijo por archivo
  (1650px Manual 1, 1700px Manual 2, 1300px Manual 3). `fitBoard()`
  (`fitFrame()` en el Manual 3) mide el ancho disponible y aplica
  `transform:scale()` sobre `#boardWrap`/`#frameWrap` dentro de
  `#stage`. Igual en cualquier pantalla, solo más chico.
- **Popups: hover vs. tap según el dispositivo** —
  `matchMedia('(hover: hover) and (pointer: fine)')`. Con mouse real:
  `mouseenter`/`mouseleave` + `focus`/`blur`. Sin mouse (táctil): solo
  `click` para abrir/cerrar. No mezclar `focus`/`mouseenter` con `click`
  en el mismo elemento (bug ya conocido, causa apertura-y-cierre
  inmediato en táctil).
- **Elemento con popup propio anidado dentro de otro con popup genérico**
  (ej. una barra dentro de una tarjeta con hotspot, o el switch dentro de
  `.toggle-box`): el hijo debe llamar `hideTooltip()` (o el equivalente)
  al mostrar su propio popup, porque el `mouseenter` del padre sí se
  dispara igual al entrar al hijo (bug real, ya corregido en varios
  lugares — buscar `hideTooltip();` al inicio de las funciones
  `showChartTooltip`/`showOverBookingPopup`/`showTablePopup`).

## Rediseño completo de Eureka Histórico (2026-09-11)
El usuario compartió capturas nuevas del tablero real de Power BI en
`Recursos/EurekaHistoricoNuevo/` (`Fila1.png`...`Fila5.png` + varios
`DetalleFilaX.png`/`ConvencionesCol.png`/íconos sueltos), fila por fila,
porque el tablero real había cambiado bastante respecto a la versión
anterior del manual. Se reconstruyó `#partH1`/`#partH2`/`#partH3` casi
por completo (HTML+CSS+JS) para igualar estas capturas — cambios clave:

- **Encabezado (Fila1)**: el logo combinado CEMEX+Desarrollo+Eureka
  (`Logoesquina.png`) ahora va **una sola imagen a la izquierda** (antes
  eran 2 imágenes sueltas a la derecha) — nueva clase `.h1-header-row`.
  Se agregó el link **"Manual de Uso"** (nuevo en el tablero real, no
  existía antes) junto a "Eureka DELFOS"/"Eureka RT", estilizados como
  texto azul plano (`.nav-link-h`), no como botones con borde — ⚠️ el
  texto de su popup ("abre el manual de usuario de este tablero") es una
  suposición razonable, confirmar con el usuario si el botón real hace
  otra cosa.
- **Fila de KPIs, ahora 6 en una sola fila (antes 5)**: "Cumplimiento"
  (antes una tarjeta separada aparte, `cump-top-card`, arriba a la
  izquierda) se movió **dentro** de `.h1-kpi-row` como la primera de las
  6, con el mismo patrón icono+valor que sus hermanas (ícono
  `Cumplimiento.png`, `data-key="cumpTopIconH"` con `hasIconLink`) — es
  una suposición que este ícono sea hipervínculo igual que las otras 5
  (el usuario no lo aclaró explícitamente, solo dio el archivo de
  ícono). Los datos de `HVALUES.general` se reescribieron por completo
  con los números exactos de `Fila1.png`/`Fila3.png` (antes eran de una
  captura vieja).
- **`TC` (Tiempo de Ciclo) ahora tiene flecha de variación** (antes solo
  mostraba el valor, sin comparación) — se agregó `.tc-caption`
  ("Tiempo de ciclo") + `.tc-delta-row` (`hv-tcArrow`/`hv-tcDelta`) igual
  que los otros 5 tramos, según `Fila3.png`.
- **Gráfico de línea "Cumplimiento en el tiempo" (Fila2): ahora cubre
  del 2 de enero de 2026 al día anterior a hoy** (~252 días, antes solo
  6 fechas fijas de agosto 2026) — con esa densidad ya no cabían
  `<circle>` de hover por punto, se cambió a un **crosshair estilo
  Power BI**: una franja `<rect>` transparente sobre toda la gráfica
  sigue el mouse (`getScreenCTM().inverse()` para convertir pixel→coord
  SVG), calcula la fecha más cercana y dibuja una línea vertical + un
  punto por cada serie seleccionada en esa fecha exacta. Los 9
  indicadores de los botones también cambiaron (antes
  Cumplimiento/Capacidad/Dispo.Mixer/Dispo.AS/**Operatividad**/OEE
  Planta/Overbooking/Cancelación/**Utilización** — ahora los últimos 2
  son **Cumplimiento ME** y **Disponibilidad Bombeo**, dos métricas
  nuevas que no existían antes en esta gráfica). ⚠️ Como no es posible
  transcribir a mano ~250 valores diarios × 9 series desde una captura
  de pantalla, las 9 series se generan con una fórmula determinística
  (`genDailySeriesH`, mismo patrón de semilla que `buildIllustrativeKPI`
  en la parte RT) — son ilustrativas, no datos reales (igual que ya
  advertía `INDICATORS.lineChart.nota` antes, solo que ahora aplica a
  las 9 series y no solo a 8 de 9).
- **Ranking de plantas (Fila4, 1ra gráfica): ahora funcional para las 23
  plantas** (antes decorativo, solo pintaba colores). Mismo patrón que
  el filtro por planta de Eureka RT (ver más arriba en este archivo):
  clic en cualquier barra llama a `selectPlantH(nombre)`, que aplica un
  dataset ilustrativo generado por `buildIllustrativeHVALUES(basePct,
  seed)` (puerto directo de `buildIllustrativeKPI` de la parte RT,
  adaptado a los ids `hv-*` de Histórico) a las tarjetas de KPI/Drivers/
  OEE/Tiempos, y resalta la barra (fading en las demás, mismo criterio
  `faded-green/gold/orange`). **Decisión de alcance**: seleccionar una
  planta **no** cambia el gráfico de línea (Fila2) ni el waterfall
  (Fila5) — esos se quedan con su dato agregado general siempre. El
  usuario no pidió explícitamente que esos 2 también cambiaran por
  planta; si sí lo quiere, avisar para extenderlo (implicaría generar
  ~250 días × 9 métricas × 23 plantas, o un waterfall distinto por
  planta). Los nombres de planta truncados con "..." (`CO - CX...`,
  `Patio Tal...`, `Tierra B...`, `Centena...`, `Puente ...`) se dejaron
  **tal cual se ven en la captura real** (Power BI los corta por falta
  de espacio en el eje) — no se inventaron nombres completos.
  ⚠️ **Bug real encontrado y corregido con Playwright en modo táctil**:
  `selectPlantH()` llamaba `hideChartTooltipH()` sin condición, y como
  el mismo `click` en la barra ya había hecho `showChartTooltipH()` un
  instante antes (listener aparte, ver `buildRankingChart`), el popup se
  abría y se cerraba en el mismo toque — se quitó ese
  `hideChartTooltipH()` de `selectPlantH`.
- **2da gráfica de Fila4, "Evolución de la media diaria": es nueva, no
  existía en el diseño anterior.** Combo semanal (área+línea escalonada
  de `Media_Diaria` en el eje izquierdo "X mil", línea de `%Cumpto` en
  el eje derecho, ~37 semanas del mismo rango 2/ene–10/sep), con el
  mismo mecanismo de crosshair que la gráfica de línea de Fila2. Datos
  también ilustrativos (`genWeeklySeriesH`) — no hay forma de leer los
  valores exactos semana a semana desde `DetalleFila4.2.png`.
- **Waterfall "Causa Perdida Cumplimiento" (Fila5): ampliado de 18/10
  categorías a 36 categorías fijas** (un solo dataset ahora,
  `WATERFALL_DATA` — ya no hay versión "general" vs "bello", ver más
  abajo). ⚠️ Los nombres de las ~29 categorías con 0% se transcribieron
  a ojo desde `Fila5.png` a esa densidad (36 barras en ~1650px, texto
  rotado muy pequeño) — **hay riesgo real de error de transcripción**,
  y algunos nombres parecen duplicados/con typo *del propio dato real*
  (ej. "Demoras en obra" vs "Demora en obra", "Pedido Bloqueado" vs
  "Pedido Bloquedado", "Sobreprogramacion" vs "Sobreprogrmacion") — se
  dejaron ambos tal cual se leyeron, asumiendo que son categorías
  distintas en el sistema origen (no un solo error de transcripción de
  este manual). Revisar contra el tablero real si es posible.
  **Nueva interacción**: hacer clic en una barra ahora **resalta esa
  categoría y atenúa las demás** (`toggleWfSelection`, clases
  `.wf-selected`/`.wf-faded`) — antes no existía ningún resaltado, solo
  el popup. A diferencia del ranking de plantas de arriba, esto es
  **puramente local**: no cambia ninguna otra tarjeta del tablero
  (pedido explícito del usuario). La categoría "Demoras en obra"
  aparece 2 veces en el dataset — solo la **primera** conserva la tabla
  de detalle real (`TABLE_DEMORAS_GENERAL`, sin cambios); la segunda se
  trata como cualquier categoría de la cola larga (popup simple).
- **Convenciones de color**: se agregó el nivel rojo (`<70%`) a
  `rankColor`/`rankFaded` por completitud con `ConvencionesCol.png`,
  aunque ninguna de las 23 plantas actuales lo necesita (todas están
  entre 81%-95%).
- Se verificó con Playwright (Chromium headless + emulación iPhone 13
  para el modo táctil) todo el recorrido nuevo: header, las 6 tarjetas,
  gráfico de línea con hover y Ctrl+clic multi-serie, filtro por planta
  (clic normal y táctil, con toggle de ida y vuelta), gráfica de media
  diaria con hover, y selección de barra del waterfall — cero errores
  de consola. También se confirmó que la parte Eureka RT y la
  navegación cruzada entre ambos tableros siguen funcionando igual
  (no se tocó nada de esa parte).

## Recorrido guiado estricto + campos funcionales + fusión con el tablero (2026-09-11)
Sesión grande sobre Orion, 4 pedidos del usuario resueltos en orden
(primero se corrigió todo en los 2 archivos por separado, se fusionaron
al final — más fácil de probar cada pieza aislada antes de combinar).

### 1) Recorrido guiado "¿Cómo crear una solicitud?" — ahora estricto + 12 campos nuevos
- **Bloqueo real de clics fuera de lo indicado** (pedido explícito: "que
  solo funcione lo que se le indique... no me pueda salir del recorrido
  sin querer"). Se agregó un listener de `click` en **fase de captura**
  sobre `document` (mismo patrón que el bug de `.chart-card`/`.hotspot`
  documentado en Eureka) que revisa si el clic cayó dentro de alguno de
  los elementos resaltados del paso actual (`tourState.currentTargets`,
  ahora un **array**, no un solo elemento — ver por qué abajo) o dentro
  de la propia burbuja (`#tourBubble`, para que "Salir"/"Siguiente"
  sigan funcionando) — si no, `stopPropagation()` + `preventDefault()`
  bloquean el clic antes de que llegue al botón/enlace real, y la
  burbuja hace un pequeño *shake* (clase `.tour-shake`) como feedback de
  "no es ahí".
  - `tourState.currentTargets` es un **array** (antes un solo
    `currentTarget`) porque algunos pasos tienen **más de un elemento
    válido** — ej. el paso de abrir el modal de nueva solicitud acepta
    tanto el botón "Acceder" de la tarjeta como "Envía nueva solicitud"
    de arriba (`target: '.feed-card .btn-acceder[data-open-modal],
    #btnNuevaSolicitud'`, selector CSS con coma — `querySelectorAll` lo
    resuelve solo). `tourPositionForCurrentStep()` ahora resalta **todos**
    los elementos que matchean el selector del paso, no solo el primero.
  - El paso "confirma el tipo de solicitud" (`#createTypeRow`) ahora
    tiene un `onLeave()` que **fuerza `selectedType='critico'`** al
    avanzar, sin importar qué haya tocado el usuario en ese paso — así
    los pasos siguientes (que asumen los 9 campos del formulario
    Crítico) nunca se quedan esperando un campo que no existe si el
    usuario eligió "No Crítico"/"Despegue" por curiosidad.
- **9 campos de "Detalle de la novedad" ahora son de verdad
  funcionales** (antes todos —salvo Teléfono AS— eran `<div
  class="fake-select">Find items</div>` decorativos). Verificado campo
  por campo contra `Sistema.png`/`Subsistema.png`/`Condicion.png`/
  `Complemento.png`/`Sitio.png`/`LLevaCarga.png` (`Recursos/OrionApp/`):
  - **Nombre AS** (texto libre), **Teléfono AS** (ya era `<input>`, sin
    cambios), **Planta de reporte** (`<select>`, 20 plantas — la lista
    que dio el usuario tal cual, con **"Fusa"** en vez de "Fuza" para
    seguir la ortografía ya usada en Eureka/RANKING_PLANTS).
  - **Sistema → Subsistema → Condición/Falla es una cascada real**
    (`SUBSISTEMA_OPTIONS_BY_SISTEMA`/`CONDICION_OPTIONS_BY_SUBSISTEMA`,
    ambos keyed por el valor elegido en el nivel anterior): elegir
    Sistema repuebla las opciones de Subsistema, elegir Subsistema
    repuebla las de Condición. ⚠️ **Solo tenemos un camino completo
    confirmado por captura** (Sistema=REFRIGERACION → 8 subsistemas →
    Subsistema=RADIADOR → 9 condiciones) — cualquier otra combinación
    muestra la única opción `"Pendiente de confirmar"` en vez de
    inventar datos (mismo criterio de todo el proyecto). El recorrido
    guiado le pide al usuario explícitamente elegir Refrigeración→
    Radiador para que el ejemplo funcione con datos reales.
  - **Complemento** (5 opciones fijas, no depende de nada),
    **Sitio de varada** (Planta / Vía-Obra, solo en Crítico/No existe en
    Despegue) y **Lleva carga** (Sí/No, solo en Crítico) — estáticas.
  - Cada campo tiene su propio popup (`data-tip-title`/`data-tip-text`)
    con la explicación que dio el usuario — incluye la advertencia de
    que Sistema debe llenarse primero porque de él dependen las demás.
  - Implementado en `FIELD_DEFS` (id/tipo/opciones/tip por campo) +
    `fieldHtml()`/`renderCreateForm()` (ahora genera `<select>`/`<input>`
    reales) + `wireDetailFieldEvents()` (dispara `tourNotify('field:X')`
    en cada `input`/`change`, y repuebla el `<select>` hijo en la
    cascada Sistema→Subsistema→Condición).
- **12 pasos nuevos** insertados después de "confirma el tipo"  (antes
  el tour saltaba directo a Observaciones): info general (nada que
  hacer) → Nombre AS → Teléfono AS → Planta de reporte → Sistema →
  Subsistema → Condición/Falla → Complemento → Sitio de varada → Lleva
  carga → (Observaciones, ya existía) → Datos adjuntos (nada que
  adjuntar, solo Siguiente) → Disponibilidad/Tipo de novedad (se llenan
  solos) → Enviar. El tour completo pasó de 8 a **20 pasos**.
### 2) Recorrido guiado nuevo "¿Cómo revisar mis solicitudes?"
Estaba pendiente a propósito (`.faq-item.disabled`, badge
"Próximamente") — ahora existe, mismo motor genérico de tour de arriba.
12 pasos: Ingresar → esperar carga → clic "Mis solicitudes" en el
sidebar → clic "Filtro" (abre panel) → elegir "Bello" en el filtro de
Planta → clic "Filtro" de nuevo (cierra panel) → clic en el ícono de
flecha de cualquier fila (abre "Información") → clic en la ✕ (cierra) →
clic en el ícono de chat de esa fila → paso informativo (qué se ve en
el chat) → escribir y enviar un mensaje de simulación → elegir un
ticket distinto en el menú de la izquierda de Mis Chats. Termina en un
overlay de cierre propio (`#tourComplete2`, ver abajo).

**El motor de tour se generalizó para soportar varios recorridos**
(antes solo existía `TOUR_STEPS` fijo para "crear"): `TOUR_CREAR_STEPS`
y `TOUR_REVISAR_STEPS` (arrays separados) + `TOUR_DEFS` (mapa
`nombre → {steps, startScreen, completeId, setup}`, `setup()` resetea
el estado de esa sección de la app antes de arrancar — placa/tipo/obs
para "crear", filtros/panel/búsqueda para "revisar") + `startTour(name)`
parametrizado + `tourFinish()`/`exitTour()` leen `TOUR_DEFS[currentTourName]`
para saber qué overlay de cierre mostrar. Se agregó `#tourComplete2`
dentro de `#screenMisChats` (antes solo existía `#tourComplete` dentro
de `#screenCreate`) — ambos comparten la clase `.tour-complete-overlay`
(antes el CSS estaba en el id `#tourComplete` directo, se generalizó a
clase para poder reusarlo en el segundo overlay).

Se agregaron llamadas a `tourNotify(...)` en los puntos nuevos que el
recorrido necesita observar (todas no-op si no hay tour activo, mismo
patrón que ya usaba el resto de la app): `misSolShown`/`chatOpened`
(dentro de `goToScreen`), `filterOpened`/`filterClosed` (toggle de
`#btnToggleFilter`, según quede abierto o cerrado), `filterPlantaSet`
(`change` de `#fltPlanta`), `infoOpened`/`infoClosed` (`openInfoModal`/
botón ✕), `chatMessageSent` (después del `push` real a
`CHAT_MESSAGES`), `chatTicketSwitched` (clic en una `.chat-card`
distinta a la actual).

Se habilitó el 2do ítem de `#screenGuidedMenu` (antes
`<div class="faq-item disabled">` con badge "Próximamente", ahora
`<button id="faqRevisarSolicitudes">` igual que el primero).

### 3) Bug real pre-existente encontrado y corregido: el modal de "Nueva solicitud" no abría fuera del Feed
`#modalOverlay` (el modal "¿Qué tipo de mantenimiento deseas
solicitar?") estaba **anidado dentro de `#screenFeed`** en el HTML
original. Como cada `.app-screen` es `display:none` salvo la activa,
el modal literalmente no podía renderizarse (rect 0×0, aunque su propia
clase `.show` sí se aplicaba) cuando se abría desde cualquier botón
"Nueva solicitud" que **no** estuviera en la pantalla de inicio — o
sea, desde el sidebar de Crear/Mis Solicitudes/Mis Chats, y desde el
pill "Nueva solicitud" de la barra superior de Mis Solicitudes. Nadie
lo había notado porque el recorrido guiado (el único camino
"oficialmente" probado) siempre abre el modal desde el Feed. Se
encontró al escribir las pruebas de Playwright para el recorrido
"revisar mis solicitudes" (el clic no hacía nada y no había forma de
saber por qué sin inspeccionar el `getBoundingClientRect()`).
**Corrección:** se sacó `#modalOverlay` de adentro de `#screenFeed` y
se puso como hijo directo de `#frameWrap` (hermano de las 8
`.app-screen`, después de la última) — con `#frameWrap{position:relative;}`
agregado (antes no tenía `position`, hacía falta para que el
`position:absolute;inset:0` del modal se ancle al marco completo y no a
`body`/viewport). Ahora el modal se ve idéntico desde cualquier
pantalla, escalado junto con el resto del marco por `fitFrame()` igual
que antes.

### 4) `Manual_OrionTablero.html`: menú lateral "Páginas" (único cambio pedido para este tablero)
Réplica del panel de navegación nativo de Power BI que se ve en
`Recursos/OrionTablero/Menulateral.png` / `Menulateral detalle.png`:
columna fija a la izquierda del tablero con los 4 títulos de página
reales (Resumen solicitudes, Status – Taller, Disponibilidad
operacion, Disponibilidad - Actual por horas) + un ícono `«`/`»` junto
al título "Páginas" para contraer/expandir (por defecto siempre
**abierto**, como pidió el usuario).
- **Reusa el `MENU_MAIN` que ya existía** (el array de las 4 páginas
  principales, usado por los botones-pastilla de arriba) — no se
  inventó una lista nueva. `renderPagesSidebar(activeId)` genera los 4
  botones (`.pages-nav-item[data-go]`) y resalta el activo; si la
  pantalla activa es una de las 4 "hoja" (`LEAF_SCREENS` — Ingresos-
  Programación, Histórico disponibilidad, Comportamiento-placas,
  Histórico-Tickets, a las que se llega haciendo drill-down desde una
  de las 4 principales), el sidebar resalta la página **padre**
  (`dashReturnScreen`, variable que ya existía para el botón de
  regreso) en vez de no resaltar nada.
- **`#boardWrap` pasó de un bloque único de 1650px a un `display:flex`**
  de 1850px con 2 hijos: `.pages-sidebar` (200px fijo, colapsa a 40px
  con `flex-basis`+`transition`) y `#boardContent` (flex:1 — el resto
  del tablero, todas las 8 `.tablero-screen`, sin tocar su contenido
  interno de 1650px, que sigue intacto). `fitBoard()` no necesitó
  cambios: ya lee `boardWrap.offsetWidth` dinámicamente.
- El handler delegado de clics (`.menu-btn[data-go]`) se generalizó a
  `.menu-btn[data-go], .pages-nav-item[data-go]` para que el sidebar
  navegue con el mismo `goToTab()` de siempre — cero JS nuevo de
  navegación, solo el nuevo HTML/CSS del panel.
- **2 bugs reales pre-existentes encontrados y corregidos** (aparecieron
  al probar el sidebar con Playwright, no relacionados con el sidebar
  en sí): tanto `menuBtnHtml()` (los 4 botones-pastilla de arriba, ya
  existían) como mi nuevo `pagesNavItemHtml()` armaban su
  `data-tip-text` con **comillas dobles literales sin escapar dentro de
  un atributo HTML también entre comillas dobles**
  (`data-tip-text="Ir a la sección "${label}"."`) — el navegador corta
  el atributo en la primera comilla interna y el resto del texto se
  interpreta como atributos HTML basura, corrompiendo el elemento.
  Se quitaron las comillas alrededor de `${label}` en ambas funciones
  (`Ir a la sección ${label}.`, sin comillas) — nadie lo había notado
  antes porque un navegador normal "recupera" el HTML roto de forma
  silenciosa casi siempre; solo se hizo evidente al leer el
  `outerHTML` real en una prueba automatizada.

### Fusión de `Manual_Orion.html` + `Manual_OrionTablero.html` en un solo manual
Mismo patrón que la fusión de Eureka (welcome → elegir manual → cada
uno con su propio contenedor, mostrado/ocultado): se decidió fusionar
**dentro de `Manual_Orion.html`** (conserva el nombre "base", igual que
`Manual_Eureka.html` se quedó como nombre del conjunto) en vez de crear
un archivo nuevo, y se hicieron primero todas las correcciones de los
puntos 1-3 en los 2 archivos por separado, fusión al final — más fácil
de probar cada pieza aislada antes de combinar.

- **Nuevo flujo**: `#welcomeScreen` → clic `#btnComenzar` →
  `#chooseManualScreen` ("¿Qué manual quieres ver? App Orion / Tablero
  Orion", nueva pantalla) → `#btnChooseApp` muestra `#appContent` con
  `#stage` (la app, igual que antes) visible y llama `showApp()`, o
  `#btnChooseTablero` muestra `#appContent` con **`#stageT`** (el
  tablero, antes `#stage` en su archivo propio — renombrado para no
  chocar) visible y llama `showTablero()`. `#pageHeaderApp`/
  `#pageHeaderTablero` (el `<div class="page-header">` de cada uno, con
  su propio `<h1>`/badge/texto) se togglean junto con su stage. **No
  se agregó navegación cruzada entre los 2** (a diferencia de Eureka)
  porque, a diferencia de RT↔Histórico, la app y el tablero de Orion
  no tienen ningún botón real que se preste para eso — si más adelante
  se quiere, habría que inventar un botón nuevo sin respaldo en una
  captura real.
- **Motor de tooltips (`tooltip`/`activeEl`/`showTooltip`/`hideTooltip`/
  `positionTooltip`/`hasHover`/`bindHotspot`/`bindAllHotspots`) se
  comparte tal cual** — es idéntico en ambos archivos (mismo patrón que
  Eureka), se mantuvo **una sola copia** (la de `Manual_Orion.html`) y
  se descartó la copia de `Manual_OrionTablero.html` al fusionar.
- **Identificadores renombrados por chocar o por significar cosas
  distintas** (`Manual_OrionTablero.html` → dentro de
  `Manual_Orion.html`):

  | Antes (Tablero standalone) | Ahora (fusionado) | Por qué |
  |---|---|---|
  | `#stage`, `const stage` | `#stageT`, `const stageT` | Orion app ya tiene su propio `#stage` (ancho de diseño distinto: 1300px vs 1850px) |
  | `fitBoard()` | `fitBoardT()` | Orion app ya tiene `fitFrame()` con otro nombre, pero por claridad se le puso sufijo `T` igual que a `stage` |
  | `let resizeTimer` | `let resizeTimerT` | Orion app ya declara su propio `let resizeTimer` para `fitFrame` — con `let`/`const` duplicado el script ni siquiera cargaba (`SyntaxError`) |
  | `:root{--navy:#173a70;...}` (19 variables) | `#stageT{--navy:#173a70;...}` (mismo bloque, mismo selector-scope) | Ambos archivos usan **los mismos nombres** de variable (`--navy`, `--blue`, `--red`, etc.) con **valores distintos** — si se dejaban los 2 en `:root` el que cargara después pisaba los colores del otro tablero completo. Escoparlas en `#stageT` (que envuelve todo el contenido del tablero) hace que `var(--navy)` etc. dentro de esa subrama del DOM resuelvan al valor del tablero, sin tocar el `:root` real de la app |
  | `#tooltip` (CSS), `.page-header` (CSS), `#welcomeScreen`/`.welcome-card`/`#appContent` (CSS+HTML) | *(eliminados)* | Motor de tooltip y `.page-header` reusan la copia de la app (ver arriba); el welcome/appContent propios de Tablero ya no hacían falta — el flujo de bienvenida unificado vive solo en `Manual_Orion.html` |
  | `<div id="appContent">` + `<div class="page-header">` propios de Tablero (envolvían todo su contenido) | *(eliminados, contenido re-anidado directo bajo el `#appContent` compartido)* | Un solo `#appContent` para los 2 sub-manuales, como en Eureka |
- Todo lo demás (`goToTab`, `LEAF_SCREENS`, `dashReturnScreen`,
  `renderMenuRow`/`MENU_MAIN`/`MENU_STATUS_TALLER`/`MENU_DISP_OPERACION`,
  `renderPagesSidebar`, cada `render<Pantalla>()`, `TICKETS`-equivalente
  de Tablero, etc.) se copió **sin renombrar** — ningún nombre choca con
  algo de la app (vocabularios completamente distintos:
  `goToScreen`/`screenX` en la app vs `goToTab`/`tabX` en el tablero).
- Verificado con Playwright (Chromium headless): welcome → Comenzar →
  elegir "App Orion" (recorrido completo "crear solicitud" de 20 pasos,
  de principio a fin, dentro del archivo ya fusionado) y, en una
  segunda pasada, elegir "Tablero Orion" (colores escopeados
  correctos — se verificó el color de fondo real del botón activo,
  `rgb(164,51,60)` = `#a4333c`, el rojo-activo **del tablero**, no el
  `--red`/`--navy` de la app —, navegación del sidebar "Páginas", y
  toggle de colapsar/expandir) y el recorrido "revisar mis solicitudes"
  completo también dentro del archivo fusionado — cero errores de
  consola en ambos caminos.
  > ⚠️ **Bug propio de la fusión, encontrado y corregido:** al armar el
  > CSS escopeado se agregó por accidente `#stageT{display:none;}` en
  > la hoja de estilos **además** del `style="display:none;"` inline en
  > el HTML — `showTablero()` solo limpiaba el inline
  > (`el.style.display=''`), así que la regla CSS se quedaba
  > escondiendo el tablero para siempre aunque el atributo inline ya
  > estuviera vacío (el inline vacío simplemente cede el paso a la
  > regla CSS de la hoja de estilos, que seguía diciendo `none`). Se
  > quitó esa regla CSS — el `display:none` inicial vive solo en el
  > HTML, y el JS lo controla desde ahí.
- `Manual_OrionTablero.html` queda como legacy/standalone (ver nota al
  inicio del Manual 4 arriba) — candidato a borrar cuando el usuario
  confirme.

## Próximos pasos
1. Ir reemplazando los `pending:true` / notas "pendiente de confirmar"
   de los cuatro manuales con las definiciones reales según las vaya
   confirmando el equipo — en `Manual_Orion.html` (sección Tablero)
   esto aplica a prácticamente todos los `data-tip-text` (son
   placeholders genéricos a propósito, ver su sección "Pendiente").
2. Cualquier imagen nueva que se agregue debe convertirse a base64 e
   incrustarse (no usar rutas relativas a `Recursos/`).
3. Completar `Disponibilidad - Actual por horas` en `Manual_Orion.html`
   (sección Tablero, `#tabDispHoras`) cuando lleguen las capturas de
   esa sección.
4. Confirmar con el usuario los puntos marcados con ⚠️ en la sección
   "Rediseño completo de Eureka Histórico" arriba: texto del popup de
   "Manual de Uso", si el ícono de "Cumplimiento" realmente es
   hipervínculo, si el filtro de planta del ranking debería también
   cambiar el gráfico de línea/waterfall, y revisar los ~29 nombres de
   categoría del waterfall transcritos a ojo desde `Fila5.png`.
