/* =========================================================================
   API · Portal de cliente de Stripe (Vercel Serverless Function)
   -------------------------------------------------------------------------
   Devuelve la URL del portal de facturación de Stripe para que un usuario Pro
   gestione o cancele su suscripción.

   Variables de entorno: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
   ========================================================================= */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "No autenticado" });

    const { data: perfil } = await admin.from("perfiles").select("stripe_customer_id").eq("user_id", user.id).single();
    if (!perfil?.stripe_customer_id) return res.status(400).json({ error: "No hay suscripción asociada" });

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const sesion = await stripe.billingPortal.sessions.create({
      customer: perfil.stripe_customer_id,
      return_url: `${origin}/`,
    });

    res.status(200).json({ url: sesion.url });
  } catch (err) {
    console.error("portal", err);
    res.status(500).json({ error: err.message });
  }
}
