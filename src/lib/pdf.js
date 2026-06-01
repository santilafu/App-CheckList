/* =========================================================================
   GENERADOR DE PDF DEL ACTA
   -------------------------------------------------------------------------
   Crea un PDF profesional con TEXTO VECTORIAL (seleccionable y nítido), no una
   captura de pantalla. Incluye cabecera, datos, tabla de puntos coloreada por
   estado, evidencias fotográficas y firma.

   jsPDF y jspdf-autotable se cargan con import() dinámico para que no entren en
   el bundle principal (solo se descargan al generar el primer PDF).
   ========================================================================= */

import { ESTADOS } from "../data/plantillas";
import { calcularResumen, resultadoDe, fechaHora } from "./helpers";

const MARGEN = 14;          // mm
const ANCHO_PAGINA = 210;   // A4
const ALTO_PAGINA = 297;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;

// Paleta (RGB) coherente con la app.
const COLOR = {
  slate900: [15, 23, 42],
  slate700: [51, 65, 85],
  slate500: [100, 116, 139],
  slate400: [148, 163, 184],
  slate200: [226, 232, 240],
  orange: [249, 115, 22],
  emerald: [5, 150, 105],
  red: [220, 38, 38],
  aptoBg: [209, 250, 229], aptoTx: [4, 120, 87],
  noAptoBg: [254, 226, 226], noAptoTx: [185, 28, 28],
};

// Devuelve las dimensiones naturales de una imagen (dataURL). Si falla, null.
function dimsImagen(dataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

// Formato que entiende jsPDF a partir del dataURL.
function formatoImagen(dataURL) {
  const m = /^data:image\/(\w+)/.exec(dataURL || "");
  const f = (m ? m[1] : "png").toUpperCase();
  return f === "JPG" ? "JPEG" : f;
}

// Limpia el nombre de equipo para usarlo en el nombre de archivo.
function nombreArchivo(registro) {
  const equipo = (registro.cabecera.equipo || "inspeccion").replace(/[^\w-]+/g, "_").slice(0, 40);
  return `acta-${equipo}-${(registro.cabecera.fecha || "").slice(0, 10)}.pdf`;
}

export async function generarPDFActa(registro, empresaFallback) {
  // Carga diferida de las librerías pesadas.
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const r = calcularResumen(registro.items, registro.resultados);
  const empresa = registro.empresa || empresaFallback;
  let y = MARGEN;

  // Salto de página si no caben `necesario` mm.
  function asegurarEspacio(necesario) {
    if (y + necesario > ALTO_PAGINA - MARGEN) { doc.addPage(); y = MARGEN; }
  }

  // ---- Cabecera ----
  if (empresa) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...COLOR.slate700);
    doc.text(empresa.toUpperCase(), MARGEN, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...COLOR.slate900);
  doc.text("Acta de inspección", MARGEN, y + 2);

  // Sello APTO / NO APTO arriba a la derecha.
  const sello = r.apto ? "APTO" : "NO APTO";
  const bg = r.apto ? COLOR.aptoBg : COLOR.noAptoBg;
  const tx = r.apto ? COLOR.aptoTx : COLOR.noAptoTx;
  doc.setFont("helvetica", "bold").setFontSize(11);
  const selloW = doc.getTextWidth(sello) + 8;
  const selloX = ANCHO_PAGINA - MARGEN - selloW;
  doc.setFillColor(...bg);
  doc.roundedRect(selloX, y - 4, selloW, 8, 1.5, 1.5, "F");
  doc.setTextColor(...tx);
  doc.text(sello, selloX + 4, y + 1.5);

  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...COLOR.slate500);
  doc.text(registro.plantilla, MARGEN, y + 9);

  // Línea naranja separadora.
  y += 13;
  doc.setDrawColor(...COLOR.orange).setLineWidth(0.8);
  doc.line(MARGEN, y, ANCHO_PAGINA - MARGEN, y);
  y += 7;

  // ---- Rejilla de datos (2 columnas) ----
  const datos = [
    ["Equipo / Ubicación", registro.cabecera.equipo || "—"],
    ["Inspector", registro.cabecera.inspector || "—"],
    ["Fecha", registro.cabecera.fecha || "—"],
    ["Resumen", `${r.ok} OK / ${r.ko} No OK / ${r.na} N/A`],
  ];
  const colW = ANCHO_UTIL / 2;
  for (let i = 0; i < datos.length; i++) {
    const col = i % 2;
    const filaY = y + Math.floor(i / 2) * 13;
    const x = MARGEN + col * colW;
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...COLOR.slate400);
    doc.text(datos[i][0].toUpperCase(), x, filaY);
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(...COLOR.slate900);
    doc.text(String(datos[i][1]), x, filaY + 5, { maxWidth: colW - 4 });
  }
  y += Math.ceil(datos.length / 2) * 13;

  if (registro.editadoEn) {
    doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(...COLOR.slate400);
    doc.text(`Editada el ${fechaHora(registro.editadoEn)}`, MARGEN, y);
    y += 5;
  }

  // ---- Tabla de puntos ----
  const cuerpo = registro.items.map((it, i) => {
    const res = resultadoDe(registro.resultados, it.id);
    const est = ESTADOS.find((e) => e.valor === res.estado);
    return [i + 1, it.texto, est ? est.etiqueta : "-", res.comentario || ""];
  });

  autoTable(doc, {
    startY: y + 1,
    margin: { left: MARGEN, right: MARGEN },
    head: [["#", "Punto de inspección", "Estado", "Comentario"]],
    body: cuerpo,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2, textColor: COLOR.slate900, lineColor: COLOR.slate200, lineWidth: 0.1 },
    headStyles: { fillColor: COLOR.slate900, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9, halign: "center", textColor: COLOR.slate400 },
      2: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      3: { textColor: COLOR.slate500, fontStyle: "italic" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const v = data.cell.raw;
        if (v === "OK") data.cell.styles.textColor = COLOR.emerald;
        else if (v === "No OK") data.cell.styles.textColor = COLOR.red;
        else if (v === "N/A") data.cell.styles.textColor = COLOR.slate500;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ---- Evidencias fotográficas ----
  const fotos = registro.items
    .map((it, i) => ({ n: i + 1, texto: it.texto, foto: resultadoDe(registro.resultados, it.id).foto }))
    .filter((x) => x.foto);

  if (fotos.length) {
    asegurarEspacio(10);
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...COLOR.slate900);
    doc.text("Evidencias fotográficas", MARGEN, y);
    y += 6;

    for (const f of fotos) {
      const dims = await dimsImagen(f.foto);
      const maxW = 80, maxH = 60;
      let w = maxW, h = maxH;
      if (dims) {
        const escala = Math.min(maxW / dims.w, maxH / dims.h);
        w = dims.w * escala;
        h = dims.h * escala;
      }
      asegurarEspacio(h + 8);
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...COLOR.slate700);
      doc.text(`Punto ${f.n}: ${f.texto}`, MARGEN, y, { maxWidth: ANCHO_UTIL });
      y += 4;
      try {
        doc.addImage(f.foto, formatoImagen(f.foto), MARGEN, y, w, h);
      } catch {
        doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(...COLOR.slate400);
        doc.text("(no se pudo incrustar la imagen)", MARGEN, y + 4);
      }
      y += h + 6;
    }
  }

  // ---- Firma ----
  if (registro.firma) {
    const dims = await dimsImagen(registro.firma);
    const maxW = 70, maxH = 28;
    let w = maxW, h = maxH;
    if (dims) {
      const escala = Math.min(maxW / dims.w, maxH / dims.h);
      w = dims.w * escala;
      h = dims.h * escala;
    }
    asegurarEspacio(h + 10);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...COLOR.slate400);
    doc.text("FIRMA", MARGEN, y);
    y += 3;
    try { doc.addImage(registro.firma, "PNG", MARGEN, y, w, h); } catch { /* ignore */ }
    y += h + 2;
    doc.setDrawColor(...COLOR.slate200).setLineWidth(0.2);
    doc.line(MARGEN, y, MARGEN + maxW, y);
  }

  // ---- Pie con numeración de páginas ----
  const totalPag = doc.getNumberOfPages();
  for (let p = 1; p <= totalPag; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...COLOR.slate400);
    doc.text(`Página ${p} de ${totalPag}`, ANCHO_PAGINA - MARGEN, ALTO_PAGINA - 8, { align: "right" });
  }

  doc.save(nombreArchivo(registro));
}
