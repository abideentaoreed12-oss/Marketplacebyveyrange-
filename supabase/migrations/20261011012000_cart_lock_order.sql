-- Keep inventory-before-cart lock order for positive quantity changes to avoid deadlocks with add_to_cart.
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
  if p_quantity = 0 then
    select c.id into v_cart_id from public.carts c where c.user_id = actor for update;
    if v_cart_id is null then raise exception 'Cart not found'; end if;
    delete from public.cart_items ci where ci.cart_id = v_cart_id and ci.product_id = p_product_id;
    return;
  end if;
  if not exists(select 1 from public.products p where p.id = p_product_id and p.status = 'published') then raise exception 'Product is not available'; end if;
  select (i.available_quantity - i.reserved_quantity) into v_stock from public.inventory i where i.product_id = p_product_id for update;
  if v_stock is null or p_quantity > v_stock then raise exception 'Requested quantity exceeds current available stock'; end if;
  select c.id into v_cart_id from public.carts c where c.user_id = actor for update;
  if v_cart_id is null then raise exception 'Cart not found'; end if;
  update public.cart_items ci set quantity = p_quantity, updated_at = now() where ci.cart_id = v_cart_id and ci.product_id = p_product_id;
  if not found then raise exception 'Cart item not found'; end if;
end;
$$;
revoke all on function public.set_cart_item_quantity(uuid, integer) from public, anon;
grant execute on function public.set_cart_item_quantity(uuid, integer) to authenticated;
