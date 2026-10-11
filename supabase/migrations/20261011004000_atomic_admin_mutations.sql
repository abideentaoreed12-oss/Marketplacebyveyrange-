-- Atomic, server-authorized admin mutations. Each operation and its audit record commit together.
-- Apply after the Marketplace core and security migrations.
create or replace function public.marketplace_require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select 1 from public.profiles p where p.id = actor and p.role = 'admin'::public.marketplace_role
  ) then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return actor;
end;
$$;

create or replace function public.admin_create_category(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.marketplace_require_admin(); category_id uuid;
begin
  if length(trim(p_name)) not between 1 and 120 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Invalid category name or slug';
  end if;
  insert into public.categories(name, slug, created_by, updated_by)
  values (trim(p_name), p_slug, actor, actor) returning id into category_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_state)
  values (actor, 'category.created', 'category', category_id::text, jsonb_build_object('name', trim(p_name), 'slug', p_slug));
  return category_id;
end;
$$;

create or replace function public.admin_set_seller_status(p_seller_id uuid, p_status public.seller_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.marketplace_require_admin(); before_row jsonb;
begin
  select to_jsonb(s) into before_row from public.seller_profiles s where s.id = p_seller_id for update;
  if before_row is null then raise exception 'Seller application not found'; end if;
  update public.seller_profiles
  set verification_status = p_status,
      approved_at = case when p_status = 'approved' then now() else null end,
      approved_by = case when p_status = 'approved' then actor else null end,
      updated_at = now()
  where id = p_seller_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_state, after_state)
  values (actor, 'seller.status_changed', 'seller', p_seller_id::text, before_row, jsonb_build_object('verification_status', p_status));
end;
$$;

create or replace function public.admin_set_product_status(p_product_id uuid, p_status public.product_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.marketplace_require_admin(); before_row jsonb; seller_ok boolean; category_ok boolean; stock_ok boolean;
begin
  select to_jsonb(p) into before_row from public.products p where p.id = p_product_id for update;
  if before_row is null then raise exception 'Product not found'; end if;
  if p_status = 'published' then
    select exists(select 1 from public.seller_profiles s where s.id = (before_row->>'seller_id')::uuid and s.verification_status = 'approved') into seller_ok;
    select exists(select 1 from public.categories c where c.id = (before_row->>'category_id')::uuid and c.is_active) into category_ok;
    select exists(select 1 from public.inventory i where i.product_id = p_product_id and i.available_quantity > i.reserved_quantity) into stock_ok;
    if not coalesce(seller_ok, false) or not coalesce(category_ok, false) or not coalesce(stock_ok, false) then
      raise exception 'Publishing requires an approved seller, active category and available stock';
    end if;
  end if;
  update public.products
  set status = p_status,
      published_at = case when p_status = 'published' then coalesce(published_at, now()) else null end,
      updated_by = actor, updated_at = now()
  where id = p_product_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_state, after_state)
  values (actor, 'product.status_changed', 'product', p_product_id::text, before_row, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_create_product(
  p_name text, p_slug text, p_description text, p_seller_id uuid, p_category_id uuid,
  p_price_minor bigint, p_stock_quantity integer, p_image_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.marketplace_require_admin(); product_id uuid;
begin
  if length(trim(p_name)) not between 1 and 200
     or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_price_minor < 0 or p_stock_quantity < 0
     or p_price_minor > 9000000000000000 or p_stock_quantity > 2000000000 then
    raise exception 'Invalid product details';
  end if;
  if not exists(select 1 from public.seller_profiles s where s.id = p_seller_id and s.verification_status = 'approved') then
    raise exception 'Products require an approved seller';
  end if;
  if not exists(select 1 from public.categories c where c.id = p_category_id and c.is_active) then
    raise exception 'Products require an active category';
  end if;
  insert into public.products(name, slug, description, seller_id, category_id, price_minor, currency, image_url, status, created_by, updated_by)
  values (trim(p_name), p_slug, nullif(trim(coalesce(p_description, '')), ''), p_seller_id, p_category_id, p_price_minor, 'NGN', nullif(trim(coalesce(p_image_url, '')), ''), 'draft', actor, actor)
  returning id into product_id;
  insert into public.inventory(product_id, available_quantity, reserved_quantity)
  values (product_id, p_stock_quantity, 0);
  if p_stock_quantity > 0 then
    insert into public.inventory_movements(product_id, actor_id, movement_type, quantity_delta, reason)
    values (product_id, actor, 'restock', p_stock_quantity, 'Initial stock on admin create');
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_state)
  values (actor, 'product.created', 'product', product_id::text,
    jsonb_build_object('name', trim(p_name), 'slug', p_slug, 'seller_id', p_seller_id, 'category_id', p_category_id, 'price_minor', p_price_minor, 'stock_quantity', p_stock_quantity));
  return product_id;
end;
$$;

revoke all on function public.marketplace_require_admin() from public, anon;
revoke all on function public.admin_create_category(text, text) from public, anon;
revoke all on function public.admin_set_seller_status(uuid, public.seller_status) from public, anon;
revoke all on function public.admin_set_product_status(uuid, public.product_status) from public, anon;
revoke all on function public.admin_create_product(text, text, text, uuid, uuid, bigint, integer, text) from public, anon;
grant execute on function public.admin_create_category(text, text) to authenticated;
grant execute on function public.admin_set_seller_status(uuid, public.seller_status) to authenticated;
grant execute on function public.admin_set_product_status(uuid, public.product_status) to authenticated;
grant execute on function public.admin_create_product(text, text, text, uuid, uuid, bigint, integer, text) to authenticated;
