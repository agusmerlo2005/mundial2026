-- =====================================================================
-- Intercambios de figuritas entre amigos
-- Ejecutar este archivo en el SQL editor de Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------
create table if not exists public.trade_proposals (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references auth.users(id) on delete cascade,
  to_user      uuid not null references auth.users(id) on delete cascade,
  give_codes   text[] not null,    -- figuritas que from_user ofrece
  receive_codes text[] not null,   -- figuritas que from_user pide a to_user
  status       text not null default 'pending'
               check (status in ('pending','accepted','rejected','cancelled')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint trade_balanced
    check (cardinality(give_codes) = cardinality(receive_codes)
           and cardinality(give_codes) > 0),
  constraint trade_distinct_users check (from_user <> to_user)
);

create index if not exists trade_proposals_to_idx
  on public.trade_proposals(to_user, status, created_at desc);
create index if not exists trade_proposals_from_idx
  on public.trade_proposals(from_user, status, created_at desc);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.trade_proposals enable row level security;

drop policy if exists "ver mis trades" on public.trade_proposals;
create policy "ver mis trades" on public.trade_proposals
  for select using (auth.uid() = from_user or auth.uid() = to_user);

drop policy if exists "crear mis trades" on public.trade_proposals;
create policy "crear mis trades" on public.trade_proposals
  for insert with check (auth.uid() = from_user and status = 'pending');

-- Las transiciones de estado se hacen solo vía las RPCs de abajo.
-- No exponemos UPDATE ni DELETE directos al cliente.

-- ---------------------------------------------------------------------
-- RPC: aceptar (atómico)
-- ---------------------------------------------------------------------
create or replace function public.accept_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t          public.trade_proposals%rowtype;
  faltantes  int;
  code       text;
begin
  select * into t from public.trade_proposals
    where id = p_trade_id
    for update;

  if not found then
    raise exception 'Intercambio no encontrado';
  end if;
  if t.status <> 'pending' then
    raise exception 'Este intercambio ya fue respondido';
  end if;
  if t.to_user <> auth.uid() then
    raise exception 'Solo el destinatario puede aceptar';
  end if;

  -- El que propone debe seguir teniendo quantity > 1 de cada give
  select count(*) into faltantes
    from unnest(t.give_codes) as g(code)
   where not exists (
     select 1 from public.user_stickers us
      where us.user_id = t.from_user
        and us.sticker_code = g.code
        and us.quantity > 1
   );
  if faltantes > 0 then
    raise exception 'El que propuso ya no tiene esas repetidas';
  end if;

  -- El destinatario también
  select count(*) into faltantes
    from unnest(t.receive_codes) as r(code)
   where not exists (
     select 1 from public.user_stickers us
      where us.user_id = t.to_user
        and us.sticker_code = r.code
        and us.quantity > 1
   );
  if faltantes > 0 then
    raise exception 'Ya no tenés repetidas suficientes para este intercambio';
  end if;

  -- Aplicar movimientos
  foreach code in array t.give_codes loop
    update public.user_stickers
       set quantity = quantity - 1
     where user_id = t.from_user and sticker_code = code;
    insert into public.user_stickers(user_id, sticker_code, quantity)
    values (t.to_user, code, 1)
    on conflict (user_id, sticker_code)
    do update set quantity = public.user_stickers.quantity + 1;
  end loop;

  foreach code in array t.receive_codes loop
    update public.user_stickers
       set quantity = quantity - 1
     where user_id = t.to_user and sticker_code = code;
    insert into public.user_stickers(user_id, sticker_code, quantity)
    values (t.from_user, code, 1)
    on conflict (user_id, sticker_code)
    do update set quantity = public.user_stickers.quantity + 1;
  end loop;

  update public.trade_proposals
     set status = 'accepted', responded_at = now()
   where id = p_trade_id;
end;
$$;

grant execute on function public.accept_trade(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: rechazar
-- ---------------------------------------------------------------------
create or replace function public.reject_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.trade_proposals%rowtype;
begin
  select * into t from public.trade_proposals where id = p_trade_id for update;
  if not found then raise exception 'Intercambio no encontrado'; end if;
  if t.status <> 'pending' then raise exception 'Ya respondido'; end if;
  if t.to_user <> auth.uid() then raise exception 'No autorizado'; end if;

  update public.trade_proposals
     set status = 'rejected', responded_at = now()
   where id = p_trade_id;
end;
$$;

grant execute on function public.reject_trade(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: cancelar (lo hace el que propuso)
-- ---------------------------------------------------------------------
create or replace function public.cancel_trade(p_trade_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.trade_proposals%rowtype;
begin
  select * into t from public.trade_proposals where id = p_trade_id for update;
  if not found then raise exception 'Intercambio no encontrado'; end if;
  if t.status <> 'pending' then raise exception 'Ya respondido'; end if;
  if t.from_user <> auth.uid() then
    raise exception 'Solo el que propuso puede cancelar';
  end if;

  update public.trade_proposals
     set status = 'cancelled', responded_at = now()
   where id = p_trade_id;
end;
$$;

grant execute on function public.cancel_trade(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime: que los clientes reciban cambios al instante
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'trade_proposals'
  ) then
    execute 'alter publication supabase_realtime add table public.trade_proposals';
  end if;
end$$;
