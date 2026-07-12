-- Temporarily allow anon access for local UI testing without authentication
create policy "Enable all for anon users on customers"
on public.customers
for all
to anon
using (true)
with check (true);

create policy "Enable all for anon users on repairs"
on public.repairs
for all
to anon
using (true)
with check (true);
