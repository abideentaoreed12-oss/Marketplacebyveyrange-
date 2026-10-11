-- Persistent customer wishlist with one canonical default list and atomic toggles.
create unique index if not exists wishlists_default_saved_items_unique
on public.wishlists(user_id) where name = 'Saved items';

create or replace function public.toggle_wishlist_item(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid(); list_id uuid; removed_count integer;
begin
  if actor is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  if not exists(select 1 from public.products p where p.id = p_product_id and p.status = 'published') then
    raise exception 'Only published products can be saved';
  end if;
  insert into public.wishlists(user_id, name, is_private)
  values (actor, 'Saved items', true)
  on conflict (user_id) where name = 'Saved items' do nothing;
  select w.id into list_id from public.wishlists w where w.user_id = actor and w.name = 'Saved items' for update;
  delete from public.wishlist_items where wishlist_id = list_id and product_id = p_product_id;
  get diagnostics removed_count = row_count;
  if removed_count > 0 then return false; end if;
  insert into public.wishlist_items(wishlist_id, product_id) values (list_id, p_product_id);
  return true;
end;
$$;
revoke all on function public.toggle_wishlist_item(uuid) from public, anon;
grant execute on function public.toggle_wishlist_item(uuid) to authenticated;
