-- Security hardening: seller/admin privilege boundaries.
-- Apply after 20261011000000_marketplace_core.sql.

create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_marketplace_admin() then
    if new.role is distinct from old.role
       or new.email_verified_at is distinct from old.email_verified_at
       or new.phone_verified_at is distinct from old.phone_verified_at then
      raise exception 'Privileged profile fields require trusted verification or administrator access';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_profile_privileged_fields
before update on public.profiles
for each row execute procedure public.guard_profile_privileged_fields();

create or replace function public.guard_seller_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_marketplace_admin() then
    if new.verification_status is distinct from old.verification_status
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
       or new.commission_percent is distinct from old.commission_percent then
      raise exception 'Seller approval and commission terms are admin-controlled';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_seller_privileged_fields
before update on public.seller_profiles
for each row execute procedure public.guard_seller_privileged_fields();

create or replace function public.guard_product_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_marketplace_admin() then
    if new.status in ('rejected','archived')
       or (new.status = 'published' and old.status is distinct from 'published') then
      raise exception 'Only an administrator can publish, reject, or archive a product';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_product_publication
before update on public.products
for each row execute procedure public.guard_product_publication();

drop policy if exists "approved seller create products" on public.products;
create policy "approved seller create products" on public.products
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status in ('draft','pending_review')
  and exists (
    select 1 from public.seller_profiles s
    where s.id = seller_id
      and s.user_id = (select auth.uid())
      and s.verification_status = 'approved'
  )
);
