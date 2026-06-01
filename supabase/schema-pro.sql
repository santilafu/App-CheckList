-- =========================================================================
-- ESQUEMA PARA PLANES (Pro) — ejecutar en el SQL Editor de Supabase
-- -------------------------------------------------------------------------
-- Tabla de perfiles con el plan de cada usuario. La escribe el webhook de
-- Stripe (con service_role); el usuario solo puede LEER su propia fila.
-- =========================================================================

create table if not exists public.perfiles (
  user_id            uuid primary key references auth.users on delete cascade,
  plan               text not null default 'free',   -- 'free' | 'pro'
  stripe_customer_id text,
  updated_at         timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- El usuario puede leer su propio perfil (para saber si es Pro).
create policy "perfil propio (lectura)" on public.perfiles
  for select using (auth.uid() = user_id);

-- (Las escrituras las hace el webhook con la clave service_role, que salta RLS.)

-- Crea automáticamente un perfil 'free' al registrarse un usuario nuevo.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.perfiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil();
