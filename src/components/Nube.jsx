import { useState } from "react";
import { Campo } from "./ui";

/* =========================================================================
   NUBE — tarjeta de cuenta y sincronización (dentro de Ajustes)
   -------------------------------------------------------------------------
   Tres estados:
     - sin configurar: explica que falta Supabase.
     - sin sesión: formulario de email/contraseña (entrar o crear cuenta).
     - con sesión: email del usuario, "Sincronizar ahora" y "Cerrar sesión".
   Toda la lógica (auth + sync) vive en App; aquí solo está la interfaz.
   ========================================================================= */

export function Nube({ hayNube, usuario, estado, sincronizando, onLogin, onRegistro, onLogout, onSync }) {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");

  const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900";
  const titulo = <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Nube · Sincronización</span>;

  if (!hayNube) {
    return (
      <div className={"mt-3 " + card}>
        {titulo}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          La sincronización en la nube no está configurada. Añade las variables
          <code className="mx-1 rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">VITE_SUPABASE_URL</code>
          y
          <code className="mx-1 rounded bg-slate-100 px-1 text-xs dark:bg-slate-800">VITE_SUPABASE_ANON_KEY</code>
          para activarla. La app funciona igual en modo local.
        </p>
      </div>
    );
  }

  if (usuario) {
    return (
      <div className={"mt-3 " + card}>
        {titulo}
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Sesión iniciada como <span className="font-semibold">{usuario.email}</span>
        </p>
        {estado && <p className="mt-1 text-xs text-slate-400">{estado}</p>}
        <div className="mt-3 flex gap-2">
          <button onClick={onSync} disabled={sincronizando}
            className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60">
            {sincronizando ? "Sincronizando…" : "🔄 Sincronizar ahora"}
          </button>
          <button onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={"mt-3 " + card}>
      {titulo}
      <div className="space-y-3">
        <Campo label="Email" tipo="email" valor={email} onCambio={setEmail} placeholder="tu@correo.com" />
        <Campo label="Contraseña" tipo="password" valor={clave} onCambio={setClave} placeholder="mínimo 6 caracteres" />
        {estado && <p className="text-xs text-amber-600 dark:text-amber-400">{estado}</p>}
        <div className="flex gap-2">
          <button onClick={() => onLogin(email, clave)} disabled={sincronizando}
            className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60">
            Entrar
          </button>
          <button onClick={() => onRegistro(email, clave)} disabled={sincronizando}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  );
}
