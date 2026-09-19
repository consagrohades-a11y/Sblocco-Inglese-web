do $$
begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    insert into storage.buckets (
      id, name, public, file_size_limit, allowed_mime_types
    ) values (
      'exercise-content-media',
      'exercise-content-media',
      false,
      104857600,
      array[
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-m4v'
      ]::text[]
    )
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

    execute 'drop policy if exists exercise_content_media_select on storage.objects';
    execute 'create policy exercise_content_media_select on storage.objects for select to authenticated using (bucket_id = ''exercise-content-media'')';

    execute 'drop policy if exists exercise_content_media_insert on storage.objects';
    execute 'create policy exercise_content_media_insert on storage.objects for insert to authenticated with check (bucket_id = ''exercise-content-media'' and public.is_admin())';

    execute 'drop policy if exists exercise_content_media_update on storage.objects';
    execute 'create policy exercise_content_media_update on storage.objects for update to authenticated using (bucket_id = ''exercise-content-media'' and public.is_admin()) with check (bucket_id = ''exercise-content-media'' and public.is_admin())';

    execute 'drop policy if exists exercise_content_media_delete on storage.objects';
    execute 'create policy exercise_content_media_delete on storage.objects for delete to authenticated using (bucket_id = ''exercise-content-media'' and public.is_admin())';
  end if;
end;
$$;
