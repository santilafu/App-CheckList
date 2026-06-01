import { useRef, useEffect } from "react";

/* =========================================================================
   FIRMA — canvas para firmar con dedo/ratón
   -------------------------------------------------------------------------
   Devuelve la firma como dataURL PNG vía onCambio. Si recibe `inicial`,
   precarga esa firma (al continuar un borrador).
   ========================================================================= */

export function Firma({ onCambio, inicial }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    if (inicial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      img.src = inicial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function posicion(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  }
  function empezar(e) { dibujando.current = true; const ctx = canvasRef.current.getContext("2d"); const { x, y } = posicion(e); ctx.beginPath(); ctx.moveTo(x, y); }
  function mover(e) { if (!dibujando.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const { x, y } = posicion(e); ctx.lineTo(x, y); ctx.stroke(); }
  function terminar() { if (!dibujando.current) return; dibujando.current = false; onCambio(canvasRef.current.toDataURL("image/png")); }
  function borrar() { const ctx = canvasRef.current.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height); onCambio(null); }

  return (
    <div>
      <canvas ref={canvasRef} width={600} height={180}
        onPointerDown={empezar} onPointerMove={mover} onPointerUp={terminar} onPointerLeave={terminar}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 touch-none bg-white" style={{ height: "150px" }} />
      <button onClick={borrar} className="mt-2 text-sm font-medium text-slate-500 hover:text-red-500">Borrar firma</button>
    </div>
  );
}
