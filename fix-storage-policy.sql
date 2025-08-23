-- Create storage bucket for todo attachments
insert into storage.buckets (id, name, public) 
values ('todo-attachments', 'todo-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for todo attachments
create policy "Authenticated users can upload files" on storage.objects
  for insert with check (
    bucket_id = 'todo-attachments'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can update files" on storage.objects
  for update using (
    bucket_id = 'todo-attachments'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can delete files" on storage.objects
  for delete using (
    bucket_id = 'todo-attachments'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can view todo attachments" on storage.objects
  for select using (bucket_id = 'todo-attachments');
