/* =========================================================================
   Datos de ejemplo de los tableros Locomboo (LD.data). Son planos y se generan
   al primer uso con una semilla fija, así que siempre salen iguales.

   - Se toman de las capturas (Recursos/Locombo/Tablero, LocoCemento,
     LocoCaracolito, LocoPorteria, LocoNomina): nombres, cargos, conteos por día
     y turno, promedios por planta y valores de las tablas.
   - Se inventan: el resto de filas, horas exactas y extras.
   - Las cédulas y los códigos son SIEMPRE ficticios (no los de las capturas).
   ========================================================================= */
(function () {
  'use strict';
  const LD = window.LD;
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const FESTIVOS = new Set(['2026-08-07','2026-08-17','2026-10-12','2026-11-02']);
  LD.MESES = MESES;

  /* ---------------- Azar con semilla ---------------- */
  function RNG(seed) {
    let a = seed >>> 0;
    const f = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (x, y) => x + Math.floor(f() * (y - x + 1));
    f.pick = l => l[Math.floor(f() * l.length)];
    f.shuffle = l => { const o = [...l]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
    return f;
  }

  /* ---------------- Calendario ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const toIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const ms = (iso, h = 0, m = 0, s = 0) => { const d = fromIso(iso); d.setHours(h, m, s, 0); return d.getTime(); };
  function isoRange(a, b) {
    const out = [], d = fromIso(a), end = fromIso(b);
    while (d <= end) { out.push(toIso(d)); d.setDate(d.getDate() + 1); }
    return out;
  }
  function weekOfMonth(iso) {
    const d = fromIso(iso), first = new Date(d.getFullYear(), d.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const w = Math.ceil((d.getDate() + offset) / 7);
    return w > 5 ? 1 : w;
  }
  function dateFields(iso) {
    const d = fromIso(iso), festivo = d.getDay() === 0 || FESTIVOS.has(iso);
    return {
      iso, anio:d.getFullYear(), mes:MESES[d.getMonth()], diaNum:d.getDate(), nombreDia:DIAS[d.getDay()],
      tipoDia:festivo ? 'Festivo/Domingo' : 'Normal', semana:weekOfMonth(iso), festivo
    };
  }

  /* ---------------- Personas (cédula y código ficticios) ---------------- */
  const NOM = ['JUAN','CARLOS','ANDRES','LUIS','JOSE','DIEGO','MIGUEL','OSCAR','JORGE','FABIAN','WILSON','EDWIN','HENRY','CAMILO','SERGIO','DAVID','RICARDO','MAURICIO','ALEXANDER','JAIRO','GERMAN','RAFAEL','VICTOR','HUGO','NELSON'];
  const NOMF = ['DANIELA','LAURA','PAOLA','ANGIE','SANDRA','CAROLINA','MARCELA'];
  const APE = ['GOMEZ','RODRIGUEZ','MARTINEZ','LOPEZ','GARCIA','PEREZ','SANCHEZ','RAMIREZ','TORRES','DIAZ','ROJAS','VARGAS','MORENO','HERRERA','MEDINA','CASTRO','SUAREZ','ORTIZ','RUBIO','MEJIA','CARDENAS','PARRA','GUZMAN','SALAZAR','BELTRAN','CORTES','ACOSTA','PINZON','LEON','VEGA'];
  /* apellidoPrimero = true: "PEREZ GOMEZ JUAN"; false: "JUAN PEREZ GOMEZ" */
  function fillerNames(rng, n, used, apellidoPrimero) {
    const out = [];
    while (out.length < n) {
      const lista = rng() < 0.07 ? NOMF : NOM;
      const a = rng.pick(APE), b = rng.pick(APE), c = rng.pick(lista), d = rng.pick(lista);
      const name = apellidoPrimero ? `${a} ${b} ${c} ${d}` : `${c} ${d} ${a} ${b}`;
      if (!used.has(name) && a !== b && c !== d) { used.add(name); out.push(name); }
    }
    return out;
  }
  function person(rng, nombre, extra) {
    const big = rng() < 0.35;
    return Object.assign({
      nombre,
      ced:rng.int(1000000000, 1199999999) - (rng() < 0.3 ? 1000000000 - rng.int(0, 90000000) : 0),
      cod:big ? rng.int(35040000, 35049999) : rng.int(1350000, 1759999)
    }, extra);
  }

  /* ---------------- Calibración: promedio del campo = objetivo ---------------- */
  function calibrate(rows, field, target, max) {
    const live = rows.filter(r => r[field] > 0);
    if (!rows.length || !live.length) return;
    for (let pass = 0; pass < (max ? 40 : 1); pass++) {
      const k = (target * rows.length) / live.reduce((s, r) => s + r[field], 0);
      live.forEach(r => { r[field] = max ? Math.min(max, r[field] * k) : r[field] * k; });
    }
  }

  /* =======================================================================
     CEMENTO — capturas LocoCemento
     ======================================================================= */
  const CEM_NAMES = ['ANDRES FABIAN ORJUELA AVILAN','ANGEL ALBERTO VENEGAS AREVALO','ANYELO OSWALDO RINCON RINCON','ARNOLDO ACERO ACOSTA','BRAULIO ROGELIO GARCIA TOVAR','CESAR LEANDRO MORENO PEÑA','EDGARDO JOSE FRAGOZO MURGAS','EDILSON MAURICIO CIFUENTES PINZON','EDISON JAVIER TORRES GARZON','EDISON SEBASTIAN MOLINA HERNANDEZ','EDUARDO ESPINOSA DIAZ','HECTOR GERARDO PEREZ RODRIGUEZ','HERVIN YESID RODRIGUEZ VILLAMIZAR','HOLMAN STIDWAR CAICEDO ÑUSTES','ISAAC VILLA TORRES','JAVIER ESPITIA RODRIGUEZ','JESUS HERNAN AREVALO BARRERA','JOAQUIN ANTONIO BERRIO MURILLO','JOHAN NICOLAS NIÑO AMPUDIA','JOHN ALEXANDER RODRIGUEZ DIAZ','JORGE ENRIQUE MURILLO MARULANDA','JORGE HERNAN CIFUENTES MARTINEZ','JOSE ALFREDY RAQUIRA PACASUCA','JOSE ANTONIO VASQUEZ TRIVIÑO','JOSE JULIAN ORGANISTA SANCHEZ','JOSE LUIS RODRIGUEZ AVELLANEDA','JUAN CARLOS RIOS ESTEVEZ','JUAN MANUEL RAMIREZ ROCHA','JUAN MANUEL SANCHEZ RODRIGUEZ','JUAN PABLO RODRIGUEZ ORTIZ','JULIAN DAVID MUÑOZ QUINTERO','LIBARDO RAIGOSO MARTINEZ','LUIS ALBERTO TRUJILLO REYES','MARIO ANTONIO CLAVIJO CLAVIJO','MICHAEL GIOVANNY RUIZ SEDANO','MIGUEL RODRIGO PERDIGON ORJUELA','NEIL ANGEL CIFUENTES VARGAS','OSCAR ANDRES MORA GABIDIA','OSCAR GERMAN ARAGON GUZMAN','PEDRO LUIS QUEVEDO RUIZ','ROBERT ALDEMAR CORTES HERRERA','RONAL AVELLANEDA VELASQUEZ','WALTER SMITH TOVAR ALVARADO','WILLIAM MAURICIO GAITAN ALBINO','WILSON ERNESTO AVELLANEDA RUEDA','WILSON RODRIGUEZ FLOREZ','YESID ADOLFO CUBILLOS CIFUENTES','CARLOS ANDRES PRIETO LOPEZ'];

  /* Conteo por día y turno leído de 2.png: [A,B,C,D,EnProgreso,Otro,12HDía,12HNoche] */
  const CEM_COUNTS = {
    '2026-08-31':[13,10,10,7,0,1,1,0],'2026-09-01':[14,10,10,9,0,1,0,0],'2026-09-02':[15,10,11,9,0,0,0,0],'2026-09-03':[14,10,11,10,0,0,0,0],
    '2026-09-04':[24,10,11,0,0,0,0,0],'2026-09-05':[13,10,11,0,0,0,0,0],'2026-09-06':[5,5,5,0,0,0,0,0],'2026-09-07':[14,9,11,9,0,1,1,0],
    '2026-09-08':[16,11,10,10,0,0,0,1],'2026-09-09':[16,11,11,9,0,0,0,0],'2026-09-10':[14,11,11,8,0,1,0,0],'2026-09-11':[22,11,11,1,0,0,0,0],
    '2026-09-12':[14,10,11,0,0,0,0,0],'2026-09-13':[1,0,0,0,0,0,0,0],'2026-09-14':[17,10,9,10,0,0,1,0],'2026-09-15':[12,10,9,10,0,0,1,1],
    '2026-09-16':[15,11,9,11,0,0,0,1],'2026-09-17':[14,11,10,10,0,0,0,0],'2026-09-18':[21,11,10,1,0,0,0,0],'2026-09-19':[12,11,10,0,0,0,0,0],
    '2026-09-20':[4,4,5,0,0,0,1,0],'2026-09-21':[15,10,9,9,0,0,0,1],'2026-09-22':[15,10,10,10,0,0,0,0],'2026-09-23':[13,9,10,10,0,0,1,0],
    '2026-09-24':[14,9,10,8,0,0,0,1],'2026-09-25':[20,10,9,0,0,0,1,1],'2026-09-26':[13,10,10,0,0,0,0,0],'2026-09-27':[1,0,0,0,0,1,0,0],
    '2026-09-28':[13,9,9,6,0,0,1,0],'2026-09-29':[13,9,9,7,0,1,0,2],'2026-09-30':[13,10,9,6,0,0,0,1],'2026-10-01':[15,9,10,7,0,1,0,0],
    '2026-10-02':[20,8,11,2,0,2,0,0],'2026-10-03':[13,10,10,0,0,2,0,0],'2026-10-04':[4,4,9,0,0,2,1,0],'2026-10-05':[14,8,8,8,0,2,0,1],
    '2026-10-06':[15,9,11,9,0,1,0,0],'2026-10-07':[15,10,9,6,0,4,0,1],'2026-10-08':[13,10,11,8,0,0,0,0],'2026-10-09':[18,9,10,0,0,3,0,0],
    '2026-10-10':[11,10,9,0,0,2,0,0],'2026-10-11':[0,0,0,0,0,1,0,0],'2026-10-12':[0,0,0,0,0,1,0,0],'2026-10-13':[12,11,9,8,0,0,0,0],
    '2026-10-14':[12,9,10,8,0,2,1,0],'2026-10-15':[12,7,9,9,0,4,0,1],'2026-10-16':[19,9,8,0,0,4,1,1],'2026-10-17':[12,8,9,0,0,1,1,1],
    '2026-10-18':[0,0,0,0,0,1,7,0],'2026-10-19':[10,9,10,9,0,0,2,0],'2026-10-20':[10,7,9,10,0,6,0,2],'2026-10-21':[13,10,5,7,0,8,0,2],
    '2026-10-22':[9,9,9,2,0,8,7,0],'2026-10-23':[17,9,9,0,0,6,0,0],'2026-10-24':[12,11,8,0,0,2,0,0],'2026-10-25':[6,7,7,0,0,1,0,0],
    '2026-10-26':[0,0,0,0,31,0,0,0]
  };
  const CEM_TURNOS = ['A','B','C','D','En progreso','Otro / Error','Turno 12H Día','Turno 12H Noche'];
  /* [hora de inicio relativa al día (negativa = día anterior), horas programadas] */
  const CEM_DEF = { A:[7, 8], B:[15, 8], C:[-1, 8], D:[7, 9.5], 'Turno 12H Día':[7, 12], 'Turno 12H Noche':[-5, 12] };
  const CEM_CORTE = ms('2026-10-26', 10, 13, 39);

  const memo = {};
  const once = (k, fn) => () => (memo[k] || (memo[k] = fn()));

  const cemento = once('cemento', () => {
    const rng = RNG(1101);
    const people = CEM_NAMES.map((n, i) => person(rng, n, { planta:i % 5 === 4 ? 'Terminal Cemento' : 'Molienda Cemento' }));
    const habitual = people.find(p => p.nombre.startsWith('JOHAN NICOLAS'));
    const rows = [];
    let consec = 500000, weekKey = null, order = people;
    Object.keys(CEM_COUNTS).forEach(iso => {
      const df = dateFields(iso);
      const wk = df.anio + '-' + df.mes + '-' + df.semana;
      if (wk !== weekKey) { weekKey = wk; order = rng.shuffle(people); }
      let idx = 0;
      CEM_COUNTS[iso].forEach((count, ti) => {
        const turno = CEM_TURNOS[ti];
        for (let n = 0; n < count; n++) {
          const p = order[idx++ % order.length];
          const def = CEM_DEF[turno];
          const row = Object.assign({}, df, {
            nombre:p.nombre, ced:p.ced, cod:p.cod, planta:p.planta, turno, _i:rows.length,
            tipoJ:'Diurna', ingreso:null, salida:null, inicio:null, fin:null, horas:0, consec:null, comentario:'',
            hExt:0, extD:0, extN:0, extDD:0, extND:0, recN:0, recD:0, recDN:0, redD:0, redN:0,
            fOc:0, fHab:0, solic:null, tipoSolic:'', tipoError:'', metIng:'', metSal:'', metIngAnt:'', metSalAnt:'', ingAnt:null, salAnt:null, w1061:0, w1062:0
          });
          consec += rng.int(60, 200);
          if (def) {
            row.inicio = ms(iso, 0) + def[0] * 3600000;
            row.fin = row.inicio + def[1] * 3600000;
            row.ingreso = row.inicio + rng.int(-20 * 60, 12 * 60) * 1000;
            row.salida = row.fin + rng.int(-25 * 60, 25 * 60) * 1000;
            row.horas = def[1];
            row.consec = consec;
            if (turno === 'B') { row.recN = 4; row.redN = df.nombreDia === 'sábado' ? 3 : 0; }
            if (turno === 'C') { row.recN = 7; row.redN = df.nombreDia === 'sábado' ? 3 : 0; row.recDN = df.festivo ? 1 : 0; }
            if (turno === 'A' && df.nombreDia === 'sábado') row.redD = 3;
            if (turno === 'Turno 12H Día') { row.hExt = 4; row.extD = 4; }
            if (turno === 'Turno 12H Noche') { row.hExt = 4; row.extN = 3; row.recN = 9; }
            if (df.festivo) { row.recD = 8; if (p === habitual) row.fHab = 1; else row.fOc = 1; }
            if (rng() < 0.012) { const e = rng.pick([1, 1, 2, 2, 3, 4]); row.extD += e; row.hExt += e; }
            if (rng() < 0.006) { const e = rng.pick([1, 1, 2, 3]); row.extN += e; row.hExt += e; }
            if (rng() < 0.085) row.hExt += rng.pick([1.5, 2, 4]);
          } else if (turno === 'En progreso') {
            const dia = n < 8;
            row.ingreso = dia ? ms('2026-10-25', 22, rng.int(44, 59), rng.int(0, 59)) : ms('2026-10-26', 6, rng.int(34, 59), rng.int(0, 59));
            row.salida = CEM_CORTE;
            row.inicio = dia ? ms('2026-10-25', 23) : ms('2026-10-26', 7);
            row.fin = dia ? ms('2026-10-26', 10) : ms('2026-10-26', 15);
            row.horas = dia ? 11 : 3;
          } else {
            /* Otro / Error: registros incompletos */
            const tipo = rng.pick(['Sin ingreso', 'Sin ingreso', 'Sin salida', 'Sin error']);
            row.tipoError = tipo;
            row.inicio = ms('1899-12-30', 0);
            row.tipoJ = tipo === 'Sin error' ? 'Diurna' : 'Error';
            const ini = ms(iso, 0) + rng.int(5, 22) * 3600000 + rng.int(0, 3000) * 1000;
            if (tipo !== 'Sin ingreso') { row.ingreso = ini; row.metIng = 'Ingreso'; }
            if (tipo !== 'Sin salida') {
              row.salida = tipo === 'Sin ingreso' ? ini : ini + rng.int(7, 13) * 3600000;
              row.metSal = 'Salida';
            }
            if (tipo === 'Sin error') { row.horas = 8; row.consec = consec; row.inicio = ini; row.fin = row.salida; }
            row.ingAnt = ini - 86400000 + rng.int(-3000, 3000) * 1000;
            row.salAnt = ini - 86400000 + 8 * 3600000;
            row.metIngAnt = 'Ingreso';
            row.metSalAnt = 'Salida';
          }
          rows.push(row);
        }
      });
    });
    /* Extras semanales 1061/1062 (múltiplos de 3): van en la primera jornada de cada persona en la semana */
    LD.group(rows, r => r.anio + r.mes + r.semana + r.nombre).forEach(list => {
      if (rng() < 0.1) list[0].w1061 = rng.pick([3, 3, 3, 6, 9]);
      if (rng() < 0.11) list[0].w1062 = rng.pick([3, 3, 6, 6, 9, 12]);
    });
    const solicitudes = [
      { iso:'2026-10-14', ...dateFields('2026-10-14'), empleado:'1737136', nombre:'JOHAN NICOLAS NIÑO AMPUDIA', inicio:ms('2026-10-14', 15), horas:4, estatus:'Aprobado', concepto:'Horas extras diurnas', just:'Capacitación', comentario:'Capacitación Metrología' },
      { iso:'2026-10-15', ...dateFields('2026-10-15'), empleado:'1746015', nombre:'HOLMAN STIDWAR CAICEDO ÑUSTES', inicio:ms('2026-10-14', 19), horas:4, estatus:'Aprobado', concepto:'Horas Extra Nocturnas', just:'Capacitación', comentario:'Capacitación metrología' }
    ];
    const r0 = rows.find(r => r.iso === '2026-10-14' && r.nombre.startsWith('JOHAN NICOLAS')) || rows.find(r => r.iso === '2026-10-14' && r.turno === 'Turno 12H Día');
    if (r0) { r0.solic = 4; r0.tipoSolic = 'Horas extras diurnas'; }
    return { rows, solicitudes, corte:CEM_CORTE };
  });

  /* =======================================================================
     CARACOLITO (también lo usa el tablero Nómina) — capturas LocoCaracolito
     ======================================================================= */
  const CAR_NAMES = [
    ['PIRAZAN GAVIRIA OSKAR EDUARDO','TECNICO LIDER MANTENIMIENTO MECANICO'],['TIQUE TIQUE CARLOS','TECNICO MANTTO. MECANICO C'],['DUARTE VALDERRAMA JULIO CESAR','LIDER DE CANTERA'],['BANGUERO CUENCA CENARDO ELIAS','TECNICO CAMPO ENVASE'],['BARRETO VERA CAMILO ANDRES','TECNICO OPERATIVO B'],['ECHEVERRI CEBALLOS JESUS ARLEY','TECNICO MANTTO. MECANICO A'],['BEDOYA PINEDA JAIRO ALONSO','TECNICO DE CANTERA'],['ROJAS APONTE DIEGO FABIAN','TECNICO MANTTO. MECANICO C'],['CARVAJAL PEÑA MIGUEL ALFONSO','SUPERINTENDENTE DE MINA'],['PEÑA CRUZ DIEGO ARMANDO','TECNICO OPERATIVO A'],['HURTADO GARCIA ARISMENDY','TECNICO DE CANTERA'],['DIAZ VEGA EDUARDO','TECNICO OPERATIVO B'],['TORRES DIAZ JOSE RICARDO','TECNICO OPERATIVO C'],['MURILLO ROJAS MIGUEL','INSTRUMENTISTA'],['MORENO VIÑA EDWARD DANIEL','TECNICO OPERATIVO A'],['CRISTANCHO LOZANO JORGE ENRIQUE','TECNICO CAMPO ENVASE'],['ORTIZ ROPERO ANDRES CAMILO','TECNICO MANTTO ELECTRICO B'],['PALOMINO RESTREPO CARLOS ANDRES','TECNICO MANTTO ELECTRICO A'],['QUIÑONEZ LOPEZ CRISTIAN FERNEY','AUXILIAR DE LABORATORIO'],
    ['NARVAEZ TORRES JUAN CARLOS','TECNICO OPERATIVO A'],['PAMPLONA SOLER JULIO','TECNICO MANTTO. MECANICO A'],['VARGAS HERNANDEZ GABRIEL OSWALDO','TECNICO MANTTO. MECANICO B'],['CIFUENTES MARULANDA GIOVANNY','TECNICO MANTENIMIENTO PREDICTIVO'],['ROJAS VALENCIA FLORENCIO','TECNICO DE CANTERA'],['JARAMILLO OYUELA CARLOS EDUARDO','TECNICO OPERATIVO D'],['GARCIA CUARTAS JAIME ANTONIO','TECNICO OPERATIVO D'],['BUITRAGO MURCIA JOSE IVER','TECNICO MANTTO. MECANICO A'],['CORONADO ARCO NEURIO ANTONIO','SUPERINTENDENTE DE MINA'],['COLLAZOS RINCON JHONN FREDDY','TECNICO MANTENIMIENTO PREDICTIVO ELECTRICO'],['PEÑA MORENO ARLEY','MONTACARGUISTA'],['SANCHEZ ROJAS HUMBERTO','TECNICO OPERATIVO A'],['CASTIBLANCO CRUZ JOSE RODRIGO','JEFE DE TURNO'],['RUIZ OLIVERA ROBERT ALEXANDER','ANALISTA DE LABORATORIO'],['RIAÑO BARRETO ANGEL ALBERTO','TECNICO OPERATIVO B'],['VARON HERNANDEZ JAVIER','LIDER DE CANTERA'],['POVEDA TOBAR JOHN JAIRO','TECNICO MANTENIMIENTO PREDICTIVO'],['VANEGAS ARIAS ROBERT NICOLAY','OPERADOR COP HORNOS'],['MAHECHA MORA GERMAN MARTIN','TECNICO OPERATIVO A'],['OLMOS SANABRIA MARLON AUGUSTO','TECNICO LIDER MANTENIMIENTO MECANICO'],['CAMARGO ARANGO OSCAR ADRIAN','OPERADOR COP HORNOS'],['CARDONA MURILLO CARLOS ANDRES','TECNICO OPERATIVO C'],['ACOSTA PEÑA EDUARD LEANDRO','TECNICO OPERATIVO B'],['REYES ROA CARLOS ANDRES','AUXILIAR DE LABORATORIO'],['VILLABON ABORNOZ JHON JAIRO','TECNICO MANTTO. MECANICO C'],['MONTEALEGRE MUNERA EDWIN DANILO','TECNICO MANTTO ELECTRICO A'],['BARON RAMIREZ MARLON ALEJANDRO','TECNICO OPERATIVO D'],['GONZALEZ VERGAÑO JOHN JAIME','TECNICO MANTTO. MECANICO C'],['DURANGO LUIS JHONATAN FERNANDO','TECNICO MANTTO ELECTRICO B'],['MARTINEZ BUSTOS JUAN SEBASTIAN','TECNICO OPERATIVO C'],
    ['HERRERA ACOSTA MARCELINO','TECNICO OPERATIVO C'],['ENAMORADO BENAVIDES EVIN ALBERTO','ANALISTA DE LABORATORIO'],['ALAPE LARA ALEXANDER','AUXILIAR DE LABORATORIO'],['OLAYA SILVA JOSE IGNACIO','TECNICO OPERATIVO D'],['BARRERO APONTE LUIS EDUARDO','ANALISTA DE LABORATORIO'],['MARTINEZ RODRIGUEZ CESAR AUGUSTO','TECNICO MANTTO. MECANICO B'],['CASTIBLANCO PINZON FABIO HERNANDO','TECNICO OPERATIVO A'],['BUENDIA SALAZAR CIRO ALFONSO','TECNICO OPERATIVO B'],['LOZANO PERDOMO FERNANDO','TECNICO OPERATIVO C'],['PERDOMO SUAREZ JOHN ALEXANDER','ANALISTA DE LABORATORIO'],['SILVA ORTIZ JUAN SEBASTIAN','TECNICO OPERATIVO D'],['RUBIO AGUIRRE EDIER GREGORIO','TECNICO DE CANTERA'],['SANCHEZ JHONATAN ANDRES','TECNICO CAMPO ENVASE'],['SANTANA ARIZA FREDDY','TECNICO OPERATIVO B'],['ACUÑA JIMENEZ JORGE LUIS','TECNICO MANTTO. MECANICO C'],['AGUDELO DEVIA JORGE ENRIQUE','TECNICO MANTTO ELECTRICO A'],['ALVAREZ VEGA OSCAR GIOVANNY','TECNICO OPERATIVO A'],['APONTE DOCTOR NEDIR','TECNICO MANTTO ELECTRICO B'],['APONTE VARGAS JAIME ALFREDO','TECNICO OPERATIVO C'],['ARDILA CASTILLO GERMAN DARIO','TECNICO OPERATIVO C'],['ARENAS OCAMPO DANILO','TECNICO DE CANTERA'],['AREVALO CAMILO EDUARDO','OPERADOR COP HORNOS'],['ARGUELLO CRUZ BRAYAN STEVEN','JEFE DE TURNO'],['ARIZA ALAPE JOSE EDUARDO','TECNICO CAMPO ENVASE'],['AROCA SOGAMOSO WILSON FABIAN','TECNICO MANTTO. MECANICO C'],['AVENDAÑO PERDOMO WILLIAM','MONTACARGUISTA'],['BARBOSA ARIAS MAWER','TECNICO DE CANTERA'],['MURILLO ROBAYO DANNY HARLEY','TECNICO MANTTO. MECANICO C'],['MEDINA PRECIADO ALEXANDER','OPERADOR COP HORNOS'],['MOLINA RUBIANO MANUEL EDUARDO','MONTACARGUISTA'],['SILVA QUIROGA DAVID','TECNICO CAMPO ENVASE']
  ];
  const CAR_POS_EXTRA = ['TECNICO OPERATIVO A','TECNICO OPERATIVO B','TECNICO OPERATIVO C','TECNICO OPERATIVO D','TECNICO MANTTO. MECANICO A','TECNICO MANTTO. MECANICO B','TECNICO DE CANTERA','TECNICO CAMPO ENVASE','ANALISTA DE LABORATORIO','OPERADOR COP HORNOS'];
  const funcion = pos => /MANT|MECANICO|ELECTRICO|INSTRUMENT/.test(pos) ? 'Mantenimiento' : /LABORATORIO/.test(pos) ? 'Calidad' : 'Producción y Manufactura';
  const zonaDe = (pos, rng) => /CAMPO ENVASE|MONTACARG/.test(pos) ? 'Empaque' : /MECANICO|CANTERA/.test(pos) ? rng.pick(['Taller','Palmeras (Casino)','Palmeras (Casino)']) : /SUPERINT|LIDER DE CANTERA/.test(pos) ? 'Cop' : 'Palmeras (Casino)';

  const CAR_T = {
    EP:'En planta', NO:'Nocturno-Amanecida', OT:'Otro / Error', D12:'Turno 12H Día / 7:00 a.m. - 7:00 p.m.', N12:'Turno 12H Noche / 7:00 p.m. - 7:00 a.m.',
    AD:'Turno Adm. / 7:00 a.m. - 4:30 p.m.', MA:'Turno Mañana / 7:00 a.m. - 3:00 p.m.', TA:'Turno Tarde / 3:00 p.m. - 11:00 p.m.'
  };
  const CAR_ORDER = ['EP','NO','OT','D12','N12','AD','MA','TA'];
  /* Conteo por día de octubre leído de 2.png, en el orden de CAR_ORDER */
  const CAR_OCT = {
    1:[0,0,17,26,30,50,16,1],2:[0,2,17,4,29,45,19,24],3:[0,24,4,1,7,4,33,29],4:[0,26,10,2,3,0,33,29],5:[0,27,13,5,2,45,34,28],
    6:[0,26,13,31,4,45,23,1],7:[0,1,17,28,29,43,28,1],8:[0,1,16,33,28,42,21,0],9:[0,0,11,10,29,47,23,21],10:[0,22,3,4,9,0,36,25],
    11:[0,21,11,4,3,0,35,26],12:[0,16,9,1,0,0,35,20],13:[0,28,12,28,0,43,24,1],14:[0,1,17,37,27,41,23,0],15:[0,0,19,32,27,42,18,0],
    16:[0,0,15,6,28,41,27,24],17:[0,23,37,1,6,4,36,0],18:[0,0,42,0,0,0,39,30],19:[0,31,11,3,2,45,35,30],20:[0,29,17,31,4,43,26,0],
    21:[0,0,23,28,33,44,26,0],22:[0,0,17,28,34,38,20,0],23:[0,1,12,7,34,53,28,20],24:[0,24,9,10,6,1,29,24],25:[0,27,12,7,7,3,32,23],26:[91,28,3,0,4,0,0,0]
  };
  const CAR_CORTE = ms('2026-10-26', 12, 12, 18);

  const caracolito = once('caracolito', () => {
    const rng = RNG(2203);
    const used = new Set(CAR_NAMES.map(n => n[0]));
    const fillers = fillerNames(rng, 110, used, true).map(n => [n, rng.pick(CAR_POS_EXTRA)]);
    const people = [...CAR_NAMES, ...fillers].map(([nombre, pos], i) => {
      const adm = rng() < 0.08;
      return person(rng, nombre, {
        pos, funcion:funcion(pos), zona:zonaDe(pos, rng), tipoCargo:adm ? 'Administrativo' : 'Operativo',
        rotacion:adm ? 'No rota' : (i % 3 ? 'Rota' : 'No rota'), area:funcion(pos).split(' ')[0], planta:'Caracolito'
      });
    });
    const days = isoRange('2026-09-16', '2026-10-26');
    const rows = [];
    let weekKey = null, order = people;
    days.forEach(iso => {
      const df = dateFields(iso);
      const wk = df.anio + '-' + df.mes + '-' + df.semana;
      if (wk !== weekKey) { weekKey = wk; order = rng.shuffle(people); }
      /* Septiembre no aparece en la captura: se usa el mismo patrón semanal de octubre */
      const base = df.mes === 'octubre' ? CAR_OCT[df.diaNum] : CAR_OCT[((df.diaNum + 3) % 25) + 1];
      let idx = 0;
      CAR_ORDER.forEach((tk, ti) => {
        const turno = CAR_T[tk];
        for (let n = 0; n < base[ti]; n++) {
          const p = order[idx++ % order.length];
          const r = Object.assign({}, df, {
            nombre:p.nombre, ced:p.ced, cod:p.cod, pos:p.pos, funcion:p.funcion, tipoCargo:p.tipoCargo, rotacion:p.rotacion,
            area:p.area, planta:p.planta, turno, tk, _i:rows.length, zonaIng:p.zona, zonaSal:'', estado:'Fuera de planta',
            ingreso:null, salida:null, horas:0, extD:0, extN:0, recN:0, recD:0, extSab:0, redD:0, redN:0, aux:0, sextoD:0, sextoN:0,
            solic:null, tipoSolic:'', just:'', turnoVis:''
          });
          const jit = (m1, m2) => rng.int(m1 * 60, m2 * 60) * 1000;
          if (tk === 'EP') {
            r.ingreso = ms(iso, 6, rng.int(33, 54), rng.int(0, 59)); r.salida = CAR_CORTE; r.horas = 5; r.estado = 'En planta'; r.turnoVis = '7:00 - 15:00';
          } else if (tk === 'OT') {
            /* Jornada sin salida: la "salida" queda en la hora del corte y las horas se disparan */
            const sinIng = rng() < 0.08;
            r.ingreso = sinIng ? null : ms(iso, rng.pick([6, 6, 6, 7, 7, 12, 15, 19]), rng.int(0, 59), rng.int(0, 59));
            r.salida = sinIng ? null : CAR_CORTE;
            r.horas = sinIng ? 0 : Math.round((CAR_CORTE - r.ingreso) / 3600000);
            r.extD = Math.round(r.horas * 0.537);
            r.extN = Math.round(r.horas * 0.455);
            r.estado = iso === '2026-10-26' ? 'En planta' : 'Fuera de planta';
            r.turnoVis = r.ingreso ? `${new Date(r.ingreso).getHours()}:00 - 15:00` : '';
          } else if (tk === 'NO') {
            r.ingreso = ms(iso, 0) - 1.5 * 3600000 + jit(0, 28);
            r.salida = ms(iso, 7) + jit(-2, 13); r.horas = 7.5; r.recN = 7; r.redN = 3; r.aux = 1; r.turnoVis = '23:00 - 7:00';
            r.zonaSal = rng() < 0.3 ? p.zona : '';
          } else if (tk === 'D12') {
            r.ingreso = ms(iso, 6, rng.int(38, 59), rng.int(0, 59)); r.salida = ms(iso, 19) + jit(-5, 20); r.horas = 12; r.extD = 3; r.aux = 1; r.turnoVis = '7:00 - 19:00';
          } else if (tk === 'N12') {
            r.ingreso = ms(iso, -5) + jit(-20, 8); r.salida = ms(iso, 7) + jit(-5, 15); r.horas = 12; r.extN = 3; r.recN = 9; r.aux = 1; r.turnoVis = '19:00 - 7:00';
          } else if (tk === 'AD') {
            r.ingreso = ms(iso, 6, rng.int(40, 59), rng.int(0, 59)); r.salida = ms(iso, 16, 30) + jit(-5, 25); r.horas = 9.5; r.turnoVis = '7:00 - 16:30';
            if (df.nombreDia === 'sábado') r.extSab = 4;
          } else if (tk === 'MA') {
            r.ingreso = ms(iso, 6, rng.int(38, 59), rng.int(0, 59)); r.salida = ms(iso, 15) + jit(-5, 25); r.horas = 8; r.turnoVis = '7:00 - 15:00';
          } else {
            r.ingreso = ms(iso, 14, rng.int(38, 59), rng.int(0, 59)); r.salida = ms(iso, 23) + jit(-5, 15); r.horas = 8; r.recN = 4; r.redN = rng() < 0.2 ? 1 : 0; r.turnoVis = '15:00 - 23:00';
          }
          if (df.festivo && tk !== 'OT' && tk !== 'EP') r.recD = r.horas >= 8 ? 8 : Math.round(r.horas);
          if (tk !== 'OT' && tk !== 'EP' && rng() < 0.03) { r.solic = rng.pick([4, 8, 8, 10, 24]); r.tipoSolic = rng.pick(['Horas extras diurnas', 'Horas Extra Nocturnas']); r.just = rng.pick(['Capacitación', 'Contingencia operacional', 'Mantenimiento programado']); }
          if (tk !== 'OT' && tk !== 'EP' && rng() < 0.012) r.sextoN = rng.int(1, 3);
          r.codTxt = String(p.cod);
          r.domHab = p.rotacion === 'Rota' ? r.recD : 0;
          r.domOc = p.rotacion === 'Rota' ? 0 : r.recD;
          r.descanso = '';
          rows.push(r);
        }
      });
    });
    /* Errores: nombres y fechas de LocoNomina/2.png */
    const errores = [['2026-09-03','RIOS RIVERA JOSE GUILLERMO'],['2026-09-04','MARTINEZ MEDINA SUAMY NATALIA'],['2026-09-04','MENDOZA ROZO ELKIN ARBEY'],['2026-09-04','RIOS RIVERA JOSE GUILLERMO'],['2026-09-04','SUAREZ PEÑA JOSE ALBERTO'],['2026-09-06','ORTIZ MANRIQUE LUIS DARIO'],['2026-09-08','ARCINIEGAS ESPARZA BLADIMIR'],['2026-09-09','RIOS RIVERA JOSE GUILLERMO'],['2026-09-11','SUAREZ PEÑA JOSE ALBERTO']]
      .map(([iso, nombre], i) => Object.assign({}, dateFields(iso), { nombre, ced:rng.int(1000000000, 1199999999), tipoJ:'Error', tipoError:i % 3 ? 'No hizo ingreso' : 'No hizo salida', turno:CAR_T.OT, planta:'Caracolito' }));
    const v = (iso, nombre, area, cargo, lugar, com, met, ced) => Object.assign({}, dateFields(iso), { nombre, ced, area, cargo, lugar, com, met, tipoV:'Visitante', planta:'Caracolito' });
    const visitantes = [
      v('2026-10-26','', '', '', '', '', '', null),
      v('2026-10-07','CARLOS PULIDO','OFICINA DE RHH','GESTOR DE FLOTA','CEMEX','INGRESA A CARGO DE LA ING LEIDY LOMBO','Ingreso',1030000111),
      v('2026-10-26','CLARK JEFFERSON LOPEZ VILLATE','CDS','GERENTE LOGISTICO','CEMEX','INGRESA A CARGO DE LA ING LEIDY GOMEZ','Ingreso',79700222),
      v('2026-10-13','GUILLERMO MELO','CDS','GESTOR DE FLOTA','CEMEX','INGRESA A CARGO DE LEIDY GOMEZ','Ingreso',79000333),
      v('2026-10-13','JHON JAIRO GIRALDO','ADMINISTRACION','LIDER DE PLANEACION MINERA','CEMEX','','Salida',79500444),
      v('2026-10-13','JHON JAIRO GIRALDO RAMIREZ','MINAS','LIDER DE PLANEACION MINERA','CEMEX','INGRESA A CARGO DE MARYORY CARDENAS','Ingreso',79500444),
      v('2026-10-14','JOHANA ALBA SANCHEZ','ADMINISTRATIVA','PGR','CEMEX','INGRESA A CARGO DE LA ENFERMERA DAGNE DUARTE','Ingreso',1022000555)
    ];
    return { rows, errores, visitantes, corte:CAR_CORTE, people };
  });

  /* Permisos / Horas Extras PTA — totales exactos de LocoNomina/4.png */
  const permisos = once('permisos', () => {
    const rng = RNG(3307);
    const SUP = 'JEFFERSON MIGUEL CASTILLO MONTALVO';
    const CAP = 'Capacitación de turno', CON = 'Contingencia operacional', MAN = 'Mantenimiento programado';
    const TIP = ['001061 HORAS EXTRAS DIURNAS','001062 HORAS EXTRAS NOCTURNAS','102500 DOMINGO Y/O FESTIVO OCASIONAL SIN COMPENSATORIO','102600 DOMINGO Y/O FESTIVO HABITUAL','104000 COMPENSATORIO NO DESCANSADO'];
    const OBS = { [CAP]:['Operacion empaque','Operacion polimat','Compensatorio no descansado','Compensatorio no trabajado','Turno empaque','APOYO CRUDO'], [CON]:['TURNO CRUDO 12 H','Apoyo horno'], [MAN]:['Parada programada molino','Mantenimiento correctivo'] };
    const META = [
      ['',[54.5,14,24]],['ALEGRIAS ORTIZ ALEX',[118,0,0]],['ANGARITA BUITRAGO,LUIS ERNESTO',[82,0,0]],['BERMUDEZ PUENTES,ANDRES CAMILO',[80,0,0]],
      ['BRICEÑO VEGA, DAVID LEONARDO',[0,4,0]],['CAMACHO GUTIERREZ WILMER JAVIER',[0,4.5,0]],['JIMENEZ MILLAN EDWIN JOSE',[0,0,24]],
      ['LUIS ANTONIO SUAREZ DELGADO',[32,0,0]],['MORENO ESCOBAR NELSON ENRIQUE',[65,0,0]],['SILVA DURAN, JERSON DAYAN',[115,0,0]],['VILLAMIZAR BOADA PABLO ANDRES',[47,0,0]]
    ];
    const sep = isoRange('2026-09-01', '2026-09-30');
    const rows = [];
    const add = (iso, nombre, horas, concepto, doc, cargo) => {
      const df = dateFields(iso), ini = ms(iso, rng.pick([6, 6, 6, 22, 15]));
      rows.push(Object.assign({}, df, {
        doc, nombre, area:nombre ? 'PRODUCCION' : '', tipoCargo:nombre ? 'Operativo' : '', cargo, supervisor:nombre ? SUP : '', empresa:nombre ? rng.pick(['CEMEX COLOMBIA,SA.', 'PTA']) : '',
        turno:rng.pick(['Turno Mañana', 'Turno Tarde', 'Nocturno-Amanecida']), inicio:ini, fin:ini + horas * 3600000, horas, concepto, obs:rng.pick(OBS[concepto]), tipoExtra:rng.pick(TIP)
      }));
    };
    const split = (iso0, total, cb) => { let left = total, d = iso0; while (left > 0) { const h = Math.min(left, rng.pick([8, 8, 8, 4, 16])); cb(d, h); left -= h; d = rng.pick(sep); } };
    META.forEach(([nombre, vals]) => {
      const doc = nombre ? rng.int(1000000000, 1199999999) : null;
      const cargo = rng.pick(['OPERARIO II', 'OPERARIO III', 'CONDUCTOR DE SENCILLO', 'AYUDANTE INDUSTRIAL DE EMPAQUE']);
      [CAP, CON, MAN].forEach((c, ci) => { if (vals[ci]) split(rng.pick(sep), vals[ci], (d, h) => add(d, nombre, h, c, doc, cargo)); });
    });
    /* Octubre: inventado, para que el filtro de Mes cambie de verdad */
    META.slice(1, 8).forEach(([nombre]) => {
      const doc = rng.int(1000000000, 1199999999);
      for (let i = 0; i < 3; i++) add(rng.pick(isoRange('2026-10-01', '2026-10-26')), nombre, rng.pick([4, 8]), rng.pick([CAP, CAP, MAN]), doc, 'OPERARIO II');
    });
    rows.sort((a, b) => a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);
    rows.forEach((r, i) => { r._i = i; });
    return { rows };
  });

  /* =======================================================================
     PORTERÍA — capturas LocoPorteria
     ======================================================================= */
  const COL = 'CEMEX COLOMBIA,SA.', TRA = 'CEMEX TRANSPORTE DE COLOMBIA', PTA = 'PTA';
  const POR_CORTE = ms('2026-11-05', 15, 15, 33);
  const POR_SALIDA = ms('2026-11-05', 15, 10, 48);
  const areaPor = pos => /CONDUCTOR|FLOTA/.test(pos) ? 'Transporte' : /MANTENIMIENTO|MECANICO/.test(pos) ? 'Mantenimiento' : /INGENIERO|COORDINADOR|PRACTICANTE|APRENDIZ/.test(pos) ? 'Administrativa' : 'Producción';

  const porteria = once('porteria', () => {
    const rng = RNG(4409);
    const hoy = '2026-11-05', dfHoy = dateFields(hoy);
    const mk = (nombre, pos, empresa, ingH, ingM, horas, turno, estado, curso, placa, salida) => {
      const p = person(rng, nombre, {});
      const ing = ingH < 0 ? ms('2026-11-04', 24 + ingH, ingM, rng.int(0, 59)) : ms(hoy, ingH, ingM, rng.int(0, 59));
      return Object.assign({}, dfHoy, { nombre, ced:p.ced, cod:p.cod, pos, empresa, ingreso:ing, salida:salida || POR_SALIDA, horas, turno, estado, curso, placa:placa || '', comentario:'', planta:'Caracolito', area:areaPor(pos), almuerzo:'' });
    };
    /* Jornada tiempo real: 14 filas de 1.1.png */
    const hoyRows = [
      mk('OSORIO PINO, MARTIN NARCISO','OPERARIO II',COL,-2,55,16,'Otro / Error','En planta','2026-07-19'),
      mk('MARQUEZ MACIAS, ANGEL JAVIER','OPERADOR COP',COL,-2,51,16,'Otro / Error','En planta','2027-01-16'),
      mk('HIGUERA CARRILLO, DEVIN ALEXANDER','CONDUCTOR DE SENCILLO',TRA,5,18,10,'En planta','En planta',null),
      mk('CAÑAS LUCAS, DIEGO ANTONIO','OPERARIO II',COL,4,41,10,'En planta','En planta','2026-03-12'),
      mk('GOMEZ OJEDA, RONNY ALEXANDER','CONDUCTOR DE SENCILLO',TRA,5,17,10,'En planta','En planta','2026-05-27'),
      mk('GARCIA GOMEZ, CARLOS EDUARDO','OPERARIO II',COL,4,48,10,'En planta','En planta','2026-10-25'),
      mk('RODRIGUEZ ORTIZ, WILSON','OPERARIO III',COL,5,6,10,'En planta','En planta','2026-11-05'),
      mk('VALENCIA PINEDA, JUAN DAVID','SUPERVISOR DE MANTENIMIENTO',COL,5,6,10,'En planta','En planta','2026-11-17'),
      mk('CONTRERAS CONTRERAS, CHRISTIAN SNEYDER','CONDUCTOR DE SENCILLO',TRA,5,17,10,'En planta','En planta','2027-01-09','FAV78S'),
      mk('LEAL GELVIS, JHON JAIRO','OPERARIO III',COL,4,58,10,'En planta','En planta','2027-02-17'),
      mk('PULIDO VELASCO, CARLOS ANDRES','COORDINADOR DE FLOTA',COL,5,43,9,'En planta','En planta',null),
      mk('HERNANDEZ PUERTO, YHONATAN JAVIER','CONDUCTOR DE SENCILLO',TRA,5,39,9,'En planta','En planta','2026-12-09'),
      mk('GUERRERO SEPULVEDA, RAMON DAVID','OPERARIO III',COL,6,50,8,'Día','Fuera de planta','2027-01-11','',ms(hoy, 15, 1, 30)),
      mk('SARMIENTO ROJAS, OSCAR LEONARDO','CONDUCTOR DE TRACTOMULA',TRA,7,1,8,'Día','Fuera de planta','2026-12-10','',ms(hoy, 15, 4, 30))
    ];
    /* Detalle de almuerzo (2.1.png) */
    const alm = [
      ['CARVAJAL SUAREZ, JESSICA ANDREINA',COL,7,26,2],['SALAS RAMIREZ, OSCAR',COL,6,3,7],['SILVA DURAN, JERSON DAYAN',PTA,6,53,8],['RICO PABON, WILLIAM ALEXIS',COL,6,48,8],['QUINTERO GUTIERREZ, ALEXANDER',COL,6,40,8],['ANGARITA BUITRAGO,LUIS ERNESTO',PTA,6,51,8],['BERMUDEZ PUENTES,ANDRES CAMILO',PTA,6,51,8],['HERNANDEZ CORREA, YULY ANDREA',COL,6,38,8],['LASPRILLA GALAN, SHEILY VALENTINA',COL,6,47,8],['ARDILA RADA, ERLIN ANDRES',COL,6,41,8],['BARRAGAN SANGUINO, ANDERSON ALEXIS',COL,6,44,8],['BRICEÑO BORJA, WINTER JESUS',COL,6,53,8],['BRICEÑO VEGA, DAVID LEONARDO',PTA,6,46,8],['BUCURU YARA, CRISTIAN DANILO',COL,6,38,8],['CAMACHO GUTIERREZ WILMER JAVIER',COL,6,44,8],['CAMACHO NEIRA, VALENTINA',COL,6,46,8],['CAMARGO MELGAREJO, JERSON ANDRES',COL,6,36,8],['CARDENAS GOMEZ, MARYURI YARITZA',COL,6,44,8],['CARRERO TOSCANO, JOSE ANDRES',COL,7,25,8]
    ];
    const used = new Set([...hoyRows.map(r => r.nombre), ...alm.map(a => a[0])]);
    const POS = ['OPERARIO II','OPERARIO III','CONDUCTOR DE SENCILLO','CONDUCTOR DE TRACTOMULA','AYUDANTE INDUSTRIAL DE EMPAQUE','OPERADOR COP'];
    alm.forEach(([n, emp, h, m, hrs]) => {
      const r = mk(n, rng.pick(POS), emp, h, m, hrs, hrs < 8 ? 'Día' : 'En planta', hrs < 8 ? 'Fuera de planta' : 'En planta', rng() < 0.15 ? null : '2027-0' + rng.int(1, 9) + '-1' + rng.int(0, 9));
      hoyRows.push(r);
    });
    const faltan = 98 - hoyRows.length;
    const extra = fillerNames(rng, faltan, used, true).map(n => n.split(' ')).map(x => `${x[0]} ${x[1]}, ${x[2]} ${x[3]}`);
    extra.forEach(n => {
      const emp = rng.pick([COL, COL, COL, TRA, PTA]);
      const dia = rng() < 0.12;
      const r = mk(n, rng.pick(POS), emp, rng.int(5, 7), rng.int(0, 59), dia ? 8 : rng.pick([7, 8, 8, 8, 9]), dia ? 'Día' : 'En planta', dia ? 'Fuera de planta' : 'En planta', rng() < 0.12 ? null : '2027-0' + rng.int(1, 9) + '-1' + rng.int(0, 9));
      if (dia) r.salida = ms(hoy, 15, rng.int(0, 9), rng.int(0, 59));
      hoyRows.push(r);
    });
    /* Ajuste exacto a los totales de 1.1.png: 76 activos y 20 turnos terminados */
    let enPlanta = hoyRows.filter(r => r.estado === 'En planta');
    let fuera = hoyRows.filter(r => r.estado !== 'En planta');
    while (fuera.length < 22) { const r = enPlanta.pop(); if (r.turno === 'Otro / Error') { enPlanta.unshift(r); continue; } r.turno = 'Día'; r.estado = 'Fuera de planta'; r.salida = ms(hoy, 15, rng.int(0, 9), rng.int(0, 59)); fuera.push(r); }
    while (fuera.length > 22) { const r = fuera.pop(); r.turno = 'En planta'; r.estado = 'En planta'; r.salida = POR_SALIDA; enPlanta.push(r); }
    /* Dos filas del total no marcan ni activo ni terminado (como en la captura: 98 = 76 + 20 + 2) */
    fuera.slice(-2).forEach(r => { r.turno = 'Otro / Error'; r.estado = 'Sin definir'; r.horas = 0; });
    /* Almuerzos: mañana 66 (8 PTA, 55 CEMEX, 3 sin empresa) y tarde 11 (2 PTA, 9 CEMEX) */
    const orderAlm = [...hoyRows.slice(14), ...hoyRows.slice(2, 14)];
    const relleno = new Set(hoyRows.slice(33));
    const asigna = (n, marca, empresa) => {
      const vale = empresa === PTA ? (r => r.empresa === PTA) : empresa === '' ? (() => false) : (r => r.empresa && r.empresa !== PTA);
      let c = 0;
      for (const r of orderAlm) if (c < n && !r.almuerzo && vale(r)) { r.almuerzo = marca; c++; }
      for (const r of orderAlm) if (c < n && !r.almuerzo && relleno.has(r)) { r.empresa = empresa === PTA || empresa === '' ? empresa : COL; r.almuerzo = marca; c++; }
    };
    asigna(8, 'Mañana', PTA);
    asigna(3, 'Mañana', '');
    asigna(2, 'Tarde', PTA);
    asigna(55, 'Mañana', COL);
    asigna(9, 'Tarde', COL);
    hoyRows.filter(r => r.almuerzo === 'Tarde').forEach(r => { r.ingreso = ms(hoy, rng.int(12, 14), rng.int(0, 59), rng.int(0, 59)); r.horas = Math.round((r.salida - r.ingreso) / 3600000); });
    hoyRows.forEach((r, i) => { r._i = i; r.realtime = true; });

    /* Historia: filas de 3.png (sin salida, las horas se disparan) + jornadas normales inventadas */
    const hist = [];
    const open = [
      ['2026-07-17','PARRA OCHOA, ARMANDO','CONDUCTOR DE TRACTOMULA',TRA,'2027-03-11','CWD248',13],['2026-08-03','CONTRERAS CHACON, JAHIR LISANDRO','APRENDIZ SENA',COL,null,'',7],['2026-08-03','SANGUINO AREVALO, NATALIA','PRACTICANTE',COL,null,'',7],['2026-08-03','',' ','',null,'',8],['2026-08-03','GUEVARA VARGAS, ANGIE','APRENDIZ SENA',COL,null,'',8],['2026-08-10','SANGUINO AREVALO, NATALIA','PRACTICANTE',COL,null,'',6],['2026-08-11','','','',null,'',10],['2026-08-13','FLOREZ GARCIA, JOSE IGNACIO','OPERARIO II',COL,'2026-06-07','',6],['2026-08-14','','','',null,'',6],['2026-08-14','BUITRAGO ROLON JHON DAYRON','AYUDANTE INDUSTRIAL DE EMPAQUE',PTA,null,'',14],['2026-08-18','OSORIO PINO, MARTIN NARCISO','OPERARIO II',COL,'2026-07-19','',11],['2026-08-18','MANTILLA BELTRAN, IRWIN MAURICIO','OPERADOR COP',COL,'2026-02-19','',14],['2026-08-20','CARRERO TOSCANO, JOSE ANDRES','COORDINADOR MEDIO AMBIENTE',COL,'2026-11-04','',7],['2026-08-22','CELIS VASQUEZ FRANK SEBASTIAN','PRACTICANTE',COL,null,'',18],['2026-08-23','NIÑO GONZALES, JHERSSON GABRIEL','INGENIERO DE PROGRAMACION Y CONTROL',COL,'2026-11-05','TBQ17F',14],['2026-08-27','RICO PABON, WILLIAM ALEXIS','OPERARIO II',COL,'2026-07-16','',22],['2026-08-28','NIÑO GONZALES, JHERSSON GABRIEL','INGENIERO DE PROGRAMACION Y CONTROL',COL,'2026-11-05','TBQ17F',10],['2026-08-31','','','',null,'',7],['2026-09-01','PARRA OCHOA, ARMANDO','CONDUCTOR DE TRACTOMULA',TRA,'2027-03-11','CWD248',7],['2026-09-01','GOMEZ OJEDA, RONNY ALEXANDER','CONDUCTOR DE SENCILLO',TRA,'2026-05-27','',6],['2026-09-01','ARCINIEGAS ESPARZA, BLADIMIR','OPERARIO II',COL,null,'',7]
    ];
    open.forEach(([iso, nombre, pos, empresa, curso, placa, h]) => {
      const p = person(rng, nombre || 'x', {}), ing = ms(iso, h, rng.int(0, 59), rng.int(0, 59));
      hist.push(Object.assign({}, dateFields(iso), { nombre, ced:p.ced, cod:nombre ? p.cod : null, pos, empresa, ingreso:ing, salida:POR_SALIDA, horas:Math.round((POR_SALIDA - ing) / 3600000), turno:'Otro / Error', estado:'Fuera de planta', curso, placa, comentario:'', planta:'Caracolito', area:nombre ? areaPor(pos) : '' }));
    });
    const base = hoyRows.filter(r => r.nombre && r.turno !== 'Otro / Error');
    isoRange('2026-08-01', '2026-11-04').forEach(iso => {
      const df = dateFields(iso), prob = df.festivo ? 0.35 : 0.72;
      base.forEach(b => {
        if (rng() > prob) return;
        const ing = ms(iso, rng.int(5, 7), rng.int(0, 59), rng.int(0, 59)), hrs = rng.pick([8, 8, 8, 9, 10]);
        hist.push(Object.assign({}, df, { nombre:b.nombre, ced:b.ced, cod:b.cod, pos:b.pos, empresa:b.empresa, ingreso:ing, salida:ing + hrs * 3600000, horas:hrs, turno:'Día', estado:'Fuera de planta', curso:b.curso, placa:b.placa, comentario:'', planta:'Caracolito', area:b.area }));
      });
    });
    hist.push(...hoyRows);
    hist.forEach((r, i) => { r._i = i; });

    /* Error: LocoPorteria/2.1.png */
    const errores = [['2026-07-03',''],['2026-07-16','LOMBO RODRIGUEZ, LEIDY JHOANA'],['2026-08-01',''],['2026-08-03','VALENCIA PINEDA, JUAN DAVID'],['2026-08-12','CAMACHO NEIRA, VALENTINA'],['2026-08-12','QUINTERO GUTIERREZ, ALEXANDER'],['2026-08-13','ARDILA RADA, ERLIN ANDRES'],['2026-08-19','RICO PABON, WILLIAM ALEXIS'],['2026-09-02','BRICEÑO BORJA, WINTER JESUS'],['2026-10-07','CARRERO TOSCANO, JOSE ANDRES']]
      .map(([iso, nombre]) => Object.assign({}, dateFields(iso), { nombre, tipoJ:'Error', tipoError:'No hizo ingreso', planta:'Caracolito', turno:'Otro / Error' }));
    return { hoy:hoyRows, hist, errores, visitantes:[], corte:POR_CORTE };
  });

  /* =======================================================================
     TABLERO PRINCIPAL — pestañas Nómina (loc12–13) y Ocupacion_As (loc14–21)
     ======================================================================= */
  const MAIN_CLUSTERS = [
    ['Antioquia', ['Bello','Medellín','Rionegro']],
    ['Centro', ['170','240','Bombeo/Colocación','Bosa','Centenario','El Dorado','ML1 PHC','Puente Aranda','Soacha','Sur','Taller Centenario','Tocancipa']],
    ['Occidente', ['Cali Sur','Pereira','Tulua']],
    ['Santander', ['Cucuta','Floridablanca']],
    ['Sur_oriente', ['Fusagasuga','Ibague','Sumapaz']]
  ];
  LD.MAIN_CLUSTERS = MAIN_CLUSTERS;
  const clusterOf = {};
  MAIN_CLUSTERS.forEach(([c, ps]) => ps.forEach(p => { clusterOf[p] = c; }));
  const NOM_NAMES = [
    ['CRISTIAN CAMILO HERNANDEZ ALARCON','Bombeo/Colocación'],['DANNY ALEJANDRO TELLEZ CAMARGO','Cali Sur'],['DUBER ALBERTO CARRANZA CONTRERAS','Puente Aranda'],['GENSY STIVEL TRIANA LADINO','Tulua'],['JOHANN MARTIN LIZARAZO APARICIO','Puente Aranda'],['ROA VEGA FABIAN ALBERTO','Tulua'],['ACERO GUTIERREZ, FERNANDO','Ibague'],['ACEVEDO CABALLERO MIGUEL ANGEL','240'],['AGUDELO LEÓN, JULIAN MANUEL','170'],['AGUILAR CAMACHO WILSON','Puente Aranda'],['AGUILERA ROA, OSCAR DAVID','Taller Centenario'],['ALBER JAIR MARTELO CARMONA','Bello'],['ALCALA PAVA, LEONARDO','Ibague'],['ALDANA RESTREPO, DANIELA','Bello'],['ALEXIS FARFAN','Taller Centenario'],['ALVARADO MORENO, WILLIAM AUGUSTO','Cali Sur'],['ALVAREZ CAÑAVERAL LUIS FELIPE','Puente Aranda'],['ALVAREZ HIGUERA, MARCOS ELIAS','Floridablanca'],['AMADO GARNICA, BRIGADIER','Floridablanca'],['AMAYA HERRERA WILSON EDUARDO','Centenario'],['AMAYA SOSA JOHANNA ANDREA','Sur'],['AMU AGUILAR DUVÁN','Cali Sur'],['ANAYA CASTRO GABRIEL ANTONIO','Cali Sur'],['ANDRES FABIAN HERRERA GARZON','El Dorado'],['ANDRES FELIPE BENAVIDES ROJAS','Sur'],['ANGARITA PEREZ, LUIS EMEL','Tulua'],
    ['VICTOR ARMANDO PALACIO VELASQUEZ','170'],['HERNANDEZ CASTRO, ELKIN','170'],['SUA AFRICANO JUAN SEBASTIAN','240'],['MORON HERNANDEZ, HERNAN SEGUNDO','240'],['RIOS MARQUEZ, JAIR ALBEIRO','Bello'],['ROJAS OCHOA, HERIBERTO','Bello'],['BEDOYA LONDOÑO, JEFERSON ANDRES','Bello'],['RUA CASTAÑO YESSICA','Bello'],['JHAN CARLOS CESPEDES HENAO','Bello'],['DIAZ BERMEO, ROBER ALFONSO','Cali Sur'],['JULIO ARRIETA, ALVARO JOSE','Cali Sur'],['TORRES ARIAS, ALEJANDRO FIDEL','Cali Sur'],['SANDOVAL SANDOVAL, DUBERLEY','Cali Sur'],['LOAIZA RÍOS DARWIN HERNANDO','Cali Sur']
  ];
  const mainRoster = once('mainRoster', () => {
    const rng = RNG(5511);
    const used = new Set(NOM_NAMES.map(n => n[0]));
    const plants = MAIN_CLUSTERS.flatMap(([, ps]) => ps);
    const weights = { 'Puente Aranda':3, Centenario:2, 'Cali Sur':2, Bello:2, Floridablanca:2, Sur:2, 'El Dorado':2 };
    const pool = plants.flatMap(p => Array(weights[p] || 1).fill(p));
    const fill = fillerNames(rng, 430, used, true).map(n => [n, rng.pick(pool)]);
    return [...NOM_NAMES, ...fill].map(([n, planta]) => person(rng, n, { planta, cluster:clusterOf[planta] }));
  });

  const mainNomina = once('mainNomina', () => {
    const rng = RNG(6613);
    const people = mainRoster();
    const days = isoRange('2026-10-05', '2026-10-12');
    const T = [['Turno A', 447, 'A'],['Turno B', 52, 'B'],['Turno C', 15, 'C'],['Turno D', 444, 'D'],['Otro / Error', 1484, 'Otro / Error'],['12h Noc', 1, 'Turno 12H Noche'],['12h Dia', 294, 'Turno 12H Día']];
    const bag = rng.shuffle(T.flatMap(([, n, t]) => Array(n).fill(t)));
    const rows = [];
    let b = 0;
    const totalSlots = bag.length;
    /* Los festivos tienen poca gente (loc12: 64 dominicales diurnos y 23 nocturnos) */
    const FEST = 44, normales = days.filter(d => !dateFields(d).festivo).length;
    const perDay = Math.ceil((totalSlots - FEST * (days.length - normales)) / normales);
    days.forEach(iso => {
      const df = dateFields(iso), today = rng.shuffle(people).slice(0, df.festivo ? FEST : perDay);
      today.forEach((p, ti) => {
        if (b >= totalSlots) return;
        const turno = bag[b++];
        const r = Object.assign({}, df, {
          nombre:p.nombre, ced:p.ced, cod:p.cod, planta:p.planta, cluster:p.cluster, turno, tipoJ:'Diurna', semana:3, _i:rows.length,
          horas:0, extD:0, extN:0, extDD:0, recN:0, recD:0, recDN:0, domD:0, domN:0, jornN:0, may12:0, w1061:0, w1062:0
        });
        const set = (h, m, hrs) => {
          r.ingreso = ms(iso, h, m, rng.int(0, 59));
          r.salida = r.ingreso + hrs * 3600000 + rng.int(-900, 900) * 1000;
          r.horas = hrs;
        };
        if (turno === 'A') set(6, rng.int(30, 59), 8);
        else if (turno === 'B') { set(14, rng.int(30, 59), 8); r.recN = 4; r.jornN = 1; }
        else if (turno === 'C') { set(22, rng.int(30, 59), 8); r.recN = 7; r.jornN = 1; }
        else if (turno === 'D') set(6, rng.int(30, 59), 9.5);
        else if (turno === 'Turno 12H Día') { set(6, rng.int(0, 45), 12); r.may12 = 1; r.extD = rng() < 0.6 ? 2 : 0; }
        else if (turno === 'Turno 12H Noche') { set(18, rng.int(30, 59), 12); r.recN = 9; r.may12 = 1; r.jornN = 1; }
        else { const hrs = rng.pick([8, 8, 8.5, 9, 9.5, 10, 11, 8]); set(rng.int(5, 8), rng.int(0, 59), hrs); r.extD = hrs > 9.5 && rng() < 0.45 ? 1 : 0; r.extN = rng() < 0.2 ? rng.int(1, 3) : 0; r.recN = rng() < 0.35 ? rng.int(1, 4) : 0; r.jornN = rng() < 0.05 ? 1 : 0; }
        if (df.festivo) {
          /* loc13: 448 h de recargo dominical y 60 de dominical nocturno; las primeras filas llevan el recargo */
          if (ti < FEST * 0.64) r.recD = 8;
          if (rng() < 0.27) { r.domN = 1; r.recDN = rng.int(2, 3); } else r.domD = 1;
        }
        rows.push(r);
      });
    });
    /* Horas Extras Semanal 1061 (total 24 en la captura) */
    const firsts = [...LD.group(rows, r => r.nombre).values()].map(l => l[0]);
    rng.shuffle(firsts).slice(0, 8).forEach(r => { r.w1061 = 3; });
    return { rows };
  });

  /* Ocupación vs Productividad (agosto) — valores exactos de las gráficas loc14, loc19, loc20 */
  const OCU_TARGET = [
    /* planta, cluster, %ocup, prod, encol, preop, postop, 0 viajes, 1 viaje */
    ['(En blanco)','(En blanco)',68.40,9.4,1.03,1.07,0.79,8,3],['Bello','Antioquia',74.59,16.2,0.85,1.07,1.12,7,12],['Medellín','Antioquia',77.39,15.6,1.01,0.85,0.89,4,8],['Rionegro','Antioquia',56.62,16.5,0.51,0.66,0.83,5,5],
    ['170','Centro',76.29,14.0,0.99,0.88,0.99,3,10],['240','Centro',74.98,16.0,0.89,1.13,1.31,1,6],['Bosa','Centro',78.12,13.3,0.70,1.41,1.20,3,6],['Centenario','Centro',71.57,14.6,1.04,1.32,1.04,10,22],['El Dorado','Centro',78.65,18.0,1.32,0.90,1.08,3,13],['ML1 PHC','Centro',87.15,16.7,1.19,1.41,0.94,3,4],['Puente aranda','Centro',76.47,15.1,0.75,1.02,1.06,19,39],['Soacha','Centro',82.66,13.1,0.55,1.02,0.70,1,5],['Sur','Centro',79.65,12.3,0.74,0.73,0.84,7,16],['Tocancipa','Centro',83.44,16.4,0.87,0.86,0.74,6,10],
    ['Cali Sur','Occidente',66.44,12.9,0.47,0.81,0.90,15,13],['Pereira','Occidente',50.19,13.8,0.51,1.42,1.44,6,5],['Tulua','Occidente',71.84,13.8,0.71,1.38,0.52,4,4],
    ['Cucuta','Santander',null,10.8,null,null,null,0,1],['Floridablanca','Santander',69.95,18.7,1.28,1.00,0.99,11,15],
    ['Fusagasuga','Sur_oriente',70.76,15.5,1.12,1.09,1.12,1,3],['Ibague','Sur_oriente',75.76,21.2,1.68,0.90,0.78,4,4],['Sumapaz','Sur_oriente',71.96,13.0,1.64,1.30,0.96,1,2]
  ];
  LD.OCU_ORDER = OCU_TARGET.map(t => ({ planta:t[0], cluster:t[1] }));
  const OCU_NAMES = ['ACERO GUTIERREZ, FERNANDO','CASTIBLANCO GALVIS NELSON','CRISTIAN LOPEZ CANO','IVAN RICARDO ALVAREZ DIAZ','MANZANARES CARDENAS RAFAEL ENRIQUE','MEJIA GARCIA, DURIAN','OCAMPO CARMONA, SEBASTIAN','RAMIREZ GOMEZ DIEGO ANDRES','RIOS BASTIDAS, GUSTAVO ALONSO','SOTELO MARTINEZ, JOHN ALIRIO','URREGO RODRIGUEZ, HECTOR JOSE','CUESTA CASTILLO NELSON ALECXEY','DIAZ MORENO DERLY VANESSA','EDISSON CAMILO HERNANDEZ','PINZON CHAPARRO, ROGER IVAN','VALVUENA ZARABANDA MARLON DANIEL','AVILA HERRERA, YEISON CAMILO','BOHORQUEZ BETANCUR, ORFENIO DE JESUS','CAPACHO GAMBOA, GONZALO','CARDONA VERGARA, EDGAR EUGENIO','CRISTIAN CAMILO MEJIA SOLANO','DUBERNEY OROZCO','FONSECA POVEDA, HENRY ORLANDO','FORERO ACOSTA HERNANDO ALFONSO','GONGORA GARCIA, MARCO AURELIO','HENAO RENDON, SAUL','NARVÁEZ CASTILLO JORGE LUIS','OVALLE PACHECO SAUL','RIVERA BAUTISTA, JOSE FERMIN','SEBASTIAN ANDRES CARDONA SALAZAR','DANNY ALEJANDRO TELLEZ CAMARGO'];
  const OBRAS = ['SICILIA','COLEGIO LAS VEGAS','REGASIFICADORA DEL PACÍFICO','SERENE HABITARE DEBITO','ML1 WS3 WF6 CHEC S16-16 A S16 22','TORRES DEL PARQUE','HOSPITAL REGIONAL','VÍA PERIMETRAL ORIENTE','CENTRO LOGÍSTICO NORTE','PUENTE LA ESTACIÓN'];

  const ocupacion = once('ocupacion', () => {
    const rng = RNG(7717);
    const days = isoRange('2026-08-01', '2026-08-26');
    const roster = mainRoster();
    const usedN = new Set(OCU_NAMES);
    const ocuNames = [...OCU_NAMES, ...roster.map(p => p.nombre).filter(n => !usedN.has(n))];
    let nameI = 0;
    const rows = [], entre = [];
    OCU_TARGET.forEach(([planta, cluster, ocup, prod, encol, preop, postop, n0, n1]) => {
      const nPersonas = Math.max(6, Math.round((n0 + n1) * 0.65) + 5);
      const staff = [];
      for (let i = 0; i < nPersonas; i++) staff.push(person(rng, ocuNames[nameI++ % ocuNames.length], { planta, cluster }));
      const pRows = [];
      days.forEach(iso => {
        const df = dateFields(iso);
        staff.forEach(p => {
          if (rng() > (df.festivo ? 0.25 : 0.63)) return;
          const ing = ms(iso, rng.int(5, 8), rng.int(0, 59), rng.int(0, 59));
          const horas = 7 + rng() * 5;
          const r = Object.assign({}, df, {
            nombre:p.nombre, pos:'AGENTE DE SERVICIO', planta, plantaReg:planta === '(En blanco)' ? '' : planta, cluster, ced:p.ced, _i:0,
            ingreso:ing, salida:ing + horas * 3600000, jornadaFinal:'Diurna', horas, viajes:rng.int(2, 3)
          });
          pRows.push(r);
        });
      });
      /* Viajes: exactamente n0 jornadas con 0 viajes y n1 con 1 viaje (gráfica loc19) */
      const sh = rng.shuffle(pRows);
      sh.forEach((r, i) => { if (i < n0) r.viajes = 0; else if (i < n0 + n1) r.viajes = 1; });
      sh.slice(0, n0).forEach(r => { r.horas = Math.max(0.1, rng() * 11); r.salida = r.ingreso + r.horas * 3600000; });
      pRows.forEach(r => {
        const act = r.viajes > 0;
        r.vol = act ? r.viajes * (5 + rng() * 3) : 0;
        r.prod = act ? 8 + rng() * 14 : 0;
        r.ocup = act ? 50 + rng() * 45 : 0;
        r.integ = act ? 92 + rng() * 8 : 90 + rng() * 10;
        r.preop = act ? 0.2 + rng() * 1.5 : 0;
        r.postop = act ? 0.2 + rng() * 1.5 : 0;
        r.encol = act ? 0.1 + rng() * 2 : 0;
      });
      if (ocup != null) { calibrate(pRows, 'ocup', ocup, 100); calibrate(pRows, 'encol', encol); calibrate(pRows, 'preop', preop); calibrate(pRows, 'postop', postop); }
      calibrate(pRows, 'prod', prod);
      pRows.forEach(r => {
        const act = r.viajes > 0;
        if (ocup == null) { r.ocup = null; r.encol = 0; r.preop = 0.5; r.postop = 0.6; r.vol = 0; }
        r.ciclo = act ? r.horas * ((r.ocup || 60) / 100) - r.preop - r.postop : 0;
        if (r.ciclo < 0) r.ciclo = 0;
        r.cicloPP = r.ciclo + r.preop + r.postop;
        r.primerCargue = act ? r.ingreso + (r.preop + 0.05) * 3600000 : null;
        r.llegUltimo = act ? r.salida - r.postop * 3600000 : null;
        r.alist = act ? 16 + rng() * 14 : null;
        r.alistV = act ? Math.round(r.alist + rng() * 12) : null;
        r.entre = act ? rng.int(5, 40) : 0;
        r.regDesp = act && rng() < 0.08 ? 'Sí' : '';
        r.horaProg = '';
        r.horaMalla = '';
        r.pcMalla = '';
        r.horaEntrega = act ? r.primerCargue + rng.int(30, 110) * 60000 : null;
        r.horaEntMalla = '';
        r.llegObra = act ? r.horaEntrega + rng.int(-25, 40) * 60000 : null;
        r.obra = act ? rng.pick(OBRAS) : '';
        r.obraProg = '';
      });
      rows.push(...pRows);
      /* Tiempo entre viajes por hora: madrugada y noche altos, día bajo */
      const shape = h => h >= 3 && h <= 5 ? 100 + rng() * 100 : h >= 18 && h <= 21 ? 40 + rng() * 80 : h < 3 || h >= 22 ? 10 + rng() * 45 : 6 + rng() * 14;
      for (let h = 0; h < 24; h++) {
        if (ocup == null && h % 3) continue;
        for (let k = 0; k < 4; k++) {
          const iso = rng.pick(days), s = rng.pick(staff);
          entre.push(Object.assign({}, dateFields(iso), { planta, cluster, nombre:s.nombre, hora:h, gap:shape(h) }));
        }
      }
    });
    rows.forEach((r, i) => { r._i = i; });
    /* Primeros valores por hora visibles en loc21 */
    const FIX = { '(En blanco)':{0:51.33,1:22.90,4:65.21,5:41.88,7:10.59,11:12.17,15:10.74,19:33.49,23:19.56}, Bello:{4:154.23,6:32.81,7:8.31,9:6.73,13:8.97,16:16.11,18:56.76,19:92.25,21:128.00}, Medellín:{1:3.00,4:198.33,6:43.20,7:7.35,10:6.18,14:6.66,16:18.90,18:67.69,23:2.00}, Rionegro:{5:182.19,6:54.55,7:7.32,9:9.25,13:8.27,15:14.01,17:36.23,19:95.67,20:12.00}, 170:{0:46.33,2:10.60,4:52.00} };
    Object.entries(FIX).forEach(([pl, hs]) => Object.entries(hs).forEach(([h, v]) => {
      calibrate(entre.filter(e => e.planta === pl && e.hora === +h), 'gap', v);
    }));
    return { rows, entre };
  });

  LD.data = { cemento, caracolito, permisos, porteria, mainNomina, ocupacion, isoRange, dateFields };
  LD.CAR_T = CAR_T;
  LD.CAR_ORDER = CAR_ORDER;
  LD.CEM_TURNOS = CEM_TURNOS;
})();
