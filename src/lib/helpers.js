/* =========================================================================
   AYUDAS — funciones puras reutilizables
   ========================================================================= */

// Tipo de un punto del checklist. Compatibilidad: sin tipo = "estado".
export function tipoDe(item) {
  return item.tipo || "estado";
}

// Resultado por defecto según el tipo del punto.
export function resultadoVacioPara(item) {
  const t = tipoDe(item);
  if (t === "numero") return { valor: "", comentario: "", foto: null };
  if (t === "texto") return { texto: "", comentario: "", foto: null };
  return { estado: null, comentario: "", foto: null };
}

const RESULTADO_VACIO = { estado: null, comentario: "", foto: null };

// Devuelve el resultado de un punto de forma segura. Si el acta es antigua y
// la plantilla cambió (faltan ítems), devolvemos un resultado vacío en vez de
// petar con "cannot read property of undefined".
export function resultadoDe(resultados, id) {
  return (resultados && resultados[id]) || RESULTADO_VACIO;
}

// Veredicto de un punto: "ok" | "ko" | "na" | "info" | "pend".
//  - estado: el estado marcado (o "pend" si no hay).
//  - numero: dentro de rango = ok, fuera = ko, sin rango = info, vacío = pend.
//  - texto: siempre "info" (no afecta al APTO/NO APTO).
export function veredictoPunto(item, res) {
  const t = tipoDe(item);
  if (t === "numero") {
    if (res.valor === "" || res.valor == null) return "pend";
    const v = Number(res.valor);
    if (Number.isNaN(v)) return "pend";
    const min = item.min === "" || item.min == null ? null : Number(item.min);
    const max = item.max === "" || item.max == null ? null : Number(item.max);
    if ((min != null && v < min) || (max != null && v > max)) return "ko";
    if (min == null && max == null) return "info";
    return "ok";
  }
  if (t === "texto") return "info";
  return res.estado || "pend";
}

// Texto del resultado de un punto para mostrar en acta / PDF / CSV.
const ETIQUETA_ESTADO = { ok: "OK", ko: "No OK", na: "N/A" };
export function textoResultado(item, res) {
  const t = tipoDe(item);
  if (t === "numero") {
    if (res.valor === "" || res.valor == null) return "—";
    return `${res.valor}${item.unidad ? " " + item.unidad : ""}`;
  }
  if (t === "texto") return (res.texto || "").trim() || "—";
  return ETIQUETA_ESTADO[res.estado] || "—";
}

// Texto descriptivo del rango/unidad de un punto numérico (pista al rellenar).
export function rangoTexto(item) {
  const u = item.unidad ? ` ${item.unidad}` : "";
  const tieneMin = item.min != null && item.min !== "";
  const tieneMax = item.max != null && item.max !== "";
  if (tieneMin && tieneMax) return `Rango: ${item.min}–${item.max}${u}`;
  if (tieneMin) return `Mín: ${item.min}${u}`;
  if (tieneMax) return `Máx: ${item.max}${u}`;
  return item.unidad ? `Unidad: ${item.unidad}` : "";
}

// Cuenta por veredicto y decide APTO (sin ningún "No OK"). "info" = lecturas
// informativas (texto / números sin rango) que no afectan al veredicto.
export function calcularResumen(items, resultados) {
  let ok = 0, ko = 0, na = 0, info = 0, pend = 0;
  items.forEach((it) => {
    const v = veredictoPunto(it, resultadoDe(resultados, it.id));
    if (v === "ok") ok++;
    else if (v === "ko") ko++;
    else if (v === "na") na++;
    else if (v === "info") info++;
    else pend++;
  });
  return { ok, ko, na, info, pend, total: items.length, apto: ko === 0 };
}

// Crea el mapa de resultados vacíos para una plantilla (según el tipo de cada
// punto).
export function resultadosVacios(plt) {
  const obj = {};
  plt.items.forEach((it) => (obj[it.id] = resultadoVacioPara(it)));
  return obj;
}

// Fecha de hoy en formato ISO corto (YYYY-MM-DD), para inputs date.
export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

// Hora actual en formato HH:MM, para inputs time.
export function horaActual() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Formatea el número de acta correlativo (entero) como "0001".
export function numeroActa(n) {
  return n ? String(n).padStart(4, "0") : "—";
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
