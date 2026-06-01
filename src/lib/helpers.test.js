import { describe, it, expect } from "vitest";
import {
  tipoDe, veredictoPunto, textoResultado, rangoTexto,
  resultadoVacioPara, resultadosVacios, resultadoDe,
  calcularResumen, numeroActa, campoCSV, uid,
} from "./helpers";

describe("tipoDe", () => {
  it("por defecto es 'estado'", () => {
    expect(tipoDe({})).toBe("estado");
    expect(tipoDe({ tipo: "numero" })).toBe("numero");
  });
});

describe("veredictoPunto", () => {
  it("estado: devuelve el estado marcado o 'pend'", () => {
    expect(veredictoPunto({ tipo: "estado" }, { estado: "ok" })).toBe("ok");
    expect(veredictoPunto({ tipo: "estado" }, { estado: "ko" })).toBe("ko");
    expect(veredictoPunto({ tipo: "estado" }, { estado: "na" })).toBe("na");
    expect(veredictoPunto({ tipo: "estado" }, { estado: null })).toBe("pend");
  });

  it("numero: vacío o no numérico = 'pend'", () => {
    expect(veredictoPunto({ tipo: "numero", max: 70 }, { valor: "" })).toBe("pend");
    expect(veredictoPunto({ tipo: "numero", max: 70 }, { valor: null })).toBe("pend");
    expect(veredictoPunto({ tipo: "numero", max: 70 }, { valor: "abc" })).toBe("pend");
  });

  it("numero: dentro de rango = 'ok', fuera = 'ko'", () => {
    const item = { tipo: "numero", min: 150, max: 210, unidad: "bar" };
    expect(veredictoPunto(item, { valor: "180" })).toBe("ok");
    expect(veredictoPunto(item, { valor: "150" })).toBe("ok"); // límite inferior incluido
    expect(veredictoPunto(item, { valor: "210" })).toBe("ok"); // límite superior incluido
    expect(veredictoPunto(item, { valor: "120" })).toBe("ko"); // por debajo
    expect(veredictoPunto(item, { valor: "300" })).toBe("ko"); // por encima
  });

  it("numero: solo máx (sin mín)", () => {
    const item = { tipo: "numero", min: "", max: 70 };
    expect(veredictoPunto(item, { valor: "65" })).toBe("ok");
    expect(veredictoPunto(item, { valor: "85" })).toBe("ko");
  });

  it("numero: sin rango = 'info' (lectura informativa)", () => {
    expect(veredictoPunto({ tipo: "numero" }, { valor: "42" })).toBe("info");
    expect(veredictoPunto({ tipo: "numero", min: "", max: "" }, { valor: "42" })).toBe("info");
  });

  it("texto: siempre 'info'", () => {
    expect(veredictoPunto({ tipo: "texto" }, { texto: "lo que sea" })).toBe("info");
    expect(veredictoPunto({ tipo: "texto" }, { texto: "" })).toBe("info");
  });
});

describe("calcularResumen", () => {
  const items = [
    { id: "a", tipo: "estado" },
    { id: "b", tipo: "estado" },
    { id: "c", tipo: "numero", max: 70 },
    { id: "d", tipo: "texto" },
  ];

  it("cuenta por veredicto y decide APTO (sin ningún 'ko')", () => {
    const res = {
      a: { estado: "ok" },
      b: { estado: "na" },
      c: { valor: "60" }, // número en rango (máx 70) = ok
      d: { texto: "nota" }, // info
    };
    const r = calcularResumen(items, res);
    expect(r).toMatchObject({ ok: 2, ko: 0, na: 1, info: 1, pend: 0, total: 4, apto: true });
  });

  it("un número fuera de rango hace el acta NO APTA", () => {
    const res = { a: { estado: "ok" }, b: { estado: "ok" }, c: { valor: "90" }, d: { texto: "x" } };
    const r = calcularResumen(items, res);
    expect(r.ko).toBe(1);
    expect(r.apto).toBe(false);
  });

  it("puntos sin rellenar quedan como 'pend'", () => {
    const r = calcularResumen(items, {});
    // a,b sin estado = pend; c sin valor = pend; d texto = info
    expect(r.pend).toBe(3);
    expect(r.info).toBe(1);
    expect(r.apto).toBe(true); // sin 'ko'
  });
});

describe("textoResultado", () => {
  it("estado: etiqueta legible", () => {
    expect(textoResultado({ tipo: "estado" }, { estado: "ok" })).toBe("OK");
    expect(textoResultado({ tipo: "estado" }, { estado: "ko" })).toBe("No OK");
    expect(textoResultado({ tipo: "estado" }, { estado: null })).toBe("—");
  });
  it("numero: valor con unidad, o '—' si vacío", () => {
    expect(textoResultado({ tipo: "numero", unidad: "bar" }, { valor: "180" })).toBe("180 bar");
    expect(textoResultado({ tipo: "numero" }, { valor: "42" })).toBe("42");
    expect(textoResultado({ tipo: "numero", unidad: "bar" }, { valor: "" })).toBe("—");
  });
  it("texto: la lectura, o '—' si vacío", () => {
    expect(textoResultado({ tipo: "texto" }, { texto: "  azul  " })).toBe("azul");
    expect(textoResultado({ tipo: "texto" }, { texto: "" })).toBe("—");
  });
});

describe("rangoTexto", () => {
  it("combina mín, máx y unidad", () => {
    expect(rangoTexto({ min: 150, max: 210, unidad: "bar" })).toBe("Rango: 150–210 bar");
    expect(rangoTexto({ min: "", max: 70, unidad: "°C" })).toBe("Máx: 70 °C");
    expect(rangoTexto({ min: 5, max: "", unidad: "" })).toBe("Mín: 5");
    expect(rangoTexto({ min: "", max: "", unidad: "kg" })).toBe("Unidad: kg");
    expect(rangoTexto({})).toBe("");
  });
});

describe("resultados vacíos", () => {
  it("forma según el tipo", () => {
    expect(resultadoVacioPara({ tipo: "numero" })).toEqual({ valor: "", comentario: "", foto: null });
    expect(resultadoVacioPara({ tipo: "texto" })).toEqual({ texto: "", comentario: "", foto: null });
    expect(resultadoVacioPara({})).toEqual({ estado: null, comentario: "", foto: null });
  });
  it("resultadosVacios crea una entrada por punto", () => {
    const plt = { items: [{ id: "x", tipo: "estado" }, { id: "y", tipo: "numero" }] };
    const r = resultadosVacios(plt);
    expect(Object.keys(r)).toEqual(["x", "y"]);
    expect(r.y).toEqual({ valor: "", comentario: "", foto: null });
  });
});

describe("resultadoDe", () => {
  it("devuelve un resultado vacío si falta el id (acta con plantilla cambiada)", () => {
    expect(resultadoDe({}, "noexiste")).toEqual({ estado: null, comentario: "", foto: null });
    expect(resultadoDe(undefined, "x")).toEqual({ estado: null, comentario: "", foto: null });
  });
});

describe("numeroActa", () => {
  it("rellena a 4 dígitos, y 0/undefined = '—'", () => {
    expect(numeroActa(1)).toBe("0001");
    expect(numeroActa(42)).toBe("0042");
    expect(numeroActa(0)).toBe("—");
    expect(numeroActa(undefined)).toBe("—");
  });
});

describe("campoCSV", () => {
  it("envuelve en comillas y escapa las comillas internas", () => {
    expect(campoCSV("hola")).toBe('"hola"');
    expect(campoCSV('di "hola"')).toBe('"di ""hola"""');
    expect(campoCSV(null)).toBe('""');
    expect(campoCSV(5)).toBe('"5"');
  });
});

describe("uid", () => {
  it("genera ids únicos con el prefijo dado", () => {
    const a = uid("i");
    const b = uid("i");
    expect(a).not.toBe(b);
    expect(a.startsWith("i-")).toBe(true);
  });
});
