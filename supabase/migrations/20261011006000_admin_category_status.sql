-- Category status is admin-only and atomically hides live products when a category is deactivated.
create or replace function public.admin_set_category_status(p_category_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.marketplace_require_admin(); before_row jsonb; product_row record;
begin
  select to_jsonb(c) into before_row from public.categories c where c.id = p_category_id for update;
  if before_row is null then raise exception 'Category not found'; end if;
  update public.categories set is_active = p_is_active, updated_by = actor, updated_at = now() where id = p_category_id;
  if not p_is_active then
    for product_row in
      update public.products p set status = 'hidden', updated_by = actor, updated_at = now()
      where p.category_id = p_category_id and p.status = 'published'
      returning p.id, p.name, p.status
    loop
      insert into public.audit_logs(actor_id, action, entity_type, entity_id, after_state)
      values (actor, 'product.hidden_category_deactivated', 'product', product_row.id::text,
        jsonb_build_object('name', product_row.name, 'status', product_row.status, 'category_id', p_category_id));
    end loop;
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_state, after_state)
  values (actor, 'category.status_changed', 'category', p_category_id::text, before_row,
    jsonb_build_object('is_active', p_is_active));
end;
$$;
revoke all on function public.admin_set_category_status(uuid, boolean) from public, anon;
grant execute on function public.admin_set_category_status(uuid, boolean) to authenticated;
