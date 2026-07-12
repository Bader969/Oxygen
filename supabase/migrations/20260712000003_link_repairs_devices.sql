-- Add device_id column to repairs table
alter table public.repairs add column if not exists device_id uuid references public.devices(id) on delete set null;
