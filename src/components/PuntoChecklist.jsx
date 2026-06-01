import { ESTADOS } from "../data/plantillas";

/* =========================================================================
   PUNTO DEL CHECKLIST — una fila al rellenar la inspección
   -------------------------------------------------------------------------
   Botones de estado (OK / No OK / N/A), comentario y foto opcional.
   Si está en "No OK" sin comentario, lo resalta en ámbar (recomendación).
   ========================================================================= */

export function PuntoChecklist({ item, indice, resultado, onActualizar }) {
  function leerFoto(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => onActualizar({ ...resultado, foto: lector.result });
    lector.readAsDataURL(archivo);
  }
  const koSinComentario = resultado.estado === "ko" && !resultado.comentario.trim();

  return (
    <div className={"rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 " + (koSinComentario ? "border-amber-300 dark:border-amber-500/60" : "border-slate-200 dark:border-slate-800")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-800 font-mono text-sm font-bold text-orange-400">{indice + 1}</span>
        <p className="flex-1 font-medium text-slate-800 dark:text-slate-100">{item.texto}</p>
      </div>
      <div className="mt-3 flex gap-2">
        {ESTADOS.map((est) => {
          const activo = resultado.estado === est.valor;
          return (
            <button key={est.valor} onClick={() => onActualizar({ ...resultado, estado: est.valor })}
              className={"flex-1 rounded-lg py-2.5 text-sm font-bold transition " + (activo ? est.clase + " shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700")}>
              {est.etiqueta}
            </button>
          );
        })}
      </div>
      <input type="text" value={resultado.comentario} onChange={(e) => onActualizar({ ...resultado, comentario: e.target.value })}
        placeholder={koSinComentario ? "Recomendado: explica el “No OK”…" : "Comentario (opcional)…"}
        className={"mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-orange-400 dark:text-slate-100 " + (koSinComentario ? "border-amber-300 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-950/40" : "border-slate-200 dark:border-slate-700 dark:bg-slate-800")} />
      <div className="mt-3 flex items-center gap-3">
        <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
          {resultado.foto ? "Cambiar foto" : "📷 Añadir foto"}
          <input type="file" accept="image/*" capture="environment" onChange={leerFoto} className="hidden" />
        </label>
        {resultado.foto && (
          <div className="flex items-center gap-2">
            <img src={resultado.foto} alt="foto" className="h-12 w-12 rounded-lg object-cover" />
            <button onClick={() => onActualizar({ ...resultado, foto: null })} className="text-xs text-slate-400 hover:text-red-500">quitar</button>
          </div>
        )}
      </div>
    </div>
  );
}
