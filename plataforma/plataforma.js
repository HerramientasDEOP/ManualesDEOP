/* =========================================================================
   Plataforma de manuales — Fase 1: registro/login @cemex.com y registro de
   consultas. Archivo compartido por index.html (raíz) y los 3 manuales.

   Todas las funciones devuelven promesas. Los errores rechazan con:
     { tipo:'red' }                          -> fetch falló (sin red, CORS, Zscaler, timeout)
     { tipo:'api', status, error, mensaje }  -> la API respondió con un error
   ========================================================================= */
(function(){
  const API = 'https://manuales-api.santiagoandres-ortiz.workers.dev';
  const TIMEOUT_MS = 12000;
  const KEY_TOKEN = 'pfToken';
  const KEY_USUARIO = 'pfUsuario';

  /* ---------------- localStorage (siempre envuelto en try/catch) ---------------- */
  function leer(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function escribir(key, val){ try{ localStorage.setItem(key, val); }catch(e){} }
  function borrar(key){ try{ localStorage.removeItem(key); }catch(e){} }

  function getToken(){ return leer(KEY_TOKEN); }
  function getUsuario(){ try{ return JSON.parse(leer(KEY_USUARIO)) || null; }catch(e){ return null; } }
  function guardarSesion(token, usuario){
    escribir(KEY_TOKEN, token);
    escribir(KEY_USUARIO, JSON.stringify(usuario || null));
  }
  function limpiarSesion(){ borrar(KEY_TOKEN); borrar(KEY_USUARIO); }

  /* ---------------- Validaciones del lado del navegador ---------------- */
  function normalizarCorreo(email){ return String(email || '').trim().toLowerCase(); }
  function correoValido(email){ return /^[^\s@]+@cemex\.com$/.test(normalizarCorreo(email)); }

  /* ---------------- POST JSON con distinción red / API ---------------- */
  function post(ruta, body, opts){
    opts = opts || {};
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    return fetch(API + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctrl ? ctrl.signal : undefined,
      keepalive: !!opts.keepalive
    }).then(res => res.json().then(
      data => ({ res, data }),
      // Respuesta no-JSON (p. ej. página intermedia de Zscaler) => se trata como falla de red
      () => { throw { tipo: 'red' }; }
    ), () => { throw { tipo: 'red' }; })
      .then(({ res, data }) => {
        if (!res.ok || !data || data.ok === false){
          throw {
            tipo: 'api',
            status: res.status,
            error: (data && data.error) || 'error',
            mensaje: (data && data.mensaje) || 'Ocurrió un error. Intenta de nuevo.'
          };
        }
        return data;
      })
      .finally(() => { if (timer) clearTimeout(timer); });
  }

  /* ---------------- API pública ---------------- */
  function registrar(nombre, email){
    return post('/register', { nombre: String(nombre || '').trim(), email: normalizarCorreo(email) })
      .then(data => { guardarSesion(data.token, data.usuario); return data.usuario; });
  }

  function ingresar(email){
    return post('/login', { email: normalizarCorreo(email) })
      .then(data => { guardarSesion(data.token, data.usuario); return data.usuario; });
  }

  // Resuelve con el usuario si el token guardado sigue vigente, o null si no hay
  // token / la sesión ya no es válida. Rechaza solo si falla la red.
  function validarSesion(){
    const token = getToken();
    if (!token) return Promise.resolve(null);
    return post('/session', { token })
      .then(data => {
        if (data.usuario) escribir(KEY_USUARIO, JSON.stringify(data.usuario));
        return data.usuario || getUsuario();
      })
      .catch(err => {
        if (err && err.tipo === 'api'){ limpiarSesion(); return null; }
        throw err;
      });
  }

  // "Fire and forget": nunca rechaza ni lanza, para no romper el manual.
  function registrarConsulta(manual, seccion){
    try{
      const token = getToken();
      if (!token) return Promise.resolve(false);
      return post('/manual-view', { token, manual, seccion }, { keepalive: true })
        .then(data => !!data.registrado)
        .catch(err => {
          if (err && err.tipo === 'api' && err.status === 401) limpiarSesion();
          return false;
        });
    }catch(e){ return Promise.resolve(false); }
  }

  function salir(){
    const token = getToken();
    limpiarSesion();
    if (!token) return Promise.resolve();
    return post('/logout', { token }, { keepalive: true }).then(() => {}, () => {});
  }

  function activarConexion(){
    try{ window.open(API + '/activar', '_blank'); }catch(e){}
  }

  window.Plataforma = {
    API,
    registrar, ingresar, validarSesion, registrarConsulta, salir,
    activarConexion, correoValido, getUsuario, getToken
  };
})();
