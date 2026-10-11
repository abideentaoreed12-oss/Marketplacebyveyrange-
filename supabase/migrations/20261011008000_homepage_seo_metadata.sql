-- Validate SEO metadata in the same trusted admin transaction as homepage publication.
create or replace function public.admin_save_site_content(p_slug text, p_title text, p_content jsonb, p_status text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.marketplace_require_admin(); content_id uuid; before_row jsonb;
begin
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or length(trim(p_title)) not between 1 and 160
     or jsonb_typeof(p_content) <> 'object'
     or p_status not in ('draft','published','archived') then
    raise exception 'Invalid site content';
  end if;
  if p_slug <> 'homepage' then raise exception 'Only registered content slots can be edited through this function'; end if;
  if p_status = 'published' and (
    nullif(trim(p_content->>'heroEyebrow'), '') is null
    or nullif(trim(p_content->>'heroTitle'), '') is null
    or nullif(trim(p_content->>'heroAccent'), '') is null
    or nullif(trim(p_content->>'heroDescription'), '') is null
    or nullif(trim(p_content->>'heroButton'), '') is null
    or nullif(trim(p_content->>'heroNote'), '') is null
    or nullif(trim(p_content->>'catalogEyebrow'), '') is null
    or nullif(trim(p_content->>'catalogTitle'), '') is null
    or nullif(trim(p_content->>'footerTagline'), '') is null
    or nullif(trim(p_content->>'trustOne'), '') is null
    or nullif(trim(p_content->>'trustTwo'), '') is null
    or nullif(trim(p_content->>'trustThree'), '') is null
    or nullif(trim(p_content->>'trustFour'), '') is null
    or nullif(trim(p_content->>'artBackLabel'), '') is null
    or nullif(trim(p_content->>'artBackNumber'), '') is null
    or nullif(trim(p_content->>'artTitle'), '') is null
    or nullif(trim(p_content->>'artCaption'), '') is null
    or nullif(trim(p_content->>'seoTitle'), '') is null
    or nullif(trim(p_content->>'seoDescription'), '') is null
  ) then raise exception 'Published homepage content is incomplete'; end if;
  select to_jsonb(c) into before_row from public.site_content c where c.slug = p_slug for update;
  insert into public.site_content(slug, title, content, status, updated_by, published_at, updated_at)
  values (p_slug, trim(p_title), p_content, p_status, actor, case when p_status = 'published' then now() else null end, now())
  on conflict (slug) do update set title = excluded.title, content = excluded.content, status = excluded.status, updated_by = actor, published_at = excluded.published_at, updated_at = now()
  returning id into content_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_state, after_state)
  values (actor, 'site_content.published', 'site_content', content_id::text, before_row, jsonb_build_object('slug',p_slug,'title',trim(p_title),'status',p_status,'content',p_content));
  return content_id;
end;
$$;
revoke all on function public.admin_save_site_content(text,text,jsonb,text) from public, anon;
grant execute on function public.admin_save_site_content(text,text,jsonb,text) to authenticated;
