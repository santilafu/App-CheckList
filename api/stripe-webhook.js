/* =========================================================================
   API · Webhook de Stripe (Vercel Serverless Function)
   -------------------------------------------------------------------------
   Stripe llama a esta URL cuando ocurre un pago, renovación o cancelación.
   Verifica la firma y actualiza el plan del usuario en Supabase (con la clave
   service_role, que salta la RLS porque aquí no hay usuario autenticado).

   Variables de entorno: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

   IMPORTANTE: configura este endpoint en Stripe (Developers -> Webhooks) y
   escucha los eventos checkout.session.completed y customer.subscription.*
   ========================================================================= */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Stripe necesita el cuerpo SIN parsear para verificar la firma.
export const config = { api: { bodyParser: false } };

async function leerRaw(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

async function fijarPlan(userId, plan, customerId) {
  if (!userId) return;
  await admin.from("perfiles").upsert({
    user_id: userId,
    plan,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    updated_at: new Date().toISOString(),
  });
}

async function userIdDeCliente(customerId) {
  const { data } = await admin.from("perfiles").select("user_id").eq("stripe_customer_id", customerId).single();
  return data?.user_id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  let event;
  try {
    const raw = await leerRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("firma webhook inválida", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        await fijarPlan(s.client_reference_id || s.metadata?.user_id, "pro", s.customer);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id || (await userIdDeCliente(sub.customer));
        const activo = sub.status === "active" || sub.status === "trialing";
        await fijarPlan(userId, activo ? "pro" : "free", sub.customer);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id || (await userIdDeCliente(sub.customer));
        await fijarPlan(userId, "free", sub.customer);
        break;
      }
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("webhook handler", err);
    res.status(500).json({ error: err.message });
  }
}
