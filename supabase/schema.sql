-- =========================================================================
-- ESQUEMA DE BASE DE DATOS PARA LA SINCRONIZACIÓN
-- -------------------------------------------------------------------------
-- Ejecuta TODO este script una vez en tu proyecto de Supabase:
--   Panel del proyecto -> SQL Editor -> New query -> pega esto -> Run.
--
-- Crea dos tablas (inspecciones y plantillas) con seguridad por filas (RLS):
-- cada usuario solo puede ver y modificar SUS propias filas.
-- =========================================================================

create table if not exists public.inspecciones (
  id       text    not null,
  user_id  uuid    not null references auth.users on delete cascade,
  mod      bigint  not null,              -- marca de modificación (ms) para last-write-wins
  data     jsonb,                         -- el acta completa (null si es una lápida de borrado)
  deleted  boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.plantillas (
  id       text    not null,
  user_id  uuid    not null references auth.users on delete cascade,
  mod      bigint  not null,
  data     jsonb,
  deleted  boolean not null default false,
  primary key (user_id, id)
);

-- Activar seguridad por filas.
alter table public.inspecciones enable row level security;
alter table public.plantillas  enable row level security;

-- Políticas: cada usuario gestiona solo sus filas.
create policy "inspecciones propias" on public.inspecciones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plantillas propias" on public.plantillas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- (Opcional) Índices por usuario para acelerar las descargas.
create index if not exists inspecciones_user_idx on public.inspecciones (user_id);
create index if not exists plantillas_user_idx  on public.plantillas (user_id);
