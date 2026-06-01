/* =========================================================================
   MARCA DE EMPRESA (branding) — tarjeta dentro de Ajustes
   -------------------------------------------------------------------------
   Permite subir un logo (se reescala a 512px máx para no ocupar de más) y
   elegir un color de marca. Ambos se aplican al acta y al PDF.
   ========================================================================= */
const COLOR_POR_DEFECTO = "#f97316";

export function MarcaEmpresa({ logo, color, onLogo, onColor }) {
  function subirLogo(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      // Reescalamos con un canvas para que el logo no pese de más.
      const img = new Image();
      img.onload = () => {
        const max = 512;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        onLogo(canvas.toDataURL("image/png"));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
    e.target.value = "";
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Marca de empresa</span>
      <p className="mb-3 text-xs text-slate-400">Tu logo y color aparecerán en las actas y los PDF.</p>

      <div className="flex items-center gap-3">
        {logo ? (
          <img src={logo} alt="logo" className="max-h-12 max-w-[120px] rounded border border-slate-200 bg-white object-contain p-1 dark:border-slate-700" />
        ) : (
          <div className="flex h-12 w-[120px] items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">Sin logo</div>
        )}
        <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
          {logo ? "Cambiar logo" : "Subir logo"}
          <input type="file" accept="image/*" onChange={subirLogo} className="hidden" />
        </label>
        {logo && (
          <button onClick={() => onLogo(null)} className="text-sm text-slate-400 hover:text-red-500">Quitar</button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-slate-600 dark:text-slate-300">Color de marca</span>
        <input type="color" value={color || COLOR_POR_DEFECTO} onChange={(e) => onColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white dark:border-slate-700" />
        <span className="font-mono text-xs text-slate-400">{color || COLOR_POR_DEFECTO}</span>
        {(color || COLOR_POR_DEFECTO) !== COLOR_POR_DEFECTO && (
          <button onClick={() => onColor(COLOR_POR_DEFECTO)} className="text-sm text-slate-400 hover:text-orange-500">Restablecer</button>
        )}
      </div>
    </div>
  );
}
