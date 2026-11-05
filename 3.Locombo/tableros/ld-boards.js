/* =========================================================================
   Definición de los tableros: qué filtros, tablas y gráficas lleva cada página.
   - LD.boards: Cemento, Caracolito, Portería y Nómina (Locomboo Cemento).
   - LD.main: pestañas Nómina y Ocupacion_As del tablero principal.
   Las referencias a imágenes son de Recursos/LocoCemento, LocoCaracolito,
   LocoPorteria, LocoNomina y Locombo/Tablero.
   ========================================================================= */
(function () {
  'use strict';
  const LD = window.LD, F = LD.F, D = LD.data, MESES = LD.MESES;
  const { sumBy, avgBy, group } = LD;

  /* ---------------- Atajos de columnas ---------------- */
  const blank0 = dec => v => (v ? F['n' + dec](v) : '');
  const T = (k, l, o) => Object.assign({ k, l }, o);
  const N2 = (k, l, o) => Object.assign({ k, l, num:1, f:F.n2 }, o);
  const N0 = (k, l, o) => Object.assign({ k, l, num:1, f:F.n0 }, o);
  const NB = (k, l, o) => Object.assign({ k, l, num:1, f:blank0(0), totF:F.n0 }, o);   // el 0 se ve vacío
  const DT = (k, l, o) => Object.assign({ k, l, f:F.dt }, o);
  const FE = (k, l, o) => Object.assign({ k, l:l || 'Fecha', f:F.d }, o || {});
  const COD = (o) => Object.assign({ k:'cod', l:'Cod_RRHH', num:1, f:F.cod }, o);
  const CED = (l) => ({ k:'ced', l:l || 'Cedula', num:1 });
  const SUM = { tot:'sum' };

  /* Colores de encabezado por grupo de medidas (capturas 7.1, 8.1, 10.1) */
  const H_VERDE = '#b9ecb7', H_ROJO = '#f4b9a8', H_AMAR = '#f2e38f', H_MORA = '#cbb8ec', H_AZUL = '#9fd0f5';

  /* ---------------- Filtros ---------------- */
  const dateTree = rows => {
    const years = new Map();
    rows.forEach(r => {
      if (!r.iso) return;
      if (!years.has(r.anio)) years.set(r.anio, new Map());
      const ms = years.get(r.anio);
      if (!ms.has(r.mes)) ms.set(r.mes, new Set());
      ms.get(r.mes).add(r.iso);
    });
    return [...years.keys()].sort().map(y => ({
      label:String(y),
      full:`${y} (Año)`,
      kids:[...years.get(y).keys()].sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b)).map(m => ({
        label:m,
        full:`${y} (Año) + ${m} (Mes)`,
        kids:[...years.get(y).get(m)].sort().map(iso => ({ label:String(+iso.slice(8, 10)), value:iso }))
      }))
    }));
  };
  const Fl = {
    planta:() => ({ key:'planta', field:'planta', label:'Nombre_planta', tip:'Filtra la página por planta. Puedes marcar una o varias.' }),
    clusterPlanta:() => ({
      key:'planta', field:'planta', label:'Cluster, Nombre_planta', tip:'Filtra por un cluster completo o por una o varias plantas dentro de él.',
      tree:rows => {
        const m = new Map();
        rows.forEach(r => { if (!r.cluster) return; if (!m.has(r.cluster)) m.set(r.cluster, new Set()); m.get(r.cluster).add(r.planta); });
        return [...m.keys()].sort().map(c => ({ label:c, kids:[...m.get(c)].sort().map(p => ({ label:p, value:p })) }));
      }
    }),
    fecha:(label, def) => ({ key:'iso', field:'iso', label:label || 'Año, Mes, Día', allLabel:'Selección múltiple', showValue:F.d, tree:dateTree, def, tip:'Elige un año, un mes o días sueltos. Al marcar un mes se seleccionan todos sus días.' }),
    semana:() => ({ key:'semana', field:'semana', label:'SemanaMes', tip:'Semana dentro del mes (1 a 5).' }),
    nombre:label => ({ key:'nombre', field:'nombre', label:label || 'NombreE', tip:'Muestra solo la información de una o varias personas.' }),
    turno:def => ({ key:'turno', field:'turno', label:'Tipo Turno', def, tip:'Filtra por el turno de la jornada.' }),
    tipoDia:() => ({ key:'tipoDia', field:'tipoDia', label:'TipoDia', tip:'Normal o Festivo/Domingo.' }),
    anio:def => ({ key:'anio', field:'anio', label:'Año', def, tip:'Filtra por año.' }),
    mes:def => ({ key:'mes', field:'mes', label:'Mes', order:MESES, def, tip:'Filtra por mes.' }),
    dia:() => ({ key:'diaNum', field:'diaNum', label:'Día', tip:'Filtra por día del mes.' }),
    tipoCargo:() => ({ key:'tipoCargo', field:'tipoCargo', label:'TipoCargo', tip:'Operativo o Administrativo.' }),
    rotacion:() => ({ key:'rotacion', field:'rotacion', label:'Rotacion', tip:'Personal que rota de turno o que no rota.' }),
    area:() => ({ key:'area', field:'area', label:'Area', tip:'Filtra por área.' }),
    empresa:() => ({ key:'empresa', field:'empresa', label:'Empresa', tip:'Empresa a la que pertenece la persona.' }),
    supervisor:() => ({ key:'supervisor', field:'supervisor', label:'Supervisor', tip:'Quien aprobó el permiso.' }),
    cargo:() => ({ key:'cargo', field:'cargo', label:'Cargo', tip:'Cargo de la persona.' })
  };

  /* ---------------- Ayudas de gráficas ---------------- */
  const dayCats = rows => {
    const set = [...new Set(rows.map(r => r.iso))].sort();
    return set.map(iso => {
      const df = D.dateFields(iso);
      return { key:iso, label:String(df.diaNum), mesLbl:df.mes, anio:String(df.anio), tip:F.d(iso) };
    });
  };
  const contDays = (a, b) => D.isoRange(a, b).map(iso => {
    const d = D.dateFields(iso);
    const dom = d.nombreDia === 'domingo';
    return { key:iso, label:dom ? `${iso.slice(8, 10)} ${d.mes.slice(0, 3)}` : '', tip:F.d(iso) };
  });

  /* Fila común: día + mes + semana de cada persona, para las tablas por semana */
  const weekRows = rows => [...group(rows, r => r.anio + '|' + r.mes + '|' + r.semana + '|' + r.nombre).values()].map(l => {
    const count = t => l.filter(r => r.turno === t).length;
    return {
      anio:l[0].anio, mes:l[0].mes, semana:l[0].semana, cod:l[0].cod, nombre:l[0].nombre,
      dias:l.length, horas:sumBy(l, 'horas'), w1061:sumBy(l, 'w1061'), w1062:sumBy(l, 'w1062'), extD:sumBy(l, 'extD'), extN:sumBy(l, 'extN'),
      tA:count('A'), tB:count('B'), tC:count('C'), tD:count('D'), tO:count('Otro / Error'), tN:count('Turno 12H Noche'), tH:count('Turno 12H Día')
    };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const personRows = (rows, fill) => [...group(rows, r => r.nombre).values()].map(l => fill(l, l[0]));
  const semanaCols = (conMes) => [
    ...(conMes ? [T('mes', 'Mes')] : []),
    N0('semana', 'SemanaAjustada'), T('nombre', 'Nombre'),
    N0('w1061', 'Extras 1061', SUM), N0('w1062', 'Extras 1062', SUM),
    NB('tA', 'Turno A', SUM), NB('tB', 'Turno B', SUM), NB('tC', 'Turno C', SUM), NB('tD', 'Turno D', SUM), NB('tO', 'Turno Otro', SUM), NB('tN', '12h Noc', SUM), NB('tH', '12h Dia', SUM)
  ];
  const consolidaSemana = (rowsFn) => ({
    type:'pivot', title:'Consolida semana', tip:'Resumen de extras semanales 1061 y 1062: filas por mes y columnas por semana. El signo + abre el detalle por persona.', h:340,
    rows:rowsFn, colKey:'semana', colLabel:'SemanaAjustada', rowLabel:'Mes',
    rowLevels:[{ k:'mes', order:MESES }, { k:'nombre' }],
    measures:[{ k:'w1061', l:'Extras 1061' }, { k:'w1062', l:'Extras 1062' }]
  });

  /* =======================================================================
     CEMENTO
     ======================================================================= */
  const CEM_SERIES = [
    { key:'A', label:'A', color:'#9d9fd6' }, { key:'B', label:'B', color:'#a4d3fb' }, { key:'C', label:'C', color:'#f0b2b6' }, { key:'D', label:'D', color:'#e4e4e4' },
    { key:'En progreso', label:'En progreso', color:'#a43540', ink:'#fff' }, { key:'Otro / Error', label:'Otro / Error', color:'#118dff' },
    { key:'Turno 12H Día', label:'Turno 12H Día', color:'#efe09a' }, { key:'Turno 12H Noche', label:'Turno 12H Noche', color:'#12239e', ink:'#fff' }
  ];
  const cemFilters = fechaLbl => [Fl.planta(), Fl.fecha(fechaLbl), Fl.semana(), Fl.nombre(), Fl.turno(), Fl.tipoDia()];

  LD.boards.cemento = () => {
    const ds = D.cemento();
    const rows = ds.rows;
    const opt = () => rows;
    const f = (ctx, o) => ctx.rows(rows, o);
    const errs = ctx => f(ctx).filter(r => r.turno === 'Otro / Error');
    const shared = cemFilters();
    const jornadaCols = extra => [
      FE('iso'), T('tipoDia', 'Día', { wrap:1 }), COD(), T('nombre', 'NombreE'), DT('ingreso', 'Hora Ingreso'), DT('salida', 'Hora Salida'), ...extra,
      T('tipoJ', 'Tipo Jornada'), DT('inicio', 'Inicio Jornada'), DT('fin', 'Fin Jornada'), N2('horas', 'Horas Jornada', SUM), T('turno', 'Turno'), T('comentario', 'Comentarios')
    ];
    return { pages:[
      /* -------- Ejecutiva (2.png, 3.png) -------- */
      { id:'ejecutiva', label:'Ejecutiva', title:'Vista Ejecutiva', corte:'26/10/2026', filters:shared, optRows:opt,
        tip:'Resumen de las jornadas del personal de cemento: cuántas personas trabajaron por día y en qué turno, y cuáles registros quedaron con error.',
        blocks:[
          { type:'stack', title:'Distribución de jornadas', tip:'Cantidad de jornadas por día, apiladas por turno. Clic en un segmento filtra la página por ese día y turno; clic en la leyenda filtra por el turno.',
            rows:(ctx, o) => f(ctx, o), cats:dayCats, catField:'iso', serField:'turno', series:CEM_SERIES, serTitle:'Turno',
            levels:['mesLbl', 'anio'], xTitle:'Día', W:1560, H:300 },
          { row:[
            { flex:1, type:'table', title:'Detalle de jornadas', tip:'Una fila por jornada: horas reales de ingreso y salida frente a las programadas, horas y turno. Desliza a la derecha para ver todas las columnas. Clic en un encabezado para ordenar.', h:430,
              rows:f, sort:{ k:'nombre', dir:1 }, total:1, cols:jornadaCols([N2('consec', 'ConsecutivoSalida')]) },
            { w:380, col:[
              { type:'table', title:'Error', tip:'Jornadas con el registro incompleto. Desliza a la derecha para ver el tipo, ingreso, salida y comentarios.', h:320,
                rows:errs, sort:{ k:'nombre', dir:1 },
                cols:[T('nombre', 'NombreE'), CED(), FE('iso', 'FechaSinHora'), T('tipoJ', 'Tipo Jornada'), T('turno', 'Tipo Turno'), DT('ingreso', 'IngresoJornada'), DT('salida', 'SalidaJornada'), T('comentario', 'Comentarios')] },
              { type:'nav', items:[{ label:'Detalle Error', go:'detalleError' }, { label:'Nómina', go:'nomina' }] }
            ] }
          ] }
        ] },
      /* -------- Detalle Error (4.png): página oculta, comparte filtros con Ejecutiva -------- */
      { id:'detalleError', label:'Detalle Error', hidden:true, stateOf:'ejecutiva', title:'Vista Ejecutiva', corte:'26/10/2026', filters:shared, optRows:opt,
        tip:'Detalle de las jornadas con error. Conserva los filtros de la Vista Ejecutiva. Para volver, usa Ejecutiva en el panel Páginas.',
        blocks:[
          { type:'stack', title:'Distribución de jornadas', tip:'Jornadas con error por día, según el tipo: sin ingreso, sin salida o sin error. Clic para filtrar.',
            rows:(ctx, o) => f(ctx, o).filter(r => r.turno === 'Otro / Error'), cats:() => contDays('2026-08-31', '2026-10-26'), catField:'iso', serField:'tipoError', serTitle:'Tipo de error',
            series:[{ key:'Sin error', label:'Sin error', color:'#118dff' }, { key:'Sin ingreso', label:'Sin ingreso', color:'#12239e', ink:'#fff' }, { key:'Sin salida', label:'Sin salida', color:'#e66c37' }],
            xTitle:'Date', W:1560, H:190, barRatio:0.9, labelBold:1 },
          { row:[
            { flex:1, col:[
              { type:'table', title:'Detalle de jornadas', tip:'Jornadas con error, con el tipo de error y el método de ingreso.', h:300,
                rows:errs, sort:{ k:'iso', dir:1 },
                cols:[FE('iso'), T('tipoDia', 'Día'), COD(), T('nombre', 'NombreE'), T('tipoError', 'TipoErrorJornada'), DT('ingreso', 'HoraIngreso'), DT('salida', 'HoraSalida'), T('tipoJ', 'Tipo Jornada'), DT('inicio', 'Inicio Jornada'), T('metIng', 'MetodoIngreso'), T('turno', 'Turno')] },
              { type:'table', sub:'Detalle registros', tip:'Los registros de la persona antes y después del error, para ver qué marcaje faltó.', h:280,
                rows:errs, sort:{ k:'iso', dir:1 },
                cols:[FE('iso', 'Date'), COD(), DT('ingreso', 'HoraIngreso'), DT('ingAnt', 'HoraIngresoAnterior'), DT('salida', 'HoraSalida'), DT('salAnt', 'HoraSalidaAnterior'), T('metIng', 'MetodoIngreso'), T('metIngAnt', 'MetodoIngresoAnterior'), T('metSal', 'MetodoSalida'), T('metSalAnt', 'MetodoSalidaAnterior')] }
            ] },
            { w:390, type:'table', title:'Error', tip:'Lista de jornadas con error por fecha.', h:610,
              rows:errs, sort:{ k:'iso', dir:1 }, cols:[FE('iso'), T('nombre', 'NombreE'), T('tipoJ', 'Tipo Jornada')] }
          ] }
        ] },
      /* -------- Cemento (5.png a 9.png) -------- */
      { id:'cemento', label:'Cemento', title:'Cemento', corteLabel:'Última actualización:', corte:'26/10/2026 9:45:35', corteStacked:1, filters:cemFilters('Año, NombreMesAjustado, Día'), optRows:opt,
        tip:'Operación diaria del personal de cemento: programación, jornadas, errores, extras, ejecución y solicitudes.',
        blocks:[
          { row:[
            { w:420, type:'table', title:'Programación Jornadas', round:1, tip:'Turnos programados por planta y persona. No hay programación cargada para este periodo.', minH:420, h:420, rows:() => [],
              cols:[T('planta', 'Planta'), T('nombre', 'Nombre'), T('iso', 'Fecha'), T('turno', 'Turno')] },
            { flex:1, type:'table', title:'Jornadas', round:1, tip:'Todas las jornadas de los filtros elegidos, desde la más reciente.', h:420, rows:f, sort:{ k:'ingreso', dir:-1 }, total:1, cols:jornadaCols([]).slice(0, -1) }
          ] },
          { row:[
            { w:380, type:'table', title:'Error', round:1, tip:'Jornadas con error por fecha.', h:400, rows:errs, sort:{ k:'iso', dir:1 },
              cols:[FE('iso'), T('nombre', 'NombreE'), T('tipoJ', 'Tipo Jornada'), T('tipoError', 'TipoError')] },
            { flex:1, row:[
              { flex:0.8, type:'table', title:'Extras', round:1, tip:'Por persona: días trabajados y festivos ocasionales o habituales.', h:400,
                rows:ctx => personRows(f(ctx), (l, r0) => ({ nombre:r0.nombre, dias:l.length, fOc:sumBy(l, 'fOc'), fHab:sumBy(l, 'fHab') })), sort:{ k:'nombre', dir:1 }, total:1,
                cols:[T('nombre', 'NombreE'), N0('dias', 'Días Trabajados', SUM), NB('fOc', 'Festivos Ocasionales', SUM), NB('fHab', 'Festivos habituales', SUM)] },
              { flex:1, type:'table', title:'Extras', round:1, tip:'Por persona: horas extras, extras diurnas y nocturnas, recargo nocturno y recargo dominical.', h:400,
                rows:ctx => personRows(f(ctx), (l, r0) => ({ nombre:r0.nombre, hExt:sumBy(l, 'hExt'), extD:sumBy(l, 'extD'), extN:sumBy(l, 'extN'), recN:sumBy(l, 'recN'), recD:sumBy(l, 'recD') })), sort:{ k:'nombre', dir:1 }, total:1,
                cols:[T('nombre', 'NombreE'), N2('hExt', 'Horas Extras', SUM), N2('extD', 'Extras Diurnas', SUM), N2('extN', 'Extras Nocturnas', SUM), N2('recN', 'Recargo Nocturno', SUM), N2('recD', 'Recargo Dominical', SUM)] }
            ] }
          ] },
          { type:'table', title:'Detalle semana', tip:'Por semana y persona: días, horas y extras. Por defecto se ordena por extra nocturna, de mayor a menor.', h:320,
            rows:ctx => weekRows(f(ctx)), sort:{ k:'extN', dir:-1 }, total:1,
            cols:[T('anio', 'Año'), COD(), T('nombre', 'Nombre'), N0('dias', 'Dias Trabajados'), N2('horas', 'Horas Trabajadas'), N0('w1061', 'HorasExtrasSemanalDiurna'), N2('extD', 'Suma de Extra Diurna', SUM), N2('extN', 'Suma de Extra Nocturna', SUM)] },
          { type:'table', title:'Detalle ejecución y pago', tip:'Compara lo trabajado (azul) con lo solicitado (morado). Las jornadas con extras solicitadas aparecen primero.', h:340,
            rows:f, sort:{ k:'solic', dir:-1 }, total:1,
            cols:[FE('iso'), T('nombre', 'NombreE'), T('tipoJ', 'Tipo Jornada'), DT('inicio', 'Inicio Jornada'), DT('fin', 'Fin Jornada'), T('turno', 'Turno'),
              N2('horas', 'Horas Jornada', { tot:'sum', hdr:H_AZUL }), N2('hExt', 'Horas Extras', { tot:'sum', hdr:H_AZUL }), N2('extD', 'Extras Diurnas', { tot:'sum', hdr:H_AZUL }), N2('extN', 'Extras Nocturnas', { tot:'sum', hdr:H_AZUL }), N2('recN', 'Recargo nocturno', { tot:'sum', hdr:H_AZUL }), N2('recD', 'Recargo Dominical', { tot:'sum', hdr:H_AZUL }),
              N2('solic', 'Extras Solicitadas', { tot:'sum', hdr:H_MORA }), T('tipoSolic', 'Tipo Solicitado', { hdr:H_MORA })] },
          { row:[
            { flex:1, type:'table', title:'Tiempo real', tip:'Personas con jornada en curso al momento del corte (26/10/2026). La salida es la hora actual.', h:430,
              rows:ctx => f(ctx).filter(r => r.iso === '2026-10-26'), sort:{ k:'ingreso', dir:-1 }, total:1,
              cols:[FE('iso'), COD(), T('nombre', 'NombreE'), DT('ingreso', 'Hora Ingreso'), DT('salida', 'Hora Salida / actual'), N2('horas', 'Horas Jornada', SUM), T('turno', 'Turno')] },
            { flex:1, type:'table', title:'Solicitudes de extras', tip:'Horas extra solicitadas, con su estado, concepto y justificación.', h:430,
              rows:ctx => ctx.rows(ds.solicitudes), total:1,
              cols:[FE('iso', 'Date'), T('empleado', 'employee_id'), DT('inicio', 'fecha_hora_inicio'), N2('horas', 'Horas solicitadas', SUM), T('estatus', 'estatus'), T('concepto', 'Concepto'), T('just', 'Justificación'), T('comentario', 'comentario')] }
          ] }
        ] },
      /* -------- Nómina (10.png a 12.png) -------- */
      { id:'nomina', label:'Nómina', title:'Nómina', corte:ctx => { const r = f(ctx); return r.length ? F.d(r.reduce((m, x) => x.iso < m ? x.iso : m, r[0].iso)) : '(En blanco)'; }, filters:cemFilters('Año, NombreMesAjustado, Día'), optRows:opt,
        tip:'Revisión de nómina: lo que se paga a cada persona por extras y recargos, y su detalle por turno y semana.',
        blocks:[
          { row:[
            { flex:1, type:'tree', title:'Revisión nómina', round:1, tip:'Por persona, código y turno. Usa los signos + y − para abrir o cerrar cada nivel. Los números 1060 a 104200 son los códigos de pago.', h:430,
              rows:f, firstLabel:'NombreE', openDepth:2,
              levels:[{ k:'nombre' }, { k:'cod', f:F.cod }, { k:'turno' }],
              cols:[{ k:'dias', l:'Días Trabajados', calc:l => l.length, f:F.n0 }, N2('extD', 'Horas extras diurnas 1061'), N2('extN', 'Horas extras nocturnas 1062'), N2('extDD', 'Horas extra diurnas Dom 1063'), N2('extND', 'Horas extras Noc Dom 1064'), N2('recN', 'Horas Recargo Noc 1060'), N2('recD', 'Horas Recargo Dom 102500'), N2('recDN', 'Recargo Noc Dom 104200'), N0('redD', 'Reducción Diurna'), N0('redN', 'Reducción Nocturna')] },
            { w:430, type:'table', title:'Revisión nómina', round:1, tip:'Extras semanales por persona. Desliza para ver el nombre completo y el código.', h:430,
              rows:ctx => personRows(f(ctx), (l, r0) => ({ nombre:r0.nombre, cod:r0.cod, w1061:sumBy(l, 'w1061'), w1062:sumBy(l, 'w1062') })), sort:{ k:'nombre', dir:1 }, total:1,
              cols:[T('nombre', 'Nombre'), COD(), N0('w1061', 'Horas Extras Semanal Diurna 1061', SUM), N0('w1062', 'Horas Extras Semanal Nocturna 1062', SUM)] }
          ] },
          { type:'table', title:'Detalle de jornadas', tip:'Una fila por jornada con todas las horas de pago. Desliza a la derecha para ver todas las columnas.', h:360,
            rows:f, sort:{ k:'iso', dir:1 }, total:1,
            cols:[FE('iso', 'Date'), T('tipoDia', 'Día'), T('tipoDia', 'TipoDia'), T('nombreDia', 'NombreDía'), COD(), T('nombre', 'NombreE', { wrap:1 }), DT('ingreso', 'Hora Ingreso'), DT('salida', 'Hora Salida'), T('tipoJ', 'Tipo Jornada'), DT('inicio', 'Inicio Jornada'), DT('fin', 'Fin Jornada'), N2('horas', 'Horas Jornada', SUM), T('turno', 'Turno'), N2('extD', 'Horas Extra Diurnas', SUM), N2('extN', 'Horas Extra Noc', SUM), N2('extDD', 'Horas Extra Diurnas Dom', SUM), N2('recN', 'Horas Recargo Nocturno', SUM), N2('recD', 'Horas Recargo Dom', SUM), N2('recDN', 'Horas Recargo Dominical Nocturno', SUM), N0('redD', 'Hora Reducción Diurna', SUM), N0('redN', 'Hora Reducción Nocturna', SUM)] },
          { row:[
            { flex:1, type:'table', title:'Detalle semana', tip:'Por semana y persona: extras 1061 y 1062 y cuántos días hizo de cada turno. Desliza para ver todos los turnos.', h:340,
              rows:ctx => weekRows(f(ctx)), sort:{ k:'semana', dir:1 }, total:1, cols:semanaCols(true) },
            { flex:1, ...consolidaSemana(ctx => f(ctx)) }
          ] }
        ] }
    ] };
  };

  /* =======================================================================
     CARACOLITO y NÓMINA (comparten páginas)
     ======================================================================= */
  const CT = LD.CAR_T;
  const CAR_SERIES = [
    { key:CT.EP, label:'En planta', color:'#12239e', ink:'#fff' }, { key:CT.NO, label:'Nocturno-Amanecida', color:'#e66c37', ink:'#fff' }, { key:CT.OT, label:'Otro / Error', color:'#118dff', ink:'#fff' },
    { key:CT.D12, label:'Turno 12H Día / 7:00 a.m. - 7:00 p.m.', color:'#6b007b', ink:'#fff' }, { key:CT.N12, label:'Turno 12H Noche / 7:00 p.m. - 7:00 a.m.', color:'#e044a7', ink:'#fff' },
    { key:CT.AD, label:'Turno Adm. / 7:00 a.m. - 4:30 p.m.', color:'#744ec2', ink:'#fff' }, { key:CT.MA, label:'Turno Mañana / 7:00 a.m. - 3:00 p.m.', color:'#d9b300', ink:'#fff' }, { key:CT.TA, label:'Turno Tarde / 3:00 p.m. - 11:00 p.m.', color:'#d64550', ink:'#fff' }
  ];
  const CAR_HOY = '2026-10-26';
  const historiaCols = [FE('iso'), CED(), { k:'cod', l:'Cod_RRHH' }, T('nombre', 'Nombre'), T('pos', 'Posicion'), T('tipoCargo', 'TipoCargo'), DT('ingreso', 'IngresoJornada'), T('zonaIng', 'ZonaIngreso'), DT('salida', 'SalidaJornada'), T('zonaSal', 'ZonaSalida'), { k:'horas', l:'HoraAjustado', num:1, f:F.n1 }, T('turno', 'Turno')];
  const pagoCols = [
    N2('extD', 'Extra Diurnas', { f:F.n0, hdr:H_VERDE }), N2('extN', 'Extra Nocturnas', { f:F.n0, hdr:H_VERDE }), N2('recN', 'Recargo Nocturno', { f:F.n0, hdr:H_VERDE }), N2('recD', 'Recargo Dominical', { f:F.n0, hdr:H_VERDE }), N2('extSab', 'Extra Sabado Admin', { f:F.n0, hdr:H_VERDE }),
    N2('redD', 'Reducción Diurna', { f:F.n0, hdr:H_ROJO }), N2('redN', 'Reducción Nocturna', { f:F.n0, hdr:H_ROJO }), N2('aux', 'Auxilio Alimentación', { f:F.n0, hdr:H_AMAR }),
    T('solic', 'Horas Solicitadas', { num:1, hdr:H_MORA }), T('tipoSolic', 'Tipo Solicitado', { hdr:H_MORA }), T('just', 'Justificación', { hdr:H_MORA })
  ];

  function carPages(nav, ds) {
    const rows = ds.rows;
    const f = (ctx, o) => ctx.rows(rows, o);
    const opt = () => rows;
    const errTable = () => ({ type:'table', title:'Error', tip:'Jornadas con error en el periodo elegido. Si no hay errores, la tabla queda vacía.', h:170, minH:120,
      rows:ctx => ctx.rows(ds.errores), sort:{ k:'iso', dir:1 }, cols:[FE('iso'), T('nombre', 'Nombre'), CED(), T('tipoJ', 'Tipo Jornada'), T('tipoError', 'TipoErrorJornada')] });
    const mayor12 = () => ({ type:'table', sub:'Mayor a 12 hrs', tip:'Jornadas de más de 12 horas. Casi siempre son jornadas sin registro de salida, por eso las horas se disparan.', h:230,
      rows:ctx => f(ctx).filter(r => r.horas > 12), sort:{ k:'horas', dir:-1 }, total:1,
      cols:[FE('iso'), T('nombre', 'Nombre'), DT('ingreso', 'IngresoJornada'), DT('salida', 'SalidaJornada'), N2('horas', 'Horas Jornada', SUM)] });
    const historia = () => ({ type:'table', title:'Historia Jornadas', sub:'Jornada Diaria', tip:'Todas las jornadas del periodo; primero las de más horas, normalmente sin salida registrada. Desliza a la derecha para ver todas las columnas.', h:490,
      rows:f, sort:{ k:'horas', dir:-1 }, cols:historiaCols });
    const hoy = ctx => f(ctx).filter(r => r.iso === CAR_HOY);
    const tiempoReal = extra => ({ type:'table', sub:'Jornada Diaria', tip:'Quiénes tienen jornada hoy, a qué hora entraron y si siguen en planta. Solo muestra datos si los filtros incluyen el día de hoy.', h:370, minH:300,
      rows:hoy, sort:{ k:'turno', dir:1 }, total:1,
      cols:[FE('iso'), CED(), T('nombre', 'Nombre'), T('pos', 'Nombre de Posición'), T('funcion', 'Nombre|Función del Puesto'), DT('ingreso', 'IngresoJornada'), ...(extra ? [T('zonaIng', 'ZonaIngreso')] : []), DT('salida', 'Hora Salida / actual'), ...(extra ? [T('zonaSal', 'ZonaSalida')] : []), N2('horas', 'Horas Jornada', SUM), T('turno', 'Turno'), T('estado', 'EstadoActualPlanta')] });
    const stamp = () => ({ type:'stamp', value:ctx => '26/10/2026 12:15:14' });
    const kpiTR = () => ({ type:'kpi', tip:'', items:ctx => {
      const r = hoy(ctx);
      const v = n => (r.length ? n : '(En blanco)');
      return [
        ['Personal registrado', v(r.length), 'Personas con jornada hoy.'],
        ['Personal activo', v(r.filter(x => x.turno === CT.EP).length), 'Personas que siguen dentro de la planta.'],
        ['Turno terminado', v(r.filter(x => x.turno === CT.NO || x.turno === CT.N12).length), 'Personas que ya terminaron su turno hoy.']
      ];
    } });

    const ejecutiva = { id:'ejecutiva', label:'Ejecutiva', title:'Vista Ejecutiva', corte:'26/10/2026', optRows:opt,
      tip:'Cuántas personas trabajaron cada día y en qué turno, el histórico de jornadas, los errores y quién está hoy en planta.',
      filters:[Fl.planta(), Fl.anio(), Fl.mes(['octubre']), Fl.dia(), Fl.nombre('Nombre'), Fl.turno(), Fl.tipoDia(), Fl.tipoCargo(), Fl.rotacion()],
      blocks:[
        { type:'stack', title:'Distribución de jornadas', tip:'Jornadas por día, apiladas por tipo de turno. Clic en un segmento filtra la página por ese día y turno; clic en la leyenda filtra por el turno.',
          rows:(ctx, o) => f(ctx, o), cats:dayCats, catField:'iso', serField:'turno', series:CAR_SERIES, serTitle:'Tipo Turno', levels:['mesLbl', 'anio'], xTitle:'Día', W:1560, H:300, yAxis:[0, 50, 100, 150], labelSize:10.5 },
        { row:[
          { flex:1, ...historia() },
          { w:400, col:[errTable(), { type:'nav', items:nav('ejecutiva') }, mayor12()] }
        ] },
        { type:'none', title:'Jornada tiempo real', barOnly:1, tip:'Lo que está pasando hoy en la planta.' },
        { row:[
          { flex:1, ...tiempoReal(false) },
          { w:400, col:[stamp(), kpiTR(),
            { type:'table', sub:'Visitantes', tip:'Visitantes que ingresaron a la planta. Desliza a la derecha para ver área, cargo, lugar, comentarios, método y tipo de visitante.', h:170,
              rows:ctx => ctx.rows(ds.visitantes), sort:{ k:'nombre', dir:1 },
              cols:[FE('iso', 'Date'), T('nombre', 'Nombre'), { k:'ced', l:'Cedula', num:1, f:v => (v ? F.cod(v) : '') }, T('area', 'Area'), T('cargo', 'Cargo'), T('lugar', 'Lugar'), T('com', 'Comentarios'), T('met', 'Metodo'), T('tipoV', 'Tipo de visitante')] }
          ] }
        ] }
      ] };

    const satelite = { id:'satelite', label:'Satélite', title:'Satélite', optRows:opt,
      corte:ctx => (hoy(ctx).length ? '26/10/2026' : '(En blanco)'),
      tip:'Personal en tiempo real e histórico. Por defecto el mes es septiembre, por eso la parte de tiempo real sale en blanco: cambia el mes a octubre para ver a quienes están hoy.',
      filters:[Fl.planta(), Fl.anio(), Fl.mes(['septiembre']), Fl.dia(), Fl.nombre('Nombre'), Fl.turno(), Fl.tipoDia(), Fl.tipoCargo(), Fl.area()],
      blocks:[
        { type:'none', title:'Jornada Tiempo Real', barOnly:1, tip:'Lo que está pasando hoy en la planta.' },
        { row:[
          { flex:1, ...tiempoReal(true) },
          { w:380, col:[{ type:'stamp', value:() => '27/10/2026 8:12:43' }, kpiTR()] }
        ] },
        { row:[
          { flex:1, ...historia() },
          { w:400, col:[errTable(), { type:'nav', items:nav('satelite', true) }, mayor12()] }
        ] }
      ] };

    const nomina = { id:'nomina', label:'Nómina', title:'Vista Ejecutiva', corte:'27/10/2026', optRows:opt,
      tip:'Revisión de nómina de cada jornada: extras, recargos, reducciones, auxilio y horas solicitadas.',
      filters:[Fl.planta(), Fl.anio(), Fl.mes(), Fl.dia(), Fl.nombre('Nombre'), Fl.turno(), Fl.tipoDia()].map(x => (x.key === 'mes' ? Object.assign(x, { allLabel:'Selección múltiple' }) : x)),
      blocks:[
        { type:'table', title:'Revisión Nómina', sub:'Jornada Diaria', tip:'Una fila por jornada. Verde: lo que suma a pago. Rojo: reducciones. Amarillo: auxilio. Morado: lo solicitado. Desliza a la derecha para verlo todo.', h:420,
          rows:f, sort:{ k:'turno', dir:1 },
          cols:[FE('iso'), CED(), T('nombre', 'Nombre'), T('funcion', 'Nombre|Función del Puesto'), T('nombreDia', 'Día de la semana'), T('tipoDia', 'TipoDia'), DT('ingreso', 'IngresoJornada'), DT('salida', 'SalidaJornada'), N2('horas', 'Hora Jornada', { f:F.n1 }), T('turno', 'Turno'), ...pagoCols] },
        { row:[
          { flex:1, type:'tree', title:'Detalle persona', sub:'Jornada Diaria', tip:'Totales por persona. Con el signo + ves cada jornada de esa persona.', h:360,
            rows:f, firstLabel:'Nombre', levels:[{ k:'nombre' }, { k:'iso', f:F.d }],
            cols:[N0('extD', 'Horas Extra Diurnas', { hdr:H_VERDE }), N0('extN', 'Horas Extra Nocturnas', { hdr:H_VERDE }), N0('recN', 'Horas Recargo Nocturno', { hdr:H_VERDE }), N0('recD', 'Horas Recargo Dominical', { hdr:H_VERDE }), N0('extSab', 'Horas Extra Sabado Admin', { hdr:H_VERDE }), N0('sextoD', 'Horas Sexto Día Diurna', { hdr:H_ROJO }), N0('sextoN', 'Horas Sexto Día Nocturna', { hdr:H_ROJO }), N0('solic', 'Horas Solicitadas', { hdr:H_MORA }), N0('aux', 'Auxilio Alimentación', { hdr:H_AMAR })] },
          { w:400, col:[errTable(), { type:'nav', items:nav('nomina') }, mayor12()] }
        ] }
      ] };

    const novedad = r => r.extD + r.extN + r.recN + r.recD + r.aux + r.redD + r.redN + r.domHab + r.domOc > 0;
    const formato = { id:'formato', label:'Formato reporte nómina', title:'Vista Nómina', optRows:opt,
      tip:'Formato listo para revisar y reportar la nómina, agrupado por persona. Elige ver todos los días o solo los que tienen novedad.',
      filters:[Fl.planta(), Fl.anio(), Fl.mes(['septiembre']), Fl.dia(), Fl.nombre('Nombre'), Fl.turno([CT.OT]), Fl.tipoDia()],
      blocks:[
        { type:'toggle', key:'dias', options:['Todos los días', 'Solo días con novedad'] },
        { type:'table', title:'Revisión Nómina', tip:'Por persona y fecha. Clic en una fila para resaltarla.', h:430, noSort:1, selectable:1,
          merge:['nombre', 'codTxt', 'pos'],
          rows:ctx => {
            const list = f(ctx);
            const out = ctx.st.extra.dias === 'Solo días con novedad' ? list.filter(novedad) : list;
            return [...out].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || (a.iso < b.iso ? -1 : 1));
          },
          cols:[T('nombre', 'Nombre', { wrap:1 }), T('codTxt', 'Codigo_empleado'), T('pos', 'Posicion', { wrap:1 }), FE('iso', 'FechaSinHora'), T('turnoVis', 'Turno Visual'), T('nombreDia', 'Dia Semana'), T('tipoDia', 'TipoDia'),
            NB('domHab', 'Domingo y/o festivo habitual'), NB('domOc', 'Domingo y/o festivo ocasional SIN compensatorio'), NB('recN', 'Recargo nocturno'), NB('aux', 'Auxilio alimentación'), T('descanso', 'Descanso compensatorio'), NB('extD', 'Horas extras diurnas'), NB('extN', 'Horas extras nocturnas'), NB('redD', 'Reducción jornada diurna'), NB('redN', 'Reducción jornada nocturna'), T('just', 'Justificación'),
            { k:'ingreso', l:'Hora ingreso', num:1, f:F.hm }, { k:'salida', l:'Hora salida', num:1, f:F.hm }, { k:'horas', l:'Horas totales', num:1, f:v => (v % 1 ? F.n1(v) : F.n0(v)) }] },
        { type:'table', title:'Detalle persona', sub:'Jornada Diaria', tip:'El mismo detalle en forma de lista, con todas las columnas de pago. Desliza a la derecha para verlas.', h:300,
          rows:f, sort:{ k:'iso', dir:1 },
          cols:[FE('iso'), CED(), T('nombre', 'Nombre'), T('pos', 'Posicion'), T('nombreDia', 'Dia de la semana'), T('tipoDia', 'TipoDia'), DT('ingreso', 'IngresoJornada'), DT('salida', 'SalidaJornada'), { k:'horas', l:'Hora Jornada', num:1, f:F.n1 }, T('turno', 'Turno'),
            N0('extD', 'Horas Extra Diurnas', { hdr:H_VERDE }), N0('extN', 'Horas Extra Nocturnas', { hdr:H_VERDE }), N0('recN', 'Horas Recargo Nocturno', { hdr:H_VERDE }), N0('recD', 'Horas Recargo Dominical', { hdr:H_VERDE }), N0('extSab', 'Horas Extra Sabado Admin', { hdr:H_VERDE }), N0('redD', 'Hora Reducción Diurna', { hdr:H_ROJO }), N0('redN', 'Hora Reducción Nocturna', { hdr:H_ROJO }), N0('aux', 'Auxilio Alimentación', { hdr:H_AMAR }), T('solic', 'Horas Solicitadas', { num:1, hdr:H_MORA }), T('tipoSolic', 'Tipo Solicitado', { hdr:H_MORA }), T('just', 'Justificación', { hdr:H_MORA })] }
      ] };
    return { ejecutiva, satelite, nomina, formato };
  }

  LD.boards.caracolito = () => {
    const uc = l => ({ label:l, uc:true });
    const nav = (cur, corto) => {
      const items = [{ label:'Satélite', go:'satelite', active:cur === 'satelite' }, { label:'Nómina', go:'nomina', active:cur === 'nomina' }, { label:'Formato reporte', go:'formato' }];
      return corto ? items : [...items, uc('Horas Extra'), uc('Detalle Error')];
    };
    const p = carPages(nav, D.caracolito());
    return { pages:[p.ejecutiva, p.satelite, p.nomina, p.formato] };
  };

  LD.boards.nomina = () => {
    const nav = cur => [
      { label:'Nómina', go:'nomina', active:cur === 'nomina' }, { label:'Formato reporte', go:'formato' }, { label:'Permisos', go:'permisos' },
      { label:'Horas Extra', go:'horasPta' }, { label:'Detalle Error', uc:true }
    ];
    const p = carPages(nav, D.caracolito());
    const rows = D.permisos().rows;
    const f = ctx => ctx.rows(rows);
    const permisos = { id:'permisos', label:'Permisos', title:'Permisos', blocks:[{ type:'uc', title:'Permisos' }], optRows:() => [] };
    const horasPta = { id:'horasPta', label:'Horas Extras PTA', title:'Horas Extras', corte:'(En blanco)', optRows:() => rows,
      tip:'Permisos de horas extra del personal de PTA: quién, cuándo, por qué concepto y con qué código de pago.',
      filters:[Fl.anio(), Fl.mes(['septiembre']), Fl.dia(), Fl.nombre(), Fl.turno(), Fl.tipoDia(), Fl.area(), Fl.empresa(), Fl.supervisor(), Fl.cargo()],
      blocks:[
        { type:'table', title:'Revisión Permisos', sub:'Permisos', tip:'Una fila por permiso, con horas, concepto, observación y tipo de extra. Desliza a la derecha para verlo todo.', h:470,
          rows:f, sort:{ k:'iso', dir:1 }, total:1,
          cols:[FE('iso', 'Date'), { k:'doc', l:'Documento', num:1, f:v => (v ? F.cod(v) : '') }, T('nombre', 'NombreE'), T('area', 'Area'), T('tipoCargo', 'Tipo_Cargo'), T('supervisor', 'Supervisor'), DT('inicio', 'Fecha_Inicio'), DT('fin', 'Fecha_Fin'), N2('horas', 'Suma de Horas', SUM), T('concepto', 'Concepto'), T('obs', 'Observación'), T('tipoExtra', 'Tipo_Extra')] },
        { type:'pivot', title:'Detalle persona', sub:'Permisos', tip:'Horas por persona y concepto, con el total por fila y por columna.', h:340,
          rows:f, colKey:'concepto', rowLabel:'Nombre', showColHeader:false,
          rowLevels:[{ k:'nombre', blankFirst:1 }], measures:[{ k:'horas', l:'Horas', f:F.n2 }] }
      ] };
    return { pages:[p.ejecutiva, p.nomina, p.formato, permisos, horasPta] };
  };

  /* =======================================================================
     PORTERÍA (una sola página, sin menú lateral)
     ======================================================================= */
  LD.boards.porteria = () => {
    const ds = D.porteria();
    const cursoCF = v => (v ? null : '#f2b5b9');
    const hoy = ctx => ctx.rows(ds.hoy);
    const alm = (ctx, m) => hoy(ctx).filter(r => r.almuerzo === m);
    const almKpi = m => ({ type:'kpi', items:ctx => {
      const r = alm(ctx, m);
      return [['Total', r.length, 'Almuerzos del turno.'], ['PTA', r.filter(x => x.empresa === 'PTA').length, 'Almuerzos de personal de PTA.'], ['CEMEX', r.filter(x => /CEMEX/.test(x.empresa)).length, 'Almuerzos de personal de CEMEX.']];
    } });
    const uc = l => ({ label:l, uc:true });
    return { sidebar:false, pages:[{
      id:'porteria', label:'Portería', title:'Vista Ejecutiva', corte:'05/11/2026', optRows:() => ds.hist,
      tip:'Control de portería: quién está hoy en planta, almuerzos del día, errores e histórico de jornadas.',
      filters:[Fl.planta(), Fl.anio([2026]), Fl.mes(), Fl.dia(), Fl.nombre('Nombre'), Fl.turno(), Fl.tipoDia(), Fl.area(), Fl.empresa()],
      blocks:[
        { type:'none', title:'Jornada tiempo real', barOnly:1, tip:'Lo que está pasando hoy en la planta.' },
        { row:[
          { flex:1, type:'table', sub:'Jornada Diaria', tip:'Personas con jornada hoy. El Curso de Seguridad en rojo significa que no hay curso registrado. Desliza a la derecha para ver todas las columnas.', h:330,
            rows:hoy, sort:{ k:'horas', dir:-1 }, total:1,
            cols:[FE('iso'), CED(), T('nombre', 'Nombre'), T('pos', 'Posicion'), DT('ingreso', 'IngresoJornada'), DT('salida', 'Hora Salida / actual'), N2('horas', 'Horas Jornada', SUM), T('empresa', 'Empresa'), T('turno', 'Turno'), T('estado', 'EstadoActualPlanta'), FE('curso', 'CursoSeguridad', { cf:cursoCF }), T('placa', 'Placa'), T('comentario', 'Comentarios')] },
          { w:340, col:[{ type:'stamp', value:() => '05/11/2026 15:15:33' }, { type:'kpi', items:ctx => {
            const r = hoy(ctx);
            return [['Personal registrado', r.length, 'Personas con jornada hoy.'], ['Personal activo', r.filter(x => x.estado === 'En planta').length, 'Personas dentro de la planta en este momento.'], ['Turno terminado', r.filter(x => x.estado === 'Fuera de planta').length, 'Personas que ya salieron.']];
          } }] }
        ] },
        { type:'table', sub:'Visitantes', tip:'Visitantes que ingresaron hoy. Hoy no hay visitantes registrados.', h:110, minH:60, rows:() => [],
          cols:[T('iso', 'Date'), T('nombre', 'Nombre'), T('ced', 'Cedula'), T('area', 'Area'), T('cargo', 'Cargo'), T('lugar', 'Lugar'), T('com', 'Comentarios'), T('met', 'Metodo'), T('tipoV', 'TipoVisitante')] },
        { row:[
          { flex:1, type:'table', title:'Detalle de Almuerzo diario', sub:'Jornada Diaria', tip:'Personas que deben recibir almuerzo hoy, según su hora de ingreso.', h:470,
            rows:ctx => hoy(ctx).filter(r => r.almuerzo), sort:{ k:'salida', dir:1 },
            cols:[FE('iso'), CED(), T('nombre', 'Nombre'), DT('ingreso', 'IngresoJornada'), DT('salida', 'Hora Salida / actual'), N2('horas', 'Horas Jornada'), T('empresa', 'Empresa')] },
          { w:280, col:[{ title:'Total Almuerzos Mañana', tip:'Almuerzos para quienes entraron en la mañana.', ...almKpi('Mañana') }, { title:'Total Almuerzos Tarde', tip:'Almuerzos para quienes entraron en la tarde.', ...almKpi('Tarde') }] },
          { w:400, col:[
            { type:'table', title:'Error', tip:'Jornadas con error en el periodo elegido. Desliza a la derecha para ver el tipo de error.', h:170,
              rows:ctx => ctx.rows(ds.errores), sort:{ k:'iso', dir:1 }, cols:[FE('iso'), T('nombre', 'Nombre'), T('tipoJ', 'Tipo Jornada'), T('tipoError', 'TipoErrorJornada')] },
            { type:'nav', items:[uc('Detalle Error'), uc('Nómina')] },
            { type:'table', sub:'Mayor a 12 hrs', tip:'Jornadas de hoy de más de 12 horas.', h:170,
              rows:ctx => hoy(ctx).filter(r => r.horas > 12), sort:{ k:'horas', dir:-1 }, total:1,
              cols:[FE('iso'), T('nombre', 'Nombre'), DT('ingreso', 'IngresoJornada'), DT('salida', 'SalidaJornada'), N2('horas', 'Horas Jornada', SUM)] }
          ] }
        ] },
        { type:'table', title:'Historia Jornadas', sub:'Jornada Diaria', tip:'Todas las jornadas del periodo, primero las de más horas (normalmente sin salida registrada). Desliza a la derecha para ver todas las columnas.', h:420,
          rows:ctx => ctx.rows(ds.hist), sort:{ k:'horas', dir:-1 }, total:1,
          cols:[FE('iso'), { k:'ced', l:'Suma de Cedula', num:1 }, COD(), T('nombre', 'Nombre'), T('pos', 'Posicion'), DT('ingreso', 'IngresoJornada'), DT('salida', 'SalidaJornada'), N2('horas', 'Horas Jornada', SUM), T('empresa', 'Empresa'), T('turno', 'Turno'), FE('curso', 'CursoSeguridad', { cf:cursoCF }), T('placa', 'Placa'), T('comentario', 'Comentarios')] }
      ]
    }] };
  };

  /* =======================================================================
     TABLERO PRINCIPAL — pestaña Nómina (loc12, loc13)
     ======================================================================= */
  LD.main.lbNom = () => {
    const rows = D.mainNomina().rows;
    const f = ctx => ctx.rows(rows);
    return { id:'lbNom', title:'Nómina', corte:'12/10/2026', optRows:() => rows,
      tip:'Revisión de nómina del personal de todas las plantas: dominicales, jornadas nocturnas, extras y detalle por jornada y semana.',
      filters:[Fl.clusterPlanta(), Fl.fecha(), Fl.semana(), Fl.nombre(), Fl.turno(), Fl.tipoDia()],
      blocks:[
        { row:[
          { flex:1, type:'table', title:'Revisión nómina', round:1, tip:'Por persona y planta: cuántos dominicales o festivos diurnos y nocturnos, jornadas nocturnas y jornadas de 12 horas o más.', h:400,
            rows:ctx => personRows(f(ctx), (l, r0) => ({ nombre:r0.nombre, planta:r0.planta, domD:sumBy(l, 'domD'), domN:sumBy(l, 'domN'), jornN:sumBy(l, 'jornN'), may12:sumBy(l, 'may12') })), sort:{ k:'nombre', dir:1 }, total:1,
            cols:[T('nombre', 'NombreE'), T('planta', 'PlantaAsignacion'), N0('domD', 'Suma de Dominicales o festivos diurnos', SUM), N0('domN', 'Suma de Dominicales o festivos nocturnos', SUM), N0('jornN', 'Suma de Jornadas nocturnas (Lun-Sab)', SUM), N0('may12', 'Suma de Mayor o igual a 12h', SUM)] },
          { w:430, type:'table', title:'Revisión nómina', round:1, tip:'Extras semanales diurnas (1061) y nocturnas (1062) por persona.', h:400,
            rows:ctx => personRows(f(ctx), (l, r0) => ({ nombre:r0.nombre, w1061:sumBy(l, 'w1061'), w1062:sumBy(l, 'w1062') })), sort:{ k:'nombre', dir:1 }, total:1,
            cols:[T('nombre', 'Nombre', { wrap:1 }), N0('w1061', 'Horas Extras Semanal Diurna 1061', SUM), N0('w1062', 'Horas Extras Semanal Nocturna 1062', SUM)] }
        ] },
        { type:'table', title:'Detalle de jornadas', tip:'Una fila por jornada con horas, turno y horas de pago. Clic en un encabezado para ordenar.', h:350,
          rows:f, sort:{ k:'iso', dir:-1 }, total:1,
          cols:[FE('iso'), T('planta', 'PlantaAsignacion'), T('tipoDia', 'Día'), T('tipoDia', 'TipoDia'), COD(), T('nombre', 'NombreE', { wrap:1 }), DT('ingreso', 'Hora Ingreso'), DT('salida', 'Hora Salida'), T('tipoJ', 'Tipo Jornada'), N2('horas', 'Horas Jornada', SUM), T('turno', 'Turno', { wrap:1 }), N2('extD', 'Horas Extra Diurnas'), N2('extN', 'Horas Extra Noc', SUM), N2('extDD', 'Horas Extra Diurnas Dom'), N2('recN', 'Horas Recargo Nocturno', SUM), N2('recD', 'Horas Recargo Dom', SUM), N2('recDN', 'Horas Recargo Dominical Nocturno', SUM)] },
        { row:[
          { flex:1, type:'table', title:'Detalle semana', tip:'Por semana y persona: extras 1061 y 1062 y cuántos días hizo de cada turno. Desliza a la derecha para ver todos los turnos.', h:370,
            rows:ctx => weekRows(f(ctx)), sort:{ k:'nombre', dir:1 }, total:1, cols:semanaCols(true) },
          { flex:1, ...consolidaSemana(ctx => f(ctx)) }
        ] }
      ] };
  };

  /* =======================================================================
     TABLERO PRINCIPAL — pestaña Ocupacion_As (loc14 a loc21)
     ======================================================================= */
  LD.main.lbOcu = () => {
    const ds = D.ocupacion();
    const rows = ds.rows;
    const f = (ctx, o) => ctx.rows(rows, o);
    const ocuCF = v => (v == null ? null : v >= 75 ? '#c5dec5' : v >= 60 ? '#efe19a' : '#f0b4b8');
    const barCF = v => (v >= 75 ? '#d2f2dc' : v >= 60 ? '#f3e6b3' : '#f2c8cf');
    const preCF = v => (v == null ? null : v <= 0.5 ? '#c5dec5' : v <= 1 ? '#efe19a' : '#f0b4b8');
    const alisCF = v => (v == null ? null : v <= 25 ? '#c5dec5' : v <= 35 ? '#efe19a' : '#f0b4b8');
    const plants = (ctx, o) => {
      const g = group(f(ctx, o), r => r.planta);
      return LD.OCU_ORDER.filter(p => g.has(p.planta)).map(p => ({ ...p, list:g.get(p.planta) }));
    };
    const avgLive = (l, k) => { const x = l.filter(r => r[k] != null); return x.length ? avgBy(x, k) : null; };
    const plantCols = (k, title) => ctx => plants(ctx, { noCross:true }).filter(p => avgLive(p.list, k) != null && p.planta !== 'Cucuta').map(p => {
      const v = avgLive(p.list, k);
      return { label:p.planta, field:p.planta, v, cluster:p.cluster, tip:[['Planta', p.planta], ['Cluster', p.cluster], [title, F.n2(v)]] };
    });
    return { id:'lbOcu', title:'Ocupación vs Productividad', optRows:() => rows,
      tip:'Qué tan ocupado estuvo el personal frente a su productividad, por planta, con el detalle de cada jornada y sus tiempos.',
      filters:[Fl.clusterPlanta(), Fl.fecha(null, r => [...new Set(r.map(x => x.iso))]), Fl.nombre('Nombre'), Fl.tipoDia()],
      blocks:[
        { type:'combo', title:'Detalle productividad vs ocupación', tip:'Columnas: ocupación promedio (verde 75% o más, amarillo 60% a 75%, rojo menos de 60%). Línea: productividad rodando. Clic en una planta para filtrar la página.',
          catField:'planta', W:1560, H:260, levels:['anio', 'nombrePlanta', 'cluster'], xTitle:'Mes', cf:barCF, legend:[['Ocupación Promedio', '#4c9df0'], ['Productividad_Rodando', '#a992dc']],
          data:ctx => plants(ctx, { noCross:true }).map(p => {
            const bar = avgLive(p.list, 'ocup'), line = avgLive(p.list, 'prod');
            return { label:p.list[0].mes, anio:String(p.list[0].anio), nombrePlanta:p.planta, cluster:p.cluster, field:p.planta, bar, line,
              tip:[['Planta', p.planta], ['Cluster', p.cluster], ['Ocupación Promedio', bar == null ? '(En blanco)' : F.pct(bar)], ['Productividad_Rodando', F.n1(line)]] };
          }) },
        { type:'table', title:'Detalle de jornadas', tip:'Una fila por jornada, ordenada por % de ocupación de menor a mayor. Desliza a la derecha para ver viajes, tiempos, ocupación e integridad.', h:340,
          rows:f, sort:{ k:'ocup', dir:1 }, total:1,
          cols:[T('nombre', 'Nombre'), T('pos', 'Posicion'), T('plantaReg', 'Planta Registro'), DT('ingreso', 'IngresoJornada'), DT('salida', 'SalidaJornada'), N2('vol', 'Volumen', SUM), T('jornadaFinal', 'JornadaFinal'), N2('horas', 'Total Jornadas (Hrs)', SUM), N2('ciclo', 'Tiempo de ciclo', SUM), N2('cicloPP', 'Tiempo de ciclo + preoperativo + Postoperativo', SUM), N0('viajes', 'Viajes', SUM), DT('primerCargue', 'Primer Cargue'), N2('preop', 'Preoperativo', SUM), DT('llegUltimo', 'Llegada Último Viaje'), N2('postop', 'Postoperativo', SUM), N2('encol', 'Encolamiento', SUM), N2('alist', 'Tiempo Alistamiento Prom', { tot:'avg' }), N0('entre', 'Tiempo Entre Viaje', SUM),
            { k:'ocup', l:'% Ocupación', num:1, f:F.pct, cf:v => ocuCF(v), tot:rs => avgLive(rs, 'ocup') }, { k:'integ', l:'% Integridad', num:1, f:F.pct, tot:rs => avgLive(rs, 'integ') }, T('regDesp', 'Registro después de cargue')] },
        { type:'table', title:'Programación y cumplimiento', tip:'Compara lo programado con lo ejecutado: preoperativo (verde hasta 0,5 h) y alistamiento del viaje (verde hasta 25 min, rojo más de 35). Desliza a la derecha para ver todo.', h:340,
          rows:f, sort:{ k:'horaProg', dir:1 }, total:1,
          cols:[T('nombre', 'Nombre', { wrap:1 }), T('pos', 'Posicion'), T('plantaReg', 'Planta Registro'), DT('ingreso', 'Ingreso Jornada'), T('horaProg', 'Hora Programación'), T('horaMalla', 'Hora Malla'), DT('primerCargue', 'Primer Cargue'), T('pcMalla', 'Primer Cargue Malla'), N2('preop', 'Preoperativo', { tot:'sum', cf:v => preCF(v) }), { k:'horaEntrega', l:'HoraEntrega', f:F.hm }, T('horaEntMalla', 'Hora Entrega Malla'), { k:'llegObra', l:'Llegada Obra', f:F.hm }, N0('alistV', 'Tiempo Alistamiento Viaje', { tot:'sum', cf:v => alisCF(v) }), T('obra', 'Obra Primer Viaje', { wrap:1 }), T('obraProg', 'Obra Programación')] },
        { row:[
          { flex:1, type:'table', title:'Jornada con 0 viajes', tip:'Jornadas en las que la persona no hizo ningún viaje.', h:360, rows:ctx => f(ctx).filter(r => r.viajes === 0), sort:{ k:'iso', dir:1 },
            cols:[FE('iso'), T('nombre', 'Nombre', { wrap:1 }), N2('horas', 'Jornadas')] },
          { flex:1, type:'table', title:'Jornada con 1 viaje', tip:'Jornadas en las que la persona hizo un solo viaje.', h:360, rows:ctx => f(ctx).filter(r => r.viajes === 1), sort:{ k:'iso', dir:1 },
            cols:[FE('iso'), T('nombre', 'Nombre', { wrap:1 }), N2('horas', 'Jornadas')] },
          { flex:1.3, type:'hpair', title:'Contedo de jornadas con 0 y 1 viaje', box:false, tip:'Por planta, cuántas jornadas tuvieron 0 y 1 viaje. Desliza hacia abajo para ver todas las plantas y haz clic en una para filtrar la página.',
            catField:'planta', catTitle:'Nombre_planta', colors:['#118dff', '#12239e'], legend:[['Personas 0 Viajes', '#118dff'], ['Personas 1 Viaje', '#12239e']], boxH:340,
            data:ctx => plants(ctx, { noCross:true }).map(p => ({ label:p.planta, field:p.planta, a:p.list.filter(r => r.viajes === 0).length, b:p.list.filter(r => r.viajes === 1).length })).sort((x, y) => y.a - x.a || y.b - x.b) }
        ] },
        { type:'columns', title:'Tiempo de encolamiento entre viajes AS', box:false, tip:'Horas promedio en cola por planta. Clic en una columna para filtrar la página.', catField:'planta', W:1560, H:200, ticks:[0, 0.5, 1, 1.5], levels:['cluster'], xTitle:'Planta_nombre', valTitle:'Encolamiento', data:plantCols('encol', 'Encolamiento') },
        { row:[
          { flex:1, type:'columns', title:'Tiempo Preoperativo', box:false, tip:'Horas promedio de preoperativo por planta. Clic en una columna para filtrar la página.', catField:'planta', W:780, H:220, ticks:[0, 0.5, 1, 1.5], rotate:1, levels:['cluster'], xTitle:'Planta_nombre', valTitle:'Preoperativo', valSize:11, data:plantCols('preop', 'Preoperativo') },
          { flex:1, type:'columns', title:'Tiempo Postoperativo', box:false, tip:'Horas promedio de postoperativo por planta. Clic en una columna para filtrar la página.', catField:'planta', W:780, H:220, ticks:[0, 0.5, 1, 1.5], rotate:1, levels:['cluster'], xTitle:'Planta_nombre', valTitle:'Postoperativo', valSize:11, data:plantCols('postop', 'Postoperativo') }
        ] },
        { type:'columns', title:'Tiempo entre viajes', box:false, tip:'Minutos promedio entre viajes por hora del día, planta y cluster. Desliza a la derecha para ver todas las plantas. Clic en una columna para filtrar por esa planta.',
          catField:'planta', scrollW:15, H:280, maxV:300, ticks:[0, 50, 100, 150, 200, 250, 300], tickF:'n0', catSize:9, valSize:11.5, labelEvery:1, levels:['plantaLbl', 'cluster'], xTitle:'HoraAbsoluta', valTitle:'Tiempo entre viajes',
          data:ctx => {
            const list = ctx.rows(ds.entre, { noCross:true }), order = LD.OCU_ORDER.map(p => p.planta), out = [];
            const byP = group(list, r => r.planta);
            order.forEach(pl => {
              const l = byP.get(pl);
              if (!l) return;
              const byH = group(l, r => r.hora);
              [...byH.keys()].sort((a, b) => a - b).forEach((h, i) => {
                const v = avgBy(byH.get(h), 'gap');
                out.push({ label:String(h), field:pl, plantaLbl:pl, cluster:l[0].cluster, v, lbl:v >= 30 || i % 4 === 0, tip:[['Planta', pl], ['Hora', h], ['Tiempo entre viajes', F.n2(v)]] });
              });
            });
            return out;
          } }
      ] };
  };
})();
