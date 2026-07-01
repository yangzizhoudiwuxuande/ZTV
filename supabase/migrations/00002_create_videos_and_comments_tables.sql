-- 创建视频分类枚举
CREATE TYPE public.video_category AS ENUM ('music', 'gaming', 'education', 'entertainment', 'sports', 'technology', 'news', 'other');

-- 创建视频表
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  category public.video_category NOT NULL DEFAULT 'other'::public.video_category,
  tags text[] DEFAULT '{}',
  duration int, -- 视频时长（秒）
  views int NOT NULL DEFAULT 0,
  uploader_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建评论表
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_videos_uploader ON videos(uploader_id);
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_comments_video ON comments(video_id);
CREATE INDEX idx_comments_user ON comments(user_id);

-- 设置videos表的RLS策略
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看视频
CREATE POLICY "Anyone can view videos" ON videos
  FOR SELECT TO anon, authenticated USING (true);

-- 认证用户可以上传视频
CREATE POLICY "Authenticated users can insert videos" ON videos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- 用户可以更新自己的视频
CREATE POLICY "Users can update their own videos" ON videos
  FOR UPDATE TO authenticated USING (auth.uid() = uploader_id);

-- 用户可以删除自己的视频，管理员可以删除所有视频
CREATE POLICY "Users can delete their own videos" ON videos
  FOR DELETE TO authenticated USING (auth.uid() = uploader_id OR is_admin(auth.uid()));

-- 设置comments表的RLS策略
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看评论
CREATE POLICY "Anyone can view comments" ON comments
  FOR SELECT TO anon, authenticated USING (true);

-- 认证用户可以发表评论
CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的评论
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 用户可以删除自己的评论，管理员可以删除所有评论
CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 创建函数：增加视频观看次数
CREATE OR REPLACE FUNCTION increment_video_views(video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE videos SET views = views + 1 WHERE id = video_id;
END;
$$;
