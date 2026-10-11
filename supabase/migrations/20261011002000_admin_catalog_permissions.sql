-- Ensure administrators can create catalog records for any seller they manage.
-- Sellers remain restricted to their own unpublished draft/review listings.
create policy "admin create products" on public.products
for insert to authenticated
with check (public.is_marketplace_admin());
