/* =========================================================================
   PLANTILLAS DE FÁBRICA Y ESTADOS
   -------------------------------------------------------------------------
   Las plantillas de fábrica vienen fijas en el código. Las que crea el
   usuario se guardan aparte en localStorage (ver lib/almacen.js).
   ========================================================================= */

export const PLANTILLAS_BASE = [
  {
    id: "mant", deFabrica: true,
    nombre: "Ronda de mantenimiento preventivo — Línea de producción",
    items: [
      { id: "m01", texto: "Nivel de aceite del grupo hidráulico dentro de rango" },
      { id: "m02", texto: "Ausencia de fugas en circuito hidráulico / neumático" },
      { id: "m03", texto: "Estado de correas y tensión correcta" },
      { id: "m04", texto: "Ruidos o vibraciones anómalas en motores" },
      { id: "m05", texto: "Temperatura de rodamientos sin sobrecalentamiento" },
      { id: "m06", texto: "Setas / paradas de emergencia operativas" },
      { id: "m07", texto: "Protecciones y resguardos colocados correctamente" },
      { id: "m08", texto: "Limpieza general y ausencia de obstrucciones" },
      { id: "m09", texto: "Lecturas de manómetros dentro de parámetros" },
      { id: "m10", texto: "Engrase de puntos según pauta de lubricación" },
    ],
  },
  {
    id: "seg", deFabrica: true,
    nombre: "Inspección de seguridad — Puesto de trabajo",
    items: [
      { id: "s01", texto: "Vías de evacuación despejadas y señalizadas" },
      { id: "s02", texto: "Extintores accesibles y con revisión vigente" },
      { id: "s03", texto: "EPIs disponibles y en buen estado" },
      { id: "s04", texto: "Cuadros eléctricos cerrados y señalizados" },
      { id: "s05", texto: "Ausencia de cables o mangueras por el suelo" },
      { id: "s06", texto: "Iluminación de emergencia operativa" },
      { id: "s07", texto: "Productos químicos correctamente almacenados" },
    ],
  },
  {
    id: "limp", deFabrica: true,
    nombre: "Checklist de limpieza — Fin de turno",
    items: [
      { id: "l01", texto: "Superficies de trabajo limpias y despejadas" },
      { id: "l02", texto: "Suelos barridos / fregados" },
      { id: "l03", texto: "Residuos retirados y contenedores vaciados" },
      { id: "l04", texto: "Herramientas recogidas en su sitio" },
      { id: "l05", texto: "Máquinas apagadas correctamente" },
    ],
  },
];

export const ESTADOS = [
  { valor: "ok", etiqueta: "OK", clase: "bg-emerald-500 text-white" },
  { valor: "ko", etiqueta: "No OK", clase: "bg-red-500 text-white" },
  { valor: "na", etiqueta: "N/A", clase: "bg-slate-400 text-white" },
];
