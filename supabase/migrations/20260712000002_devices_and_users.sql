-- Create devices table
create table if not exists public.devices (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references public.customers(id) on delete cascade not null,
    brand text not null,
    model text not null,
    type text not null check (type in ('phone', 'laptop', 'tablet', 'watch', 'other')),
    imei text,
    created_at timestamptz not null default now()
);

-- Enable RLS on devices
alter table public.devices enable row level security;

-- Policies for devices
create policy "Enable all for authenticated users on devices"
on public.devices for all to authenticated using (true) with check (true);

create policy "Enable all for anon users on devices"
on public.devices for all to anon using (true) with check (true);

-- View to expose user info to admin
create or replace view public.staff_users as
select id, email, raw_user_meta_data->>'role' as role, created_at
from auth.users;

-- Admin RPC functions for user CRUD (runs as Postgres superuser)
create or replace function public.admin_delete_user(target_user_id uuid)
returns void as $$
begin
    delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer;

create or replace function public.admin_update_user_role(target_user_id uuid, new_role text)
returns void as $$
begin
    update auth.users 
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
    where id = target_user_id;
end;
$$ language plpgsql security definer;
