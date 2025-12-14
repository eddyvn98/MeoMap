-- Admin Shop Policies and Functions
-- NOTE: Adjust table/column names if different in your schema.

-- Enable RLS on products table
alter table products enable row level security;

-- Ensure profiles has is_admin flag
alter table profiles add column if not exists is_admin boolean default false;

-- Allow public read (or restrict to authenticated)
drop policy if exists products_read_all on products;
create policy products_read_all on products
  for select
  using (true);

-- Assume a profiles table with `user_id` (uuid) and `is_admin` (boolean)
-- Admin insert
drop policy if exists products_admin_insert on products;
create policy products_admin_insert on products
  for insert
  to authenticated
  with check (exists (
    select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- Admin update
drop policy if exists products_admin_update on products;
create policy products_admin_update on products
  for update
  to authenticated
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
  ))
  with check (exists (
    select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- Admin delete
drop policy if exists products_admin_delete on products;
create policy products_admin_delete on products
  for delete
  to authenticated
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
  ));

-- Optional: Security definer RPC to upsert product via JSON payload
create or replace function admin_upsert_product(p_product jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_id uuid;
begin
  select is_admin into v_is_admin from profiles where id = v_uid;
  if v_is_admin is not true then
    raise exception 'not_admin';
  end if;

  -- Upsert by id if provided else insert new
  if p_product ? 'id' then
    update products set
      name = coalesce((p_product->>'name')::text, name),
      price = coalesce((p_product->>'price')::numeric, price),
      category = coalesce((p_product->>'category')::text, category),
      description = coalesce((p_product->>'description')::text, description),
      stock = coalesce((p_product->>'stock')::int, stock),
      image_url = coalesce((p_product->>'image_url')::text, image_url),
      updated_at = now()
    where id = (p_product->>'id')::uuid
    returning id into v_id;
  else
    insert into products (name, price, category, description, stock, image_url)
    values (
      (p_product->>'name')::text,
      (p_product->>'price')::numeric,
      (p_product->>'category')::text,
      (p_product->>'description')::text,
      (p_product->>'stock')::int,
      (p_product->>'image_url')::text
    ) returning id into v_id;
  end if;

  return v_id;
end; $$;

-- Optional: Security definer RPC to delete product
create or replace function admin_delete_product(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from profiles where id = v_uid;
  if v_is_admin is not true then
    raise exception 'not_admin';
  end if;

  delete from products where id = p_id;
end; $$;
