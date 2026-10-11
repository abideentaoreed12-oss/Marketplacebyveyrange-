-- Persistent per-user carts. Cart contents do not reserve stock; checkout must revalidate price and inventory.
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(cart_id, product_id)
);
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
create policy "cart owner read" on public.carts for select to authenticated using (user_id = (select auth.uid()));
create policy "cart owner read items" on public.cart_items for select to authenticated using (exists(select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

create or replace function public.add_to_cart(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); v_cart_id uuid; v_stock integer; v_already integer; v_target integer;
begin
  if actor is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 99 then raise exception 'Quantity must be between 1 and 99'; end if;
  if not exists(select 1 from public.products p where p.id = p_product_id and p.status = 'published') then raise exception 'Product is not available'; end if;
  select (i.available_quantity - i.reserved_quantity) into v_stock from public.inventory i where i.product_id = p_product_id for update;
  if v_stock is null or v_stock < 1 then raise exception 'Product is out of stock'; end if;
  insert into public.carts(user_id) values (actor) on conflict (user_id) do update set updated_at = now();
  select c.id into v_cart_id from public.carts c where c.user_id = actor for update;
  select ci.quantity into v_already from public.cart_items ci where ci.cart_id = v_cart_id and ci.product_id = p_product_id;
  v_target := coalesce(v_already, 0) + p_quantity;
  if v_target > 99 or v_target > v_stock then raise exception 'Requested quantity exceeds current available stock'; end if;
  insert into public.cart_items(cart_id, product_id, quantity) values (v_cart_id, p_product_id, v_target)
  on conflict (cart_id, product_id) do update set quantity = excluded.quantity, updated_at = now();
end;
$$;

create or replace function public.set_cart_item_quantity(p_product_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); v_cart_id uuid; v_stock integer;
begin
  if actor is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 99 then raise exception 'Quantity must be between 0 and 99'; end if;
  select c.id into v_cart_id from public.carts c where c.user_id = actor for update;
  if v_cart_id is null then raise exception 'Cart not found'; end if;
  if p_quantity = 0 then
    delete from public.cart_items ci where ci.cart_id = v_cart_id and ci.product_id = p_product_id;
    return;
  end if;
  if not exists(select 1 from public.products p where p.id = p_product_id and p.status = 'published') then raise exception 'Product is not available'; end if;
  select (i.available_quantity - i.reserved_quantity) into v_stock from public.inventory i where i.product_id = p_product_id for update;
  if v_stock is null or p_quantity > v_stock then raise exception 'Requested quantity exceeds current available stock'; end if;
  update public.cart_items ci set quantity = p_quantity, updated_at = now() where ci.cart_id = v_cart_id and ci.product_id = p_product_id;
  if not found then raise exception 'Cart item not found'; end if;
end;
$$;
revoke all on function public.add_to_cart(uuid, integer) from public, anon;
revoke all on function public.set_cart_item_quantity(uuid, integer) from public, anon;
grant execute on function public.add_to_cart(uuid, integer) to authenticated;
grant execute on function public.set_cart_item_quantity(uuid, integer) to authenticated;
