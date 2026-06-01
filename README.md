# Rondas · Inspección y Checklists

App web para realizar **rondas de inspección y checklists** (mantenimiento
preventivo, seguridad, limpieza…) desde el móvil o el PC, generar un **acta**
imprimible y llevar el control de lo que más falla.

Pensada para entornos industriales: el operario rellena el checklist en el
puesto, firma, adjunta fotos como evidencia y genera el acta en PDF (vía
impresión del navegador). Todo se guarda en el propio dispositivo.

## Funcionalidades

- **Plantillas de checklist** de fábrica (mantenimiento, seguridad, limpieza) y
  **editor propio** para crear, editar, duplicar y borrar tus checklists.
- **Rellenado guiado**: estado OK / No OK / N/A por punto, comentario y foto.
  Avisa de los "No OK" sin comentario y permite marcar el resto como OK de golpe.
- **Autoguardado del borrador**: puedes salir y continuar la inspección luego.
- **Firma** del operario en pantalla (ratón/dedo).
- **Acta de inspección** con veredicto APTO / NO APTO, lista de puntos,
  comentarios, fotos y firma. Imprimible / exportable a PDF.
- **Estadísticas**: total de inspecciones, % de actas aptas y ranking de los
  puntos que más fallan.
- **Exportación CSV** (resumen global y detalle de un acta) y **copia de
  seguridad** en JSON (exportar / importar).
- **Filtros y orden** del listado: por veredicto, plantilla, fecha y búsqueda.
- **PWA instalable**: se puede instalar como app (Android/escritorio) y funciona
  **offline**. En Android: Chrome → menú → *"Añadir a pantalla de inicio"*.

> ℹ️ Es una app **100 % local**: los datos se guardan en el navegador
> (`localStorage`). No hay servidor ni se envía nada a la nube. Para conservar
> los datos a largo plazo, usa la exportación a JSON.

## Stack

- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (PWA instalable + offline)
- Persistencia con `localStorage` (sin backend)

## Estructura del proyecto

```
src/
├─ main.jsx              Punto de entrada (monta React).
├─ index.css            Estilos base + import de Tailwind.
├─ App.jsx              Orquestador de vistas y estado global.
├─ data/
│  └─ plantillas.js      Plantillas de fábrica y estados (OK/No OK/N/A).
├─ lib/
│  ├─ almacen.js         Wrapper seguro sobre localStorage.
│  └─ helpers.js         Funciones puras (resumen, CSV, fechas, descargas…).
└─ components/
   ├─ ui.jsx             Componentes reutilizables (Marco, Campo, Pildora…).
   ├─ Firma.jsx          Canvas de firma.
   └─ PuntoChecklist.jsx Una fila del checklist al rellenar.
```

## Puesta en marcha

Requisitos: [Node.js](https://nodejs.org/) 18+.

```bash
npm install      # instalar dependencias
npm run dev      # arrancar en modo desarrollo (http://localhost:5173)
npm run build    # compilar para producción (carpeta dist/)
npm run preview  # previsualizar el build de producción
npm run lint     # pasar ESLint
npm run icons    # regenerar los iconos PWA desde public/icon.svg
```

> La PWA (service worker) solo se activa en el build de producción. Para probar
> la instalación/offline en local: `npm run build && npm run preview`.

## Cómo generar un PDF del acta

Abre un acta y pulsa **📄 Descargar PDF**: genera el PDF directamente (texto
vectorial, tabla, evidencias fotográficas y firmas). Como alternativa, el botón
**🖨️** abre el diálogo de impresión del navegador (elige *"Guardar como PDF"*).

## Sincronización en la nube (opcional)

La app es **local-first**: funciona 100% offline guardando en el navegador. De
forma **opcional** puedes activar la sincronización en la nube con
[Supabase](https://supabase.com) para tener tus actas y plantillas en tu cuenta
y verlas en varios dispositivos (móvil + PC).

Si no la configuras, la app sigue funcionando en modo local, como siempre.

### Cómo activarla

1. Crea una cuenta gratis en [supabase.com](https://supabase.com) y un **proyecto nuevo**.
2. En el proyecto → **SQL Editor** → pega y ejecuta el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) (crea las tablas con seguridad por filas).
3. (Recomendado para empezar) En **Authentication → Providers → Email**, desactiva
   *"Confirm email"* para poder entrar sin confirmar el correo.
4. En **Project Settings → API** copia la **Project URL** y la **anon public key**.
5. Crea un archivo `.env.local` (copia de `.env.example`) con:
   ```
   VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
   ```
6. En **Vercel** → tu proyecto → **Settings → Environment Variables**, añade esas
   dos variables y vuelve a desplegar.

Luego, en la app: **Ajustes (⚙) → Nube** → crea una cuenta o entra. Al iniciar
sesión, tus datos se sincronizan; los cambios se suben solos y puedes forzar con
**🔄 Sincronizar ahora**.

> La sincronización usa *last-write-wins* por registro con tombstones (borrar en
> un dispositivo borra en el otro). Las fotos van incrustadas en el acta (base64);
> si subes muchas, vigila el límite de almacenamiento del plan gratuito.

## Plan Pro / pagos con Stripe (en construcción)

Backend listo (funciones serverless de Vercel en `api/`), **frontend de gating
pendiente**. El plan de cada usuario se guarda en la tabla `perfiles` de Supabase.

**Hecho:**
- `api/create-checkout.js` — crea la sesión de pago (Stripe Checkout).
- `api/stripe-webhook.js` — actualiza el plan al pagar/cancelar (verifica firma).
- `api/portal.js` — portal para gestionar/cancelar la suscripción.
- `supabase/schema-pro.sql` — tabla `perfiles` + RLS + trigger de alta.

**Pendiente (siguiente sesión):** estado `esPro` en el frontend, bloquear el
branding (logo/color) y la marca de agua del PDF tras el plan Pro, y la tarjeta
"Hazte Pro" en Ajustes.

**Configuración cuando se retome:**
1. Ejecuta `supabase/schema-pro.sql` en el SQL Editor de Supabase.
2. Crea cuenta en [Stripe](https://stripe.com) → un **Producto** con un **Precio**
   de suscripción (mensual). Copia el `price_...`.
3. En **Vercel → Environment Variables** añade: `STRIPE_SECRET_KEY`,
   `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` (ver `.env.example`).
4. En **Stripe → Developers → Webhooks** crea un endpoint apuntando a
   `https://TU-APP.vercel.app/api/stripe-webhook` escuchando
   `checkout.session.completed` y `customer.subscription.*`; copia el `whsec_...`.

> Las funciones `api/` solo corren en Vercel (o con `vercel dev`), no con `npm run dev`.

## Despliegue en Vercel

El proyecto incluye `vercel.json` (rewrite SPA + cabecera del service worker).
Para publicarlo:

1. Sube el repo a GitHub (ya está en
   [App-CheckList](https://github.com/santilafu/App-CheckList)).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repo.
3. Vercel detecta Vite automáticamente:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - (no hace falta tocar nada)
4. **Deploy**. En cada `git push` a `main` se redespliega solo.

> Al ser una app estática (sin backend), encaja en el plan gratuito. Cuando
> abras la URL en el móvil, podrás **instalarla** como PWA. Otras opciones
> equivalentes para sitios estáticos: Netlify o Cloudflare Pages.
