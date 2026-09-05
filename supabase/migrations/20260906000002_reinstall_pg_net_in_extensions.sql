-- ==============================================================================
-- Migration: Reinstall pg_net in the "extensions" schema
-- Resolves warning: extension_in_public (pg_net)
-- ==============================================================================

-- 1. Drop existing pg_net from public schema
drop trigger if exists on_repair_status_or_cost_update on public.repairs;
drop function if exists public.handle_repair_update();
drop extension if exists pg_net;

-- 2. Create schema extensions if not present
create schema if not exists extensions;

-- 3. Install pg_net in the extensions schema
create extension pg_net with schema extensions;

-- 4. Recreate trigger function with secure search_path and no public RPC execution
create or replace function public.handle_repair_update()
returns trigger as $$
declare
    edge_function_url text := 'https://hwzbofvjthveifxqjypb.supabase.co/functions/v1/notify-repair-update';
begin
    if (OLD.status is distinct from NEW.status) or (OLD.cost is distinct from NEW.cost) then
        perform net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer sb_publishable_5V0HP0tuct-bs81m055-5w_GPa-I_me'
            ),
            body := jsonb_build_object(
                'type', 'UPDATE',
                'table', 'repairs',
                'schema', 'public',
                'record', row_to_json(NEW),
                'old_record', row_to_json(OLD)
            )
        );
    end if;
    return NEW;
end;
$$ language plpgsql security definer set search_path = public, extensions, net;

-- Prevent PostgREST from exposing the trigger function via RPC
revoke all on function public.handle_repair_update() from public, anon, authenticated;

-- 5. Re-attach trigger
create trigger on_repair_status_or_cost_update
after update on public.repairs
for each row
execute function public.handle_repair_update();
