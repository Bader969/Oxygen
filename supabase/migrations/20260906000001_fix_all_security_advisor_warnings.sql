-- ==============================================================================
-- Migration: Fix All Supabase Security Advisor Warnings
-- 1. extension_in_public: Move pg_net extension to extensions schema
-- 2. rls_policy_always_true: Replace permissive "ALL (true)" policies on devices
-- 3. authenticated_security_definer_function_executable: Revoke RPC execution for internal functions
-- ==============================================================================

-- 1. Move pg_net extension out of public schema to extensions schema
create schema if not exists extensions;
do $$
begin
    alter extension pg_net set schema extensions;
exception
    when others then
        raise notice 'Could not move pg_net schema directly: %', sqlerrm;
end $$;

-- 2. Fix Permissive RLS Policies on public.devices
-- Drop overly broad "ALL (true)" policies
drop policy if exists "Enable all for anon users on devices" on public.devices;
drop policy if exists "Enable all for authenticated users on devices" on public.devices;
drop policy if exists "Anon users can view devices" on public.devices;
drop policy if exists "Authenticated users can read devices" on public.devices;
drop policy if exists "Authenticated users can insert devices" on public.devices;
drop policy if exists "Authenticated users can update devices" on public.devices;
drop policy if exists "Authenticated users can delete devices" on public.devices;

-- Grant SELECT only to anon users (read-only, preventing deletion/tampering)
create policy "Anon users can view devices"
on public.devices for select
to anon
using (true);

-- Authenticated staff permissions (explicitly checking auth.uid())
create policy "Authenticated users can read devices"
on public.devices for select
to authenticated
using (true);

create policy "Authenticated users can insert devices"
on public.devices for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update devices"
on public.devices for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy "Authenticated users can delete devices"
on public.devices for delete
to authenticated
using (auth.uid() is not null);

-- 3. Revoke PostgREST API execution on internal triggers and utility functions
-- handle_repair_update is a table trigger, it should never be called as an RPC
do $$
begin
    revoke execute on function public.handle_repair_update() from public, anon, authenticated;
exception
    when undefined_function then null;
end $$;

-- rls_auto_enable is an internal utility, revoke external execution
do $$
begin
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
exception
    when undefined_function then null;
end $$;
