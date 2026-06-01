/* =========================================================================
   ALMACÉN — persistencia simple sobre localStorage
   -------------------------------------------------------------------------
   Envuelve localStorage con manejo de errores (modo incógnito, cuota llena,
   JSON corrupto…) para que la app nunca pete por culpa del almacenamiento.
   ========================================================================= */

export const almacen = {
  leer(clave, porDefecto) {
    try {
      const txt = window.localStorage.getItem(clave);
      return txt ? JSON.parse(txt) : porDefecto;
    } catch {
      return porDefecto;
    }
  },
  guardar(clave, valor) {
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      /* almacenamiento no disponible: seguimos sin persistir */
    }
  },
};
