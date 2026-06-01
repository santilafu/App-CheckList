/* =========================================================================
   API · Crear sesión de pago de Stripe (Vercel Serverless Function)
   -------------------------------------------------------------------------
   Verifica al usuario por su token de Supabase, crea (o reutiliza) su cliente
   de Stripe y devuelve la URL del Checkout para suscribirse al plan Pro.

   Variables de entorno necesarias (en Vercel):
     STRIPE_SECRET_KEY, STRIPE_PRICE_ID,
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

    // Reutiliza el cliente de Stripe del usuario, o lo crea.
    const { data: perfil } = await admin.from("perfiles").select("stripe_customer_id").eq("user_id", user.id).single();
    let customerId = perfil?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      await admin.from("perfiles").upsert({ user_id: user.id, stripe_customer_id: customerId });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/?pro=success`,
      cancel_url: `${origin}/?pro=cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout", err);
    res.status(500).json({ error: err.message });
  }
}
