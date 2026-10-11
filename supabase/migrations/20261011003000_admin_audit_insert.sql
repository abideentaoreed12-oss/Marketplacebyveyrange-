-- Allow authenticated administrators to append audit events under their own identity.
create policy "admin insert audit logs" on public.audit_logs
for insert to authenticated
with check (public.is_marketplace_admin() and actor_id = (select auth.uid()));
