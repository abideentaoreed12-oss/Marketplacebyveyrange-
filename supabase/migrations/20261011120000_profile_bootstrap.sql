-- Auto-create public.profiles when a Supabase Auth user is created.
-- Role stays customer until an administrator promotes the account.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, email_verified_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'customer',
    case when new.email_confirmed_at is not null then new.email_confirmed_at else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "admin manage inventory" on public.inventory;
create policy "admin manage inventory" on public.inventory
for all to authenticated
using (public.is_marketplace_admin())
with check (public.is_marketplace_admin());

drop policy if exists "admin manage inventory movements" on public.inventory_movements;
create policy "admin manage inventory movements" on public.inventory_movements
for all to authenticated
using (public.is_marketplace_admin())
with check (public.is_marketplace_admin());
