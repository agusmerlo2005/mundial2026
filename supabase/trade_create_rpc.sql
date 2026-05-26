-- =====================================================================
-- RPC: crear intercambio con validación de figuritas ya reservadas
-- Ejecutar en el SQL editor de Supabase.
-- =====================================================================

-- Reemplaza el INSERT directo desde el cliente.
-- Verifica que ninguna figurita de la propuesta esté comprometida
-- en otro intercambio pendiente antes de insertar.

create or replace function public.create_trade(
  p_to_user     uuid,
  p_give_codes  text[],
  p_receive_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conflict_receive int;
  conflict_give    int;
  new_id           uuid;
begin
  -- Validaciones básicas
  if auth.uid() = p_to_user then
    raise exception 'No podés proponerte un intercambio a vos mismo';
  end if;

  if cardinality(p_give_codes) = 0 or cardinality(p_receive_codes) = 0 then
    raise exception 'Tenés que incluir al menos una figurita de cada lado';
  end if;

  if cardinality(p_give_codes) <> cardinality(p_receive_codes) then
    raise exception 'El intercambio debe ser balanceado (igual cantidad de cada lado)';
  end if;

  -- ¿Alguna figurita que pedís ya está reservada en otro intercambio pendiente con ese amigo?
  -- (to_user es el dueño de las figuritas en receive_codes)
  select count(*) into conflict_receive
    from public.trade_proposals
   where to_user  = p_to_user
     and status   = 'pending'
     and receive_codes && p_receive_codes;

  if conflict_receive > 0 then
    raise exception 'Una o más figuritas que pedís ya están comprometidas en otro intercambio pendiente';
  end if;

  -- ¿Alguna figurita que ofrecés ya está comprometida en otro intercambio pendiente tuyo?
  select count(*) into conflict_give
    from public.trade_proposals
   where from_user = auth.uid()
     and status    = 'pending'
     and give_codes && p_give_codes;

  if conflict_give > 0 then
    raise exception 'Una o más figuritas que ofrecés ya están comprometidas en otro intercambio pendiente';
  end if;

  insert into public.trade_proposals(from_user, to_user, give_codes, receive_codes)
  values (auth.uid(), p_to_user, p_give_codes, p_receive_codes)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_trade(uuid, text[], text[]) to authenticated;
