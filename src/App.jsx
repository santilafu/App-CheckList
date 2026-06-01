import { useState, useRef, useEffect } from "react";

import { PLANTILLAS_BASE, ESTADOS } from "./data/plantillas";
import { almacen } from "./lib/almacen";
import {
  calcularResumen, resultadosVacios, resultadoDe,
  hoy, ahora, uid, fechaHora, descargar, campoCSV,
} from "./lib/helpers";
import { Marco, Campo, DatoActa, Pildora } from "./components/ui";
import { Firma } from "./components/Firma";
import { PuntoChecklist } from "./components/PuntoChecklist";

/* =========================================================================
   APP DE CHECKLISTS / RONDAS DE INSPECCIÓN
   -------------------------------------------------------------------------
   Orquestador de vistas + estado global. La lógica pesada (helpers, almacén,
   plantillas) y los componentes viven en sus propios archivos.

   Funcionalidades:
   - Editor de plantillas (crea / edita / duplica / borra checklists propios).
   - Panel de estadísticas (% actas aptas + ranking de puntos que más fallan).
   - Exportación a CSV (resumen global y detalle de un acta).
   - Filtros y orden del listado (APTO/NO APTO, plantilla, fecha, búsqueda).
   - Autoguardado del borrador, copia de seguridad JSON, firma y fotos.
   - Editar un acta ya guardada (reusa la vista de rellenar; ver `editandoId`).
   - Modo claro / oscuro con toggle, persistido en `tema`.

   PDF = imprimir desde el navegador. Persistencia = localStorage.
   ========================================================================= */

export default function App() {
  const [vista, setVista] = useState("inicio");

  const [guardadas, setGuardadas] = useState(() => almacen.leer("inspecciones", []));
  useEffect(() => { almacen.guardar("inspecciones", guardadas); }, [guardadas]);

  // Plantillas creadas por el usuario.
  const [plantillasUsuario, setPlantillasUsuario] = useState(() => almacen.leer("plantillasUsuario", []));
  useEffect(() => { almacen.guardar("plantillasUsuario", plantillasUsuario); }, [plantillasUsuario]);
  const TODAS_PLANTILLAS = [...PLANTILLAS_BASE, ...plantillasUsuario];

  const [empresa, setEmpresa] = useState(() => almacen.leer("empresa", ""));
  useEffect(() => { almacen.guardar("empresa", empresa); }, [empresa]);

  // Tema claro/oscuro. Por defecto seguimos la preferencia del sistema; una vez
  // el usuario elige, se respeta su elección (persistida).
  const [tema, setTema] = useState(() => {
    const guardado = almacen.leer("tema", null);
    if (guardado) return guardado;
    const sistemaOscuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return sistemaOscuro ? "dark" : "light";
  });
  useEffect(() => {
    almacen.guardar("tema", tema);
    document.documentElement.classList.toggle("dark", tema === "dark");
  }, [tema]);
  const alternarTema = () => setTema(tema === "dark" ? "light" : "dark");

  const [borrador, setBorrador] = useState(() => almacen.leer("borrador", null));

  const [actaVista, setActaVista] = useState(null);
  const [editP, setEditP] = useState(null);     // plantilla en edición
  const [editandoId, setEditandoId] = useState(null); // id del acta que se edita (o null = nueva)

  // Filtros del listado
  const [busqueda, setBusqueda] = useState("");
  const [fVeredicto, setFVeredicto] = useState("todos"); // todos | apto | noapto
  const [fPlantilla, setFPlantilla] = useState("");
  const [orden, setOrden] = useState("desc"); // desc | asc

  // Inspección en curso
  const [plantilla, setPlantilla] = useState(PLANTILLAS_BASE[0]);
  const [cabecera, setCabecera] = useState({ inspector: "", equipo: "", fecha: hoy() });
  const [resultados, setResultados] = useState({});
  const [firma, setFirma] = useState(null);
  const [firmaInicial, setFirmaInicial] = useState(null);

  const inputImportar = useRef(null);

  // AUTOGUARDADO del borrador (guardamos la plantilla entera y si se está
  // editando un acta, por robustez al salir y volver).
  useEffect(() => {
    if (vista !== "rellenar") return;
    const b = { plantilla, cabecera, resultados, firma, editandoId };
    almacen.guardar("borrador", b);
    // Autoguardado intencionado: reflejamos el borrador en estado para que la
    // tarjeta "Inspección en curso" del inicio quede al día al volver.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBorrador(b);
  }, [vista, plantilla, cabecera, resultados, firma, editandoId]);

  function limpiarBorrador() { almacen.guardar("borrador", null); setBorrador(null); }

  function empezarConPlantilla(plt) {
    setPlantilla(plt);
    setCabecera({ inspector: "", equipo: "", fecha: hoy() });
    setResultados(resultadosVacios(plt));
    setFirma(null); setFirmaInicial(null);
    setEditandoId(null);
    setVista("rellenar");
  }
  function continuarBorrador() {
    setPlantilla(borrador.plantilla);
    setCabecera(borrador.cabecera);
    setResultados(borrador.resultados);
    setFirma(borrador.firma); setFirmaInicial(borrador.firma);
    setEditandoId(borrador.editandoId ?? null);
    setVista("rellenar");
  }
  function descartarBorrador() {
    if (window.confirm("¿Descartar la inspección en curso? Se perderá lo no finalizado.")) limpiarBorrador();
  }
  function repetir(registro) {
    const plt = TODAS_PLANTILLAS.find((p) => p.nombre === registro.plantilla) || { id: "tmp", nombre: registro.plantilla, items: registro.items };
    setPlantilla(plt);
    setCabecera({ inspector: registro.cabecera.inspector, equipo: registro.cabecera.equipo, fecha: hoy() });
    setResultados(resultadosVacios(plt));
    setFirma(null); setFirmaInicial(null);
    setEditandoId(null);
    setVista("rellenar");
  }
  // Editar un acta YA guardada: reconstruimos la plantilla a partir del propio
  // registro (sus items snapshot) y cargamos sus resultados/firma. Al finalizar
  // se ACTUALIZA ese registro en vez de crear uno nuevo.
  function editarActa(registro) {
    const plt = { id: "acta-" + registro.id, nombre: registro.plantilla, items: registro.items };
    const res = {};
    registro.items.forEach((it) => { res[it.id] = { ...resultadoDe(registro.resultados, it.id) }; });
    setPlantilla(plt);
    setCabecera({ ...registro.cabecera });
    setResultados(res);
    setFirma(registro.firma); setFirmaInicial(registro.firma);
    setEditandoId(registro.id);
    setVista("rellenar");
  }

  const resumen = vista === "rellenar" ? calcularResumen(plantilla.items, resultados) : null;

  function marcarRestantesOK() {
    const copia = { ...resultados };
    plantilla.items.forEach((it) => { if (!copia[it.id].estado) copia[it.id] = { ...copia[it.id], estado: "ok" }; });
    setResultados(copia);
  }

  function finalizar() {
    if (!cabecera.equipo.trim() || !cabecera.inspector.trim()) {
      window.alert("Indica el equipo/ubicación y el inspector antes de finalizar.");
      return;
    }
    const koSinComentario = plantilla.items.filter((it) => resultados[it.id].estado === "ko" && !resultados[it.id].comentario.trim()).length;
    if (koSinComentario > 0) {
      const pregunta = editandoId
        ? `Hay ${koSinComentario} punto(s) "No OK" sin comentario.\n¿Guardar los cambios igualmente?`
        : `Hay ${koSinComentario} punto(s) "No OK" sin comentario.\n¿Generar el acta igualmente?`;
      if (!window.confirm(pregunta)) return;
    }
    const ts = ahora();
    if (editandoId) {
      // Actualizamos el acta existente conservando su id (fecha de creación),
      // empresa original, etc., y dejamos constancia de la edición.
      const original = guardadas.find((g) => g.id === editandoId);
      const actualizado = { ...original, plantilla: plantilla.nombre, cabecera, resultados, firma, items: plantilla.items, editadoEn: ts };
      setGuardadas(guardadas.map((g) => (g.id === editandoId ? actualizado : g)));
      setActaVista(actualizado);
    } else {
      const registro = { id: ts, empresa, plantilla: plantilla.nombre, cabecera, resultados, firma, items: plantilla.items };
      setGuardadas([registro, ...guardadas]);
      setActaVista(registro);
    }
    setEditandoId(null);
    limpiarBorrador();
    setVista("acta");
  }

  function borrarGuardada(id) {
    if (window.confirm("¿Borrar esta inspección? No se puede deshacer.")) setGuardadas(guardadas.filter((g) => g.id !== id));
  }

  // --- Copia de seguridad JSON ---
  function exportarJSON() { descargar(JSON.stringify(guardadas, null, 2), `inspecciones-${hoy()}.json`, "application/json"); }
  function importarJSON(e) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (!window.confirm("Antes de importar, ten una copia exportada.\nLa importación NO borra: solo añade las que falten.\n¿Continuar?")) { e.target.value = ""; return; }
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const nuevas = JSON.parse(lector.result);
        if (!Array.isArray(nuevas)) throw new Error("formato");
        const ids = new Set(guardadas.map((g) => g.id));
        const aAñadir = nuevas.filter((n) => n && n.id && !ids.has(n.id));
        setGuardadas([...aAñadir, ...guardadas].sort((a, b) => b.id - a.id));
        window.alert(`Importadas ${aAñadir.length} inspección(es).`);
      } catch { window.alert("Archivo no válido."); }
      e.target.value = "";
    };
    lector.readAsText(archivo);
  }

  // --- CSV ---
  function exportarCSVTodas() {
    const cab = ["Fecha", "Empresa", "Plantilla", "Equipo", "Inspector", "Veredicto", "OK", "No OK", "N/A"];
    const filas = guardadas.map((g) => {
      const r = calcularResumen(g.items, g.resultados);
      return [fechaHora(g.id), g.empresa || "", g.plantilla, g.cabecera.equipo, g.cabecera.inspector, r.apto ? "APTO" : "NO APTO", r.ok, r.ko, r.na];
    });
    const csv = [cab, ...filas].map((fila) => fila.map(campoCSV).join(";")).join("\n");
    descargar("﻿" + csv, `resumen-inspecciones-${hoy()}.csv`, "text/csv");
  }
  function exportarCSVActa(g) {
    const cab = ["#", "Punto", "Estado", "Comentario"];
    const filas = g.items.map((it, i) => {
      const res = resultadoDe(g.resultados, it.id);
      const est = ESTADOS.find((e) => e.valor === res.estado);
      return [i + 1, it.texto, est ? est.etiqueta : "—", res.comentario || ""];
    });
    const csv = [cab, ...filas].map((fila) => fila.map(campoCSV).join(";")).join("\n");
    descargar("﻿" + csv, `acta-${g.cabecera.equipo || "inspeccion"}-${hoy()}.csv`, "text/csv");
  }

  // --- Editor de plantillas ---
  function nuevaPlantilla() {
    setEditP({ id: uid("u"), nombre: "", items: [{ id: uid("i"), texto: "" }], esNueva: true });
    setVista("editarPlantilla");
  }
  function editarPlantilla(plt) {
    setEditP({ id: plt.id, nombre: plt.nombre, items: plt.items.map((it) => ({ ...it })), esNueva: false });
    setVista("editarPlantilla");
  }
  function duplicarPlantilla(plt) {
    setEditP({ id: uid("u"), nombre: plt.nombre + " (copia)", items: plt.items.map((it) => ({ id: uid("i"), texto: it.texto })), esNueva: true });
    setVista("editarPlantilla");
  }
  function guardarPlantilla() {
    const items = editP.items.filter((it) => it.texto.trim());
    if (!editP.nombre.trim() || items.length === 0) {
      window.alert("La plantilla necesita un nombre y al menos un punto.");
      return;
    }
    const limpia = { id: editP.id, nombre: editP.nombre.trim(), items };
    if (editP.esNueva) setPlantillasUsuario([...plantillasUsuario, limpia]);
    else setPlantillasUsuario(plantillasUsuario.map((p) => (p.id === limpia.id ? limpia : p)));
    setEditP(null);
    setVista("plantillas");
  }
  function borrarPlantillaUsuario(id) {
    if (window.confirm("¿Borrar esta plantilla? Las actas ya creadas no se ven afectadas.")) setPlantillasUsuario(plantillasUsuario.filter((p) => p.id !== id));
  }

  // --- Listado filtrado y ordenado ---
  const listaFiltrada = guardadas
    .filter((g) => {
      const t = busqueda.toLowerCase();
      const coincide = (g.cabecera.equipo || "").toLowerCase().includes(t) || (g.cabecera.inspector || "").toLowerCase().includes(t);
      const r = calcularResumen(g.items, g.resultados);
      const verOk = fVeredicto === "todos" || (fVeredicto === "apto" && r.apto) || (fVeredicto === "noapto" && !r.apto);
      const pltOk = !fPlantilla || g.plantilla === fPlantilla;
      return coincide && verOk && pltOk;
    })
    .sort((a, b) => (orden === "desc" ? b.id - a.id : a.id - b.id));

  // Props comunes del tema para pasar a Marco en todas las vistas.
  const propsTema = { tema, onToggleTema: alternarTema };


  /* ======================= INICIO ======================= */
  if (vista === "inicio") {
    return (
      <Marco {...propsTema} onAjustes={() => setVista("ajustes")}>
        {borrador && (
          <div className="mb-4 rounded-xl border-2 border-orange-300 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/40">
            <p className="font-bold text-orange-800 dark:text-orange-200">{borrador.editandoId ? "Editando un acta" : "Inspección en curso"}</p>
            <p className="mb-3 text-sm text-orange-700 dark:text-orange-300">{borrador.cabecera.equipo || "Equipo sin nombre"} — tienes una sin terminar.</p>
            <div className="flex gap-2">
              <button onClick={continuarBorrador} className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-bold text-white hover:bg-orange-600">Continuar</button>
              <button onClick={descartarBorrador} className="rounded-lg border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-900/60 dark:text-orange-300 dark:hover:bg-orange-950/60">Descartar</button>
            </div>
          </div>
        )}

        <button onClick={() => setVista("elegir")} className="w-full rounded-xl bg-orange-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600">+ Nueva inspección</button>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setVista("stats")} className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">📊 Estadísticas</button>
          <button onClick={() => setVista("plantillas")} className="rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">📋 Plantillas</button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-400">Guardadas ({guardadas.length})</h2>
          {guardadas.length > 0 && (
            <div className="flex gap-3 text-xs font-semibold">
              <button onClick={exportarCSVTodas} className="text-slate-500 hover:text-orange-500">CSV</button>
              <button onClick={exportarJSON} className="text-slate-500 hover:text-orange-500">⬇ JSON</button>
              <button onClick={() => inputImportar.current.click()} className="text-slate-500 hover:text-orange-500">⬆ Importar</button>
            </div>
          )}
        </div>
        <input ref={inputImportar} type="file" accept="application/json" onChange={importarJSON} className="hidden" />

        {/* Filtros */}
        {guardadas.length > 0 && (
          <div className="mt-3 space-y-2">
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por equipo o inspector…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            <div className="flex flex-wrap gap-2">
              {[["todos", "Todas"], ["apto", "Aptas"], ["noapto", "No aptas"]].map(([v, etq]) => (
                <button key={v} onClick={() => setFVeredicto(v)}
                  className={"rounded-full px-3 py-1 text-xs font-bold " + (fVeredicto === v ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>{etq}</button>
              ))}
              <button onClick={() => setOrden(orden === "desc" ? "asc" : "desc")} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {orden === "desc" ? "↓ Recientes" : "↑ Antiguas"}
              </button>
            </div>
            <select value={fPlantilla} onChange={(e) => setFPlantilla(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="">Todas las plantillas</option>
              {[...new Set(guardadas.map((g) => g.plantilla))].map((nom) => (<option key={nom} value={nom}>{nom}</option>))}
            </select>
          </div>
        )}

        <div className="mt-3">
          {guardadas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">Aún no hay inspecciones. Pulsa “Nueva inspección” para empezar.</p>
          ) : listaFiltrada.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">Sin resultados con esos filtros.</p>
          ) : (
            <div className="space-y-2">
              {listaFiltrada.map((g) => {
                const r = calcularResumen(g.items, g.resultados);
                return (
                  <div key={g.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <button onClick={() => { setActaVista(g); setVista("acta"); }} className="flex-1 text-left">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{g.cabecera.equipo || "Equipo sin nombre"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{fechaHora(g.id)} · {g.cabecera.inspector || "Sin inspector"}</p>
                    </button>
                    <span className={"rounded-md px-2 py-1 text-xs font-bold " + (r.apto ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300")}>{r.apto ? "APTO" : "NO APTO"}</span>
                    <button onClick={() => borrarGuardada(g.id)} className="px-2 text-slate-300 hover:text-red-500" title="Borrar">🗑️</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Marco>
    );
  }

  /* ======================= ESTADÍSTICAS ======================= */
  if (vista === "stats") {
    const total = guardadas.length;
    const aptas = guardadas.filter((g) => calcularResumen(g.items, g.resultados).apto).length;
    const pctApto = total ? Math.round((aptas / total) * 100) : 0;

    // Ranking de puntos que más fallan: contamos "No OK" por texto del punto.
    const conteo = {};
    guardadas.forEach((g) => {
      g.items.forEach((it) => {
        if (resultadoDe(g.resultados, it.id).estado === "ko") conteo[it.texto] = (conteo[it.texto] || 0) + 1;
      });
    });
    const ranking = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxKo = ranking.length ? ranking[0][1] : 1;

    return (
      <Marco {...propsTema} onVolver={() => setVista("inicio")} titulo="Estadísticas">
        {total === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">Sin datos todavía. Crea inspecciones para ver estadísticas.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Pildora etiqueta="Inspecciones" valor={total} color="text-slate-800 dark:text-slate-100" />
              <Pildora etiqueta="Aptas" valor={aptas} color="text-emerald-600" />
              <Pildora etiqueta="% Apto" valor={pctApto + "%"} color="text-orange-600" />
            </div>

            <h3 className="mb-2 mt-6 font-mono text-sm font-bold uppercase tracking-wider text-slate-400">Puntos que más fallan</h3>
            {ranking.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">¡Ningún “No OK” registrado! 🎉</p>
            ) : (
              <div className="space-y-2">
                {ranking.map(([texto, n]) => (
                  <div key={texto} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-200">{texto}</span>
                      <span className="font-bold text-red-600">{n}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full bg-red-500" style={{ width: Math.round((n / maxKo) * 100) + "%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Marco>
    );
  }

  /* ======================= PLANTILLAS ======================= */
  if (vista === "plantillas") {
    return (
      <Marco {...propsTema} onVolver={() => setVista("inicio")} titulo="Plantillas">
        <button onClick={nuevaPlantilla} className="mb-4 w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">+ Nueva plantilla</button>
        <div className="space-y-2">
          {TODAS_PLANTILLAS.map((plt) => (
            <div key={plt.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{plt.nombre}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{plt.items.length} puntos {plt.deFabrica && "· de fábrica"}</p>
              <div className="mt-2 flex gap-3 text-xs font-semibold">
                {plt.deFabrica ? (
                  <button onClick={() => duplicarPlantilla(plt)} className="text-orange-500 hover:text-orange-600">Duplicar para editar</button>
                ) : (
                  <>
                    <button onClick={() => editarPlantilla(plt)} className="text-orange-500 hover:text-orange-600">Editar</button>
                    <button onClick={() => duplicarPlantilla(plt)} className="text-slate-500 hover:text-orange-500">Duplicar</button>
                    <button onClick={() => borrarPlantillaUsuario(plt.id)} className="text-slate-500 hover:text-red-500">Borrar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Marco>
    );
  }

  /* ======================= EDITAR PLANTILLA ======================= */
  if (vista === "editarPlantilla" && editP) {
    function setItem(idx, texto) {
      const items = editP.items.map((it, i) => (i === idx ? { ...it, texto } : it));
      setEditP({ ...editP, items });
    }
    function añadirItem() { setEditP({ ...editP, items: [...editP.items, { id: uid("i"), texto: "" }] }); }
    function quitarItem(idx) { setEditP({ ...editP, items: editP.items.filter((_, i) => i !== idx) }); }
    function mover(idx, dir) {
      const j = idx + dir;
      if (j < 0 || j >= editP.items.length) return;
      const items = [...editP.items];
      [items[idx], items[j]] = [items[j], items[idx]];
      setEditP({ ...editP, items });
    }
    return (
      <Marco {...propsTema} onVolver={() => { setEditP(null); setVista("plantillas"); }} titulo={editP.esNueva ? "Nueva plantilla" : "Editar plantilla"}>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Campo label="Nombre de la plantilla" valor={editP.nombre} onCambio={(v) => setEditP({ ...editP, nombre: v })} placeholder="Ej.: Revisión semanal compresor" />
        </div>
        <h3 className="mb-2 mt-5 font-mono text-sm font-bold uppercase tracking-wider text-slate-400">Puntos</h3>
        <div className="space-y-2">
          {editP.items.map((it, i) => (
            <div key={it.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="font-mono text-xs text-slate-400">{i + 1}</span>
              <input type="text" value={it.texto} onChange={(e) => setItem(i, e.target.value)} placeholder="Texto del punto…"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              <button onClick={() => mover(i, -1)} className="px-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">▲</button>
              <button onClick={() => mover(i, 1)} className="px-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">▼</button>
              <button onClick={() => quitarItem(i)} className="px-1 text-slate-300 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
        <button onClick={añadirItem} className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-500 hover:border-orange-300 hover:text-orange-500 dark:border-slate-700 dark:text-slate-400">+ Añadir punto</button>
        <button onClick={guardarPlantilla} className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">Guardar plantilla</button>
      </Marco>
    );
  }

  /* ======================= AJUSTES ======================= */
  if (vista === "ajustes") {
    return (
      <Marco {...propsTema} onVolver={() => setVista("inicio")} titulo="Ajustes">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Campo label="Nombre de la empresa" valor={empresa} onCambio={setEmpresa} placeholder="Aparecerá como cabecera del acta" />
          <p className="mt-2 text-xs text-slate-400">Se mostrará en la parte superior de las actas que generes.</p>
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Tema</span>
          <div className="flex gap-2">
            {[["light", "☀ Claro"], ["dark", "🌙 Oscuro"]].map(([v, etq]) => (
              <button key={v} onClick={() => setTema(v)}
                className={"flex-1 rounded-lg py-2 text-sm font-bold transition " + (tema === v ? "bg-orange-500 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700")}>
                {etq}
              </button>
            ))}
          </div>
        </div>
      </Marco>
    );
  }

  /* ======================= ELEGIR PLANTILLA ======================= */
  if (vista === "elegir") {
    return (
      <Marco {...propsTema} onVolver={() => setVista("inicio")} titulo="Elegir plantilla">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">¿Qué checklist quieres rellenar?</p>
        <div className="space-y-2">
          {TODAS_PLANTILLAS.map((plt) => (
            <button key={plt.id} onClick={() => empezarConPlantilla(plt)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{plt.nombre}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{plt.items.length} puntos {plt.deFabrica && "· de fábrica"}</p>
              </div>
              <span className="font-mono text-xs text-orange-500">USAR ›</span>
            </button>
          ))}
        </div>
      </Marco>
    );
  }

  /* ======================= RELLENAR ======================= */
  if (vista === "rellenar") {
    const hechos = resumen.total - resumen.pend;
    const pct = Math.round((hechos / resumen.total) * 100);
    return (
      <Marco {...propsTema} onVolver={() => setVista("inicio")} titulo={editandoId ? "Editar acta" : "Rellenar checklist"}>
        <p className="mb-2 rounded-lg bg-slate-800 px-4 py-2 font-mono text-xs text-orange-300">{plantilla.nombre}</p>
        <p className="mb-3 text-center text-xs text-slate-400">Se autoguarda · puedes salir y continuar luego</p>

        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500"><span>Progreso</span><span>{hechos}/{resumen.total} · {pct}%</span></div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-orange-500 transition-all" style={{ width: pct + "%" }} /></div>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2 text-center">
          <Pildora etiqueta="OK" valor={resumen.ok} color="text-emerald-600" />
          <Pildora etiqueta="No OK" valor={resumen.ko} color="text-red-600" />
          <Pildora etiqueta="N/A" valor={resumen.na} color="text-slate-500" />
          <Pildora etiqueta="Pend." valor={resumen.pend} color="text-amber-600" />
        </div>
        {resumen.pend > 0 && (
          <button onClick={marcarRestantesOK} className="mb-4 w-full rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">✓ Marcar los {resumen.pend} restantes como OK</button>
        )}

        <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Campo label="Inspector *" valor={cabecera.inspector} onCambio={(v) => setCabecera({ ...cabecera, inspector: v })} placeholder="Nombre / código del operario" />
          <Campo label="Equipo / Ubicación *" valor={cabecera.equipo} onCambio={(v) => setCabecera({ ...cabecera, equipo: v })} placeholder="Ej.: Línea 2 — Prensa hidráulica" />
          <Campo label="Fecha" tipo="date" valor={cabecera.fecha} onCambio={(v) => setCabecera({ ...cabecera, fecha: v })} />
        </div>

        <div className="space-y-3">
          {plantilla.items.map((item, i) => (
            <PuntoChecklist key={item.id} item={item} indice={i} resultado={resultados[item.id]} onActualizar={(nuevo) => setResultados({ ...resultados, [item.id]: nuevo })} />
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 font-mono text-sm font-bold uppercase tracking-wider text-slate-400">Firma del operario</h3>
          <Firma onCambio={setFirma} inicial={firmaInicial} />
        </div>

        {resumen.pend > 0 && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Quedan {resumen.pend} punto(s) sin marcar.</p>}
        <button onClick={finalizar} className="mt-4 w-full rounded-xl bg-orange-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600">{editandoId ? "Guardar cambios" : "Finalizar y generar acta"}</button>
      </Marco>
    );
  }

  /* ======================= ACTA =======================
     El documento (#acta) se mantiene SIEMPRE en claro: es una hoja pensada
     para imprimir; con tema oscuro el texto saldría invisible en papel. */
  if (vista === "acta" && actaVista) {
    const r = calcularResumen(actaVista.items, actaVista.resultados);
    const nombreEmpresa = actaVista.empresa || empresa;
    return (
      <>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #acta, #acta * { visibility: visible; }
            #acta { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
            .no-print { display: none !important; }
          }
        `}</style>
        <Marco {...propsTema} onVolver={() => setVista("inicio")} titulo="Acta de inspección">
          <div className="no-print mb-4 flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="flex-1 rounded-xl bg-slate-800 py-3 font-bold text-white hover:bg-slate-900">🖨️ Imprimir / PDF</button>
            <button onClick={() => editarActa(actaVista)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">✏️ Editar</button>
            <button onClick={() => repetir(actaVista)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">🔁 Repetir</button>
            <button onClick={() => exportarCSVActa(actaVista)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">CSV</button>
          </div>

          <div id="acta" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {nombreEmpresa && <p className="mb-1 font-mono text-sm font-bold uppercase tracking-wider text-slate-700">{nombreEmpresa}</p>}
            <div className="flex items-start justify-between border-b-4 border-orange-500 pb-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Acta de inspección</h1>
                <p className="text-sm text-slate-500">{actaVista.plantilla}</p>
              </div>
              <span className={"rounded-lg px-3 py-1 text-sm font-bold " + (r.apto ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{r.apto ? "APTO" : "NO APTO"}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <DatoActa etiqueta="Equipo / Ubicación" valor={actaVista.cabecera.equipo} />
              <DatoActa etiqueta="Inspector" valor={actaVista.cabecera.inspector} />
              <DatoActa etiqueta="Fecha" valor={actaVista.cabecera.fecha} />
              <DatoActa etiqueta="Resumen" valor={`${r.ok} OK · ${r.ko} No OK · ${r.na} N/A`} />
            </div>
            {actaVista.editadoEn && <p className="mt-3 text-xs italic text-slate-400">Editada el {fechaHora(actaVista.editadoEn)}</p>}
            <table className="mt-5 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-slate-600"><th className="py-2">#</th><th className="py-2">Punto de inspección</th><th className="py-2 text-center">Estado</th></tr>
              </thead>
              <tbody>
                {actaVista.items.map((item, i) => {
                  const res = resultadoDe(actaVista.resultados, item.id);
                  const est = ESTADOS.find((e) => e.valor === res.estado);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 font-mono text-slate-400">{i + 1}</td>
                      <td className="py-2 text-slate-800">{item.texto}
                        {res.comentario && <span className="block text-xs italic text-slate-500">↳ {res.comentario}</span>}
                        {res.foto && <img src={res.foto} alt="evidencia" className="mt-1 h-16 rounded border border-slate-200" />}
                      </td>
                      <td className="py-2 text-center font-bold text-slate-800">{est ? est.etiqueta : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {actaVista.firma && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Firma</p>
                <img src={actaVista.firma} alt="firma" className="mt-1 h-20 border-b border-slate-300" />
              </div>
            )}
          </div>
        </Marco>
      </>
    );
  }

  return null;
}
