-- Admin User Management Enhancement
-- Provides extended staff queries, metadata updates, and admin password reset

-- 1. Extended staff users with name and granular permissions
create or replace function public.get_staff_users_extended()
returns table (
    id uuid,
    email text,
    role text,
    name text,
    permissions jsonb,
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
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

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
        coalesce(u.raw_user_meta_data->>'name', split_part(u.email::text, '@', 1))::text as name,
        coalesce(u.raw_user_meta_data->'permissions', '[]'::jsonb) as permissions,
        u.created_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

revoke all on function public.get_staff_users_extended() from public, anon;
grant execute on function public.get_staff_users_extended() to authenticated;

-- 2. Update user details (role, display name, permissions)
create or replace function public.admin_update_user_details(
    target_user_id uuid,
    new_role text default null,
    new_name text default null,
    new_permissions jsonb default null
)
returns void as $$
declare
    calling_user_role text;
    calling_user_email text;
    current_meta jsonb;
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

    select coalesce(raw_user_meta_data, '{}'::jsonb) into current_meta
    from auth.users where id = target_user_id;

    if new_role is not null then
        current_meta = current_meta || jsonb_build_object('role', new_role);
    end if;
    if new_name is not null then
        current_meta = current_meta || jsonb_build_object('name', new_name);
    end if;
    if new_permissions is not null then
        current_meta = current_meta || jsonb_build_object('permissions', new_permissions);
    end if;

    update auth.users
    set raw_user_meta_data = current_meta,
        updated_at = now()
    where id = target_user_id;
end;
$$ language plpgsql security definer set search_path = public, auth;

revoke all on function public.admin_update_user_details(uuid, text, text, jsonb) from public, anon;
grant execute on function public.admin_update_user_details(uuid, text, text, jsonb) to authenticated;

-- 3. Admin Reset Password
create or replace function public.admin_reset_user_password(target_user_id uuid, new_password text)
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
    set encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    where id = target_user_id;
end;
$$ language plpgsql security definer set search_path = public, auth, extensions;

revoke all on function public.admin_reset_user_password(uuid, text) from public, anon;
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;
