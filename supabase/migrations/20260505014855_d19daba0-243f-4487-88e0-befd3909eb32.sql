insert into storage.buckets (id, name, public) values ('class-covers', 'class-covers', true) on conflict (id) do nothing;

create policy "Public can read class covers"
on storage.objects for select
using (bucket_id = 'class-covers');

create policy "Admins can upload class covers"
on storage.objects for insert
to authenticated
with check (bucket_id = 'class-covers' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update class covers"
on storage.objects for update
to authenticated
using (bucket_id = 'class-covers' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete class covers"
on storage.objects for delete
to authenticated
using (bucket_id = 'class-covers' and public.has_role(auth.uid(), 'admin'));