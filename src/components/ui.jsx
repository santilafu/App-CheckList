/* =========================================================================
   COMPONENTES PEQUEÑOS REUTILIZABLES
   -------------------------------------------------------------------------
   Marco  → layout común (cabecera + contenedor centrado + toggle de tema).
   Campo  → input con etiqueta.
   DatoActa → par etiqueta/valor para el acta (SIEMPRE en claro: es un
              documento imprimible, no lleva variantes dark).
   Pildora → tarjeta de métrica (número grande + etiqueta).
   ========================================================================= */

export function Marco({ children, titulo, onVolver, onAjustes, tema, onToggleTema }) {
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b-2 border-orange-500 bg-slate-900 px-4 py-3 text-white no-print">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {onVolver && <button onClick={onVolver} className="text-orange-400 hover:text-orange-300">‹ Volver</button>}
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-widest text-orange-400">Rondas · Inspección</p>
            <h1 className="text-lg font-bold leading-tight">{titulo || "Mis inspecciones"}</h1>
          </div>
          {onToggleTema && (
            <button onClick={onToggleTema} className="text-orange-400 hover:text-orange-300" title="Cambiar tema" aria-label="Cambiar tema claro/oscuro">
              {tema === "dark" ? "☀" : "🌙"}
            </button>
          )}
          {onAjustes && <button onClick={onAjustes} className="text-orange-400 hover:text-orange-300" title="Ajustes">⚙</button>}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
    </div>
  );
}

export function Campo({ label, valor, onCambio, placeholder, tipo = "text", multilinea = false, filas = 3 }) {
  const clases = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {multilinea ? (
        <textarea value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} rows={filas} className={clases + " resize-y"} />
      ) : (
        <input type={tipo} value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} className={clases} />
      )}
    </label>
  );
}

export function DatoActa({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{etiqueta}</p>
      <p className="font-medium text-slate-800">{valor || "—"}</p>
    </div>
  );
}

export function Pildora({ etiqueta, valor, color }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className={"text-xl font-bold " + color}>{valor}</p>
      <p className="text-xs text-slate-400">{etiqueta}</p>
    </div>
  );
}
