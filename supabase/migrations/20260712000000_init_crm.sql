-- Enable the necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_net";

-- Create customers table
create table public.customers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text,
    preferred_language varchar(2) not null check (preferred_language in ('ar', 'tr')),
    created_at timestamptz not null default now()
);

-- Create repairs table
create table public.repairs (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid references public.customers(id) on delete cascade not null,
    device_model text not null,
    issue_description text not null,
    status text not null default 'received',
    cost numeric,
    qr_hash uuid unique not null default gen_random_uuid(),
    created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.customers enable row level security;
alter table public.repairs enable row level security;

-- Create policies for authenticated staff
create policy "Enable all for authenticated users on customers"
on public.customers
for all
to authenticated
using (true)
with check (true);

create policy "Enable all for authenticated users on repairs"
on public.repairs
for all
to authenticated
using (true)
with check (true);

-- Create the trigger function to call Edge Function via pg_net
create or replace function public.handle_repair_update()
returns trigger as $$
declare
    -- URL of the Edge Function deployed on the hosted Supabase project
    edge_function_url text := 'https://hwzbofvjthveifxqjypb.supabase.co/functions/v1/notify-repair-update';
begin
    -- Only trigger on changes to status or cost
    if (OLD.status is distinct from NEW.status) or (OLD.cost is distinct from NEW.cost) then
        perform net.http_post(
            url := edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                -- Using the provided publishable key to authorize the Edge Function invocation
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
$$ language plpgsql security definer;

-- Create the trigger
create trigger on_repair_status_or_cost_update
after update on public.repairs
for each row
execute function public.handle_repair_update();
