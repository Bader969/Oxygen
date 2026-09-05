-- Fix Supabase Security Advisor Errors:
-- 1. auth_users_exposed (0002): View "staff_users" exposes auth.users to anon/authenticated via PostgREST
-- 2. security_definer_view (0010): View "staff_users" defined with SECURITY DEFINER property

-- Step 1: Drop the insecure view that triggers auth_users_exposed and security_definer_view
drop view if exists public.staff_users;

-- Step 2: Create a secure RPC function accessible ONLY to authenticated admin users
create or replace function public.get_staff_users()
returns table (
    id uuid,
    email text,
    role text,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    calling_user_role text;
    calling_user_email text;
begin
    -- Must be authenticated
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    -- Check caller is admin
    select 
        raw_user_meta_data->>'role',
        email
    into 
        calling_user_role,
        calling_user_email
    from auth.users
    where id = auth.uid();

    if coalesce(calling_user_role, '') != 'admin' and coalesce(calling_user_email, '') != 'admin@oxygen.com' then
        raise exception 'Unauthorized: Admin access required';
    end if;

    return query
    select 
        u.id,
        u.email::text,
        coalesce(u.raw_user_meta_data->>'role', 'technician')::text as role,
        u.created_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

-- Step 3: Revoke execution from anonymous/public users, grant only to authenticated users
revoke all on function public.get_staff_users() from public, anon;
grant execute on function public.get_staff_users() to authenticated;

-- Step 4: Secure admin_delete_user against unauthorized access
create or replace function public.admin_delete_user(target_user_id uuid)
returns void as $$
declare
    calling_user_role text;
    calling_user_email text;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    select raw_user_meta_data->>'role', email
    into calling_user_role, calling_user_email
    from auth.users
    where id = auth.uid();

    if coalesce(calling_user_role, '') != 'admin' and coalesce(calling_user_email, '') != 'admin@oxygen.com' then
        raise exception 'Unauthorized: Admin access required';
    end if;

    delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer set search_path = public, auth;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Step 5: Secure admin_update_user_role against unauthorized access
create or replace function public.admin_update_user_role(target_user_id uuid, new_role text)
returns void as $$
declare
    calling_user_role text;
    calling_user_email text;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    select raw_user_meta_data->>'role', email
    into calling_user_role, calling_user_email
    from auth.users
    where id = auth.uid();

    if coalesce(calling_user_role, '') != 'admin' and coalesce(calling_user_email, '') != 'admin@oxygen.com' then
        raise exception 'Unauthorized: Admin access required';
    end if;

    update auth.users 
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
    where id = target_user_id;
end;
$$ language plpgsql security definer set search_path = public, auth;

revoke all on function public.admin_update_user_role(uuid, text) from public, anon;
grant execute on function public.admin_update_user_role(uuid, text) to authenticated;
