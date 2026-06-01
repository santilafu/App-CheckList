import { describe, it, expect } from "vitest";
import { fusionar, modInspeccion, modPlantilla } from "./sync";

describe("modInspeccion / modPlantilla", () => {
  it("inspección: editadoEn si existe, si no el id", () => {
    expect(modInspeccion({ id: 100 })).toBe(100);
    expect(modInspeccion({ id: 100, editadoEn: 250 })).toBe(250);
  });
  it("plantilla: actualizadoEn o 0", () => {
    expect(modPlantilla({})).toBe(0);
    expect(modPlantilla({ actualizadoEn: 7 })).toBe(7);
  });
});

// Helper para inspecciones de prueba.
const insp = (id, extra = {}) => ({ id, cabecera: { equipo: "E" + id }, ...extra });

describe("fusionar (sincronización a dos vías)", () => {
  it("item solo local → se conserva", () => {
    const { items, tumbas } = fusionar([insp(1)], modInspeccion, [], {});
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(1);
    expect(tumbas).toEqual({});
  });

  it("item solo en la nube → se añade en local", () => {
    const cloud = [{ id: "2", mod: 2, data: insp(2), deleted: false }];
    const { items } = fusionar([], modInspeccion, cloud, {});
    expect(items.map((i) => i.id)).toEqual([2]);
  });

  it("conflicto: gana el más reciente (nube más nueva)", () => {
    const local = [insp(5, { cabecera: { equipo: "viejo" } })]; // mod = 5
    const cloud = [{ id: "5", mod: 10, data: insp(5, { cabecera: { equipo: "nuevo" } }), deleted: false }];
    const { items } = fusionar(local, modInspeccion, cloud, {});
    expect(items).toHaveLength(1);
    expect(items[0].cabecera.equipo).toBe("nuevo");
  });

  it("conflicto: gana el más reciente (local más nuevo)", () => {
    const local = [insp(5, { editadoEn: 20, cabecera: { equipo: "local-nuevo" } })]; // mod = 20
    const cloud = [{ id: "5", mod: 10, data: insp(5, { cabecera: { equipo: "nube-vieja" } }), deleted: false }];
    const { items } = fusionar(local, modInspeccion, cloud, {});
    expect(items[0].cabecera.equipo).toBe("local-nuevo");
  });

  it("borrado en la nube (más nuevo) elimina el item local", () => {
    const local = [insp(7)]; // mod = 7
    const cloud = [{ id: "7", mod: 99, data: null, deleted: true }];
    const { items, tumbas } = fusionar(local, modInspeccion, cloud, {});
    expect(items).toHaveLength(0);
    expect(tumbas["7"]).toBe(99);
  });

  it("tombstone local propaga el borrado", () => {
    const local = [insp(8)]; // mod = 8
    const tumbasLocal = { 8: 50 }; // borrado local más nuevo
    const { items, tumbas } = fusionar(local, modInspeccion, [], tumbasLocal);
    expect(items).toHaveLength(0);
    expect(tumbas["8"]).toBe(50);
  });

  it("re-creación: si la nube tiene una versión más nueva que el tombstone local, resucita", () => {
    const tumbasLocal = { 9: 10 }; // borrado local en t=10
    const cloud = [{ id: "9", mod: 30, data: insp(9), deleted: false }]; // recreada en t=30
    const { items, tumbas } = fusionar([], modInspeccion, cloud, tumbasLocal);
    expect(items.map((i) => i.id)).toEqual([9]);
    expect(tumbas["9"]).toBeUndefined();
  });

  it("id numérico local y string en la nube se tratan como el mismo registro", () => {
    const local = [insp(100)]; // id número
    const cloud = [{ id: "100", mod: 1, data: insp(100), deleted: false }]; // id string
    const { items } = fusionar(local, modInspeccion, cloud, {});
    expect(items).toHaveLength(1); // no se duplica
  });
});
