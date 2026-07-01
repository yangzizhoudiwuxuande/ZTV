-- 创建视频存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  '300044_videos',
  '300044_videos',
  true,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
);

-- 创建缩略图存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  '300044_thumbnails',
  '300044_thumbnails',
  true,
  1048576, -- 1MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 设置视频桶的存储策略
CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = '300044_videos');

CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = '300044_videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own videos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = '300044_videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = '300044_videos' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid())));

-- 设置缩略图桶的存储策略
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = '300044_thumbnails');

CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = '300044_thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own thumbnails" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = '300044_thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own thumbnails" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = '300044_thumbnails' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid())));
