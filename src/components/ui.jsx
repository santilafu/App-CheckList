/* =========================================================================
   COMPONENTES PEQUEÑOS REUTILIZABLES
   -------------------------------------------------------------------------
   Marco  → layout común (cabecera + contenedor centrado).
   Campo  → input con etiqueta.
   DatoActa → par etiqueta/valor para el acta.
   Pildora → tarjeta de métrica (número grande + etiqueta).
   ========================================================================= */

export function Marco({ children, titulo, onVolver, onAjustes }) {
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <header className="sticky top-0 z-10 border-b-2 border-orange-500 bg-slate-900 px-4 py-3 text-white no-print">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {onVolver && <button onClick={onVolver} className="text-orange-400 hover:text-orange-300">‹ Volver</button>}
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-widest text-orange-400">Rondas · Inspección</p>
            <h1 className="text-lg font-bold leading-tight">{titulo || "Mis inspecciones"}</h1>
          </div>
          {onAjustes && <button onClick={onAjustes} className="text-orange-400 hover:text-orange-300" title="Ajustes">⚙</button>}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
    </div>
  );
}

export function Campo({ label, valor, onCambio, placeholder, tipo = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <input type={tipo} value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-orange-400" />
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
    <div className="rounded-lg border border-slate-200 bg-white py-2 shadow-sm">
      <p className={"text-xl font-bold " + color}>{valor}</p>
      <p className="text-xs text-slate-400">{etiqueta}</p>
    </div>
  );
}
