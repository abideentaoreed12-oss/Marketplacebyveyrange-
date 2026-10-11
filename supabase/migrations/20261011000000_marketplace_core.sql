-- Veyrang Marketplace core schema.
-- No demo rows are inserted. Production records are created through reviewed admin/seller workflows.
create extension if not exists pgcrypto;

create type public.marketplace_role as enum ('customer', 'seller', 'admin');
create type public.seller_status as enum ('pending', 'under_review', 'approved', 'rejected', 'suspended');
create type public.product_status as enum ('draft', 'pending_review', 'published', 'hidden', 'rejected', 'archived');
create type public.order_status as enum ('pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_pending', 'refunded');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'cancelled', 'partially_refunded', 'refunded');
create type public.case_status as enum ('open', 'waiting_on_customer', 'waiting_on_seller', 'under_review', 'resolved', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  phone_verified_at timestamptz,
  email_verified_at timestamptz,
  role public.marketplace_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 120)
);

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete restrict,
  business_name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  verification_status public.seller_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  commission_percent numeric(5,2) not null default 0 check (commission_percent >= 0 and commission_percent <= 100),
  return_policy jsonb not null default '{}'::jsonb,
  fulfillment_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(name) between 1 and 120)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  sku text,
  price_minor bigint not null check (price_minor >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.product_status not null default 'draft',
  image_url text,
  attributes jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, sku)
);
create index products_public_catalog_idx on public.products(status, published_at desc) where status = 'published';
create index products_category_idx on public.products(category_id, status);
create index products_seller_idx on public.products(seller_id, created_at desc);

create table public.inventory (
  product_id uuid primary key references public.products(id) on delete restrict,
  available_quantity integer not null default 0 check (available_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(),
  check (reserved_quantity <= available_quantity)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  movement_type text not null check (movement_type in ('restock','reservation','release','sale','adjustment','return')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reference_type text,
  reference_id uuid,
  reason text,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint site_settings_key_format check (key ~ '^[a-z][a-z0-9_.-]{1,100}$')
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  updated_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.seller_profiles(id) on delete restrict,
  title text not null,
  code text unique,
  promotion_type text not null check (promotion_type in ('percentage','fixed_amount','bundle','free_delivery')),
  value_minor bigint,
  percentage numeric(5,2),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  budget_minor bigint,
  status text not null default 'draft' check (status in ('draft','pending_review','active','paused','expired','cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (percentage is null or percentage between 0 and 100),
  check (value_minor is null or value_minor >= 0)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  delivery_fee_minor bigint not null check (delivery_fee_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  address_snapshot jsonb not null,
  delivery_quote_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seller_suborders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  commission_percent_snapshot numeric(5,2) not null check (commission_percent_snapshot between 0 and 100),
  commission_minor bigint not null check (commission_minor >= 0),
  seller_net_minor bigint not null check (seller_net_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, seller_id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  suborder_id uuid not null references public.seller_suborders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name_snapshot text not null,
  sku_snapshot text,
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  quantity integer not null check (quantity > 0),
  line_total_minor bigint not null check (line_total_minor >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider = 'paystack'),
  provider_reference text not null unique,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.payment_status not null default 'pending',
  provider_transaction_id text unique,
  verified_at timestamptz,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  suborder_id uuid not null references public.seller_suborders(id) on delete restrict,
  provider text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending',
  last_event_at timestamptz,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  proof_of_delivery jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  evidence jsonb not null default '[]'::jsonb,
  status public.case_status not null default 'open',
  requested_quantity integer not null check (requested_quantity > 0),
  refund_amount_minor bigint check (refund_amount_minor is null or refund_amount_minor >= 0),
  provider_refund_reference text unique,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  source_app text not null default 'marketplace' check (source_app in ('marketplace','food')),
  order_id uuid references public.orders(id) on delete restrict,
  subject text not null,
  description text not null,
  status public.case_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  order_item_id uuid not null unique references public.order_items(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  product_rating smallint not null check (product_rating between 1 and 5),
  seller_rating smallint not null check (seller_rating between 1 and 5),
  title text,
  body text,
  status text not null default 'pending_review' check (status in ('pending_review','published','hidden','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  question text not null,
  answer text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  status text not null default 'open' check (status in ('open','answered','hidden','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Saved items',
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.wishlist_items (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(wishlist_id, product_id)
);

create table public.product_comparisons (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(user_id, product_id)
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  marketing_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('in_app','email','sms','whatsapp')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sent','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.seller_profiles(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending' check (status in ('pending','held','approved','processing','paid','failed','cancelled')),
  provider_reference text unique,
  available_at timestamptz,
  processed_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

-- Role helper avoids policy recursion on profiles.
create or replace function public.current_marketplace_role()
returns public.marketplace_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.is_marketplace_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_marketplace_role() = 'admin'::public.marketplace_role, false)
$$;

create or replace function public.handle_new_marketplace_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email_verified_at)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), case when new.email_confirmed_at is not null then new.email_confirmed_at else null end)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_marketplace
after insert on auth.users
for each row execute procedure public.handle_new_marketplace_user();

-- All user-facing data changes require an authenticated, authorized actor.
alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_content enable row level security;
alter table public.promotions enable row level security;
alter table public.orders enable row level security;
alter table public.seller_suborders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.returns enable row level security;
alter table public.support_cases enable row level security;
alter table public.product_reviews enable row level security;
alter table public.product_questions enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.product_comparisons enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles read self or admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_marketplace_admin());
create policy "profiles update self or admin" on public.profiles for update to authenticated using (id = (select auth.uid()) or public.is_marketplace_admin()) with check ((id = (select auth.uid()) and role = public.current_marketplace_role()) or public.is_marketplace_admin());

create policy "approved sellers public read" on public.seller_profiles for select to anon, authenticated using (verification_status = 'approved' or user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "seller create own application" on public.seller_profiles for insert to authenticated with check (user_id = (select auth.uid()) and verification_status = 'pending');
create policy "seller update own profile" on public.seller_profiles for update to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin()) with check (user_id = (select auth.uid()) or public.is_marketplace_admin());

create policy "active categories public read" on public.categories for select to anon, authenticated using (is_active or public.is_marketplace_admin());
create policy "admin manage categories" on public.categories for all to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());

create policy "published products or owner read" on public.products for select to anon, authenticated using (
  (status = 'published' and exists(select 1 from public.seller_profiles s where s.id = seller_id and s.verification_status = 'approved'))
  or exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid()))
  or public.is_marketplace_admin()
);
create policy "approved seller create products" on public.products for insert to authenticated with check (
  created_by = (select auth.uid())
  and exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid()) and s.verification_status = 'approved')
);
create policy "seller or admin update products" on public.products for update to authenticated using (
  exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid())) or public.is_marketplace_admin()
) with check (
  exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid())) or public.is_marketplace_admin()
);
create policy "admin delete products" on public.products for delete to authenticated using (public.is_marketplace_admin());

create policy "inventory read for visible products" on public.inventory for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_marketplace_admin())));
create policy "seller or admin manage inventory" on public.inventory for all to authenticated using (
  public.is_marketplace_admin() or exists(select 1 from public.products p join public.seller_profiles s on s.id = p.seller_id where p.id = product_id and s.user_id = (select auth.uid()))
) with check (
  public.is_marketplace_admin() or exists(select 1 from public.products p join public.seller_profiles s on s.id = p.seller_id where p.id = product_id and s.user_id = (select auth.uid()))
);

create policy "published site content read" on public.site_content for select to anon, authenticated using (status = 'published' or public.is_marketplace_admin());
create policy "admin manage site content" on public.site_content for all to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());
create policy "admin manage site settings" on public.site_settings for all to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());

create policy "active promotions public read" on public.promotions for select to anon, authenticated using (status = 'active' and now() between starts_at and ends_at or public.is_marketplace_admin() or exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid())));
create policy "admin or owner manage promotions" on public.promotions for all to authenticated using (
  public.is_marketplace_admin() or exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid()))
) with check (
  public.is_marketplace_admin() or exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid()))
);

create policy "customer owns orders" on public.orders for select to authenticated using (customer_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "customer owns suborders" on public.seller_suborders for select to authenticated using (
  public.is_marketplace_admin() or exists(select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())) or exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid()))
);
create policy "order items authorized read" on public.order_items for select to authenticated using (
  public.is_marketplace_admin() or exists(select 1 from public.seller_suborders so join public.orders o on o.id = so.order_id left join public.seller_profiles s on s.id = so.seller_id where so.id = suborder_id and (o.customer_id = (select auth.uid()) or s.user_id = (select auth.uid())))
);
create policy "payments customer or admin read" on public.payments for select to authenticated using (
  public.is_marketplace_admin() or exists(select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid()))
);
create policy "shipments authorized read" on public.shipments for select to authenticated using (
  public.is_marketplace_admin() or exists(select 1 from public.seller_suborders so join public.orders o on o.id = so.order_id left join public.seller_profiles s on s.id = so.seller_id where so.id = suborder_id and (o.customer_id = (select auth.uid()) or s.user_id = (select auth.uid())))
);

create policy "return customer or admin read" on public.returns for select to authenticated using (customer_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "customer create own return" on public.returns for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "admin manage returns" on public.returns for update to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());

create policy "support case customer or admin read" on public.support_cases for select to authenticated using (customer_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "customer create support case" on public.support_cases for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "admin manage support" on public.support_cases for update to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());

create policy "published reviews public read" on public.product_reviews for select to anon, authenticated using (status = 'published' or customer_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "customer create review" on public.product_reviews for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "admin moderate reviews" on public.product_reviews for update to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());

create policy "public questions read" on public.product_questions for select to anon, authenticated using (status in ('open','answered') or customer_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "customer create question" on public.product_questions for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "admin moderate questions" on public.product_questions for update to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());

create policy "wishlist owner read" on public.wishlists for select to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "wishlist owner create" on public.wishlists for insert to authenticated with check (user_id = (select auth.uid()));
create policy "wishlist owner update" on public.wishlists for update to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin()) with check (user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "wishlist owner delete" on public.wishlists for delete to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "wishlist items owner read" on public.wishlist_items for select to authenticated using (exists(select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())) or public.is_marketplace_admin());
create policy "wishlist items owner manage" on public.wishlist_items for all to authenticated using (exists(select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())) or public.is_marketplace_admin()) with check (exists(select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())) or public.is_marketplace_admin());

create policy "comparison owner read" on public.product_comparisons for select to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "comparison owner manage" on public.product_comparisons for all to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin()) with check (user_id = (select auth.uid()) or public.is_marketplace_admin());

create policy "notification prefs owner read" on public.notification_preferences for select to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "notification prefs owner manage" on public.notification_preferences for all to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin()) with check (user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "notification events owner read" on public.notification_events for select to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin());

create policy "payout seller or admin read" on public.payouts for select to authenticated using (public.is_marketplace_admin() or exists(select 1 from public.seller_profiles s where s.id = seller_id and s.user_id = (select auth.uid())));
create policy "admin manage payouts" on public.payouts for all to authenticated using (public.is_marketplace_admin()) with check (public.is_marketplace_admin());

create policy "audit logs admin read" on public.audit_logs for select to authenticated using (public.is_marketplace_admin());

-- Intentionally no broad insert/update policies for payments, orders, stock movements, payouts, audit logs or notification delivery.
-- These mutations must be performed by reviewed server-side functions using verified identity and transaction/idempotency controls.
