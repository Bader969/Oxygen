-- Migration: Workshop Expert Features (Deadlines, Express Priority, Passcode, Intake Checklist, Notes, Warranty)
alter table public.repairs 
add column if not exists priority text not null default 'normal' check (priority in ('normal', 'express', 'low')),
add column if not exists estimated_completion timestamptz,
add column if not exists device_passcode text,
add column if not exists intake_condition text,
add column if not exists accessories text,
add column if not exists technician_notes text,
add column if not exists warranty_months integer default 3,
add column if not exists completed_at timestamptz;

-- Add index on priority and estimated_completion for performant ordering
create index if not exists idx_repairs_priority on public.repairs(priority);
create index if not exists idx_repairs_estimated_completion on public.repairs(estimated_completion);
create index if not exists idx_repairs_status on public.repairs(status);
