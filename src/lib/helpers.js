/* =========================================================================
   AYUDAS — funciones puras reutilizables
   ========================================================================= */

// Resultado por defecto de un punto que aún no se ha rellenado.
const RESULTADO_VACIO = { estado: null, comentario: "", foto: null };

// Devuelve el resultado de un punto de forma segura. Si el acta es antigua y
// la plantilla cambió (faltan ítems), devolvemos un resultado vacío en vez de
// petar con "cannot read property of undefined".
export function resultadoDe(resultados, id) {
  return (resultados && resultados[id]) || RESULTADO_VACIO;
}

// Cuenta OK / No OK / N/A / pendientes y decide el veredicto (APTO si no hay
// ningún "No OK").
export function calcularResumen(items, resultados) {
  let ok = 0, ko = 0, na = 0, pend = 0;
  items.forEach((it) => {
    const e = resultadoDe(resultados, it.id).estado;
    if (e === "ok") ok++;
    else if (e === "ko") ko++;
    else if (e === "na") na++;
    else pend++;
  });
  return { ok, ko, na, pend, total: items.length, apto: ko === 0 };
}

// Crea el mapa de resultados vacíos para una plantilla.
export function resultadosVacios(plt) {
  const obj = {};
  plt.items.forEach((it) => (obj[it.id] = { ...RESULTADO_VACIO }));
  return obj;
}

// Fecha de hoy en formato ISO corto (YYYY-MM-DD), para inputs date.
export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

// Timestamp actual (id de los registros). Aislado aquí para no llamar a una
// función impura (Date.now) dentro del componente.
export function ahora() {
  return Date.now();
}

// Genera un id único y estable. Un contador a nivel de módulo evita colisiones
// aunque se generen varios ids en el mismo milisegundo.
let _contadorId = 0;
export function uid(prefijo = "id") {
  _contadorId += 1;
  return `${prefijo}-${Date.now().toString(36)}-${_contadorId}`;
}

// Formatea un id (timestamp) como fecha y hora legible en español.
export function fechaHora(id) {
  return new Date(id).toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Descarga un texto como archivo (CSV, JSON…). En tu PC funciona; en una vista
// previa embebida puede estar limitado.
export function descargar(texto, nombre, tipo) {
  const blob = new Blob([texto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

// Escapa un campo para CSV (comillas y separador). Separador ';' para Excel ES.
export function campoCSV(v) {
  const s = String(v == null ? "" : v).replace(/"/g, '""');
  return `"${s}"`;
}
