-- 创建会员类型枚举
CREATE TYPE public.membership_type AS ENUM ('free', 'premium');

-- 创建订阅计划枚举
CREATE TYPE public.subscription_plan AS ENUM ('monthly', 'yearly');

-- 在profiles表中添加会员相关字段
ALTER TABLE public.profiles
ADD COLUMN membership public.membership_type NOT NULL DEFAULT 'free'::public.membership_type,
ADD COLUMN membership_expires_at timestamptz;

-- 创建订阅记录表
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL,
  amount decimal(10, 2) NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, expired, cancelled
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- 设置subscriptions表的RLS策略
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的订阅记录
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 管理员可以查看所有订阅记录
CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 创建函数：升级会员
CREATE OR REPLACE FUNCTION upgrade_membership(
  p_user_id uuid,
  p_plan subscription_plan,
  p_amount decimal
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expires_at timestamptz;
  v_subscription_id uuid;
BEGIN
  -- 计算过期时间
  IF p_plan = 'monthly' THEN
    v_expires_at := now() + interval '1 month';
  ELSIF p_plan = 'yearly' THEN
    v_expires_at := now() + interval '1 year';
  END IF;

  -- 更新用户会员状态
  UPDATE profiles
  SET 
    membership = 'premium'::membership_type,
    membership_expires_at = v_expires_at
  WHERE id = p_user_id;

  -- 创建订阅记录
  INSERT INTO subscriptions (user_id, plan, amount, expires_at)
  VALUES (p_user_id, p_plan, p_amount, v_expires_at)
  RETURNING id INTO v_subscription_id;

  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- 创建函数：检查并更新过期会员
CREATE OR REPLACE FUNCTION check_expired_memberships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 将过期的会员降级为免费用户
  UPDATE profiles
  SET membership = 'free'::membership_type
  WHERE membership = 'premium'::membership_type
    AND membership_expires_at < now();

  -- 更新订阅状态
  UPDATE subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$;
