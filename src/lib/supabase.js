/* =========================================================================
   CLIENTE DE SUPABASE
   -------------------------------------------------------------------------
   La nube es OPCIONAL. Si no hay variables de entorno configuradas
   (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY), `supabase` es null y la app
   funciona en modo 100% local, como siempre.

   La "anon key" es pública y segura de usar en el frontend: el acceso a los
   datos lo protege la seguridad por filas (RLS) de Supabase, que solo deja a
   cada usuario ver y tocar sus propias filas.
   ========================================================================= */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ¿Está la nube configurada?
export const hayNube = Boolean(url && anon);

export const supabase = hayNube ? createClient(url, anon) : null;
