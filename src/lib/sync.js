/* =========================================================================
   SINCRONIZACIÓN CON LA NUBE (Supabase)
   -------------------------------------------------------------------------
   Estrategia: local-first + "last-write-wins" por registro, con tombstones
   (lápidas) para propagar los borrados entre dispositivos.

   Cada registro tiene una marca de modificación (`mod`, en ms):
     - inspección: `editadoEn` si se editó, si no su `id` (= fecha de creación).
     - plantilla:  `actualizadoEn` (se sella al guardar), o 0 si es antigua.

   Tablas en Supabase: `inspecciones` y `plantillas`, ambas con columnas
   (id text, user_id uuid, mod bigint, data jsonb, deleted bool).
   ========================================================================= */
import { supabase } from "./supabase";

export function modInspeccion(reg) {
  return reg.editadoEn || reg.id;
}
export function modPlantilla(p) {
  return p.actualizadoEn || 0;
}

/* Fusiona una colección local con las filas de la nube. Devuelve la lista de
   items vivos y el mapa de tombstones { id: mod } resultante. La fila más
   reciente (mayor `mod`) gana. */
export function fusionar(localArr, modLocal, cloudRows, tumbasLocal) {
  const mapa = new Map(); // id (string) -> { mod, data, deleted }

  // 1) Items locales vivos.
  localArr.forEach((r) => mapa.set(String(r.id), { mod: modLocal(r), data: r, deleted: false }));

  // 2) Tombstones locales (un borrado pisa al item si es igual o más nuevo).
  Object.entries(tumbasLocal || {}).forEach(([id, mod]) => {
    const e = mapa.get(id);
    if (!e || mod >= e.mod) mapa.set(id, { mod, data: null, deleted: true });
  });

  // 3) Filas de la nube (gana la de mayor `mod`).
  (cloudRows || []).forEach((row) => {
    const e = mapa.get(row.id);
    if (!e || row.mod > e.mod) mapa.set(row.id, { mod: row.mod, data: row.data, deleted: row.deleted });
  });

  const items = [];
  const tumbas = {};
  for (const [id, e] of mapa) {
    if (e.deleted) tumbas[id] = e.mod;
    else if (e.data) items.push(e.data);
  }
  return { items, tumbas };
}

/* Descarga todas las filas del usuario (inspecciones y plantillas). */
export async function bajar(userId) {
  const [ri, rp] = await Promise.all([
    supabase.from("inspecciones").select("*").eq("user_id", userId),
    supabase.from("plantillas").select("*").eq("user_id", userId),
  ]);
  if (ri.error) throw ri.error;
  if (rp.error) throw rp.error;
  return { inspecciones: ri.data || [], plantillas: rp.data || [] };
}

/* Sube (upsert) todos los items vivos y las lápidas del usuario. No modifica el
   estado local: solo empuja a la nube, así es seguro llamarlo desde un efecto. */
export async function subir(userId, inspecciones, plantillas, tumbas) {
  const filasInsp = [
    ...inspecciones.map((r) => ({ id: String(r.id), user_id: userId, mod: modInspeccion(r), data: r, deleted: false })),
    ...Object.entries(tumbas.inspecciones || {}).map(([id, mod]) => ({ id, user_id: userId, mod, data: null, deleted: true })),
  ];
  const filasPlant = [
    ...plantillas.map((p) => ({ id: p.id, user_id: userId, mod: modPlantilla(p), data: p, deleted: false })),
    ...Object.entries(tumbas.plantillas || {}).map(([id, mod]) => ({ id, user_id: userId, mod, data: null, deleted: true })),
  ];

  if (filasInsp.length) {
    const { error } = await supabase.from("inspecciones").upsert(filasInsp, { onConflict: "user_id,id" });
    if (error) throw error;
  }
  if (filasPlant.length) {
    const { error } = await supabase.from("plantillas").upsert(filasPlant, { onConflict: "user_id,id" });
    if (error) throw error;
  }
}
