-- 创建订单状态枚举
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建 SKU 表（用于存储订阅计划作为商品）
CREATE TABLE IF NOT EXISTS public.sku (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_code text NOT NULL UNIQUE,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    inventory_total int NOT NULL DEFAULT 999999,
    inventory_available int NOT NULL DEFAULT 999999,
    inventory_reserved int NOT NULL DEFAULT 0,
    inventory_sold int NOT NULL DEFAULT 0,
    create_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 创建订单表
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no text UNIQUE NOT NULL,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status public.order_status NOT NULL DEFAULT 'pending'::public.order_status,
    wechat_pay_url text,
    total_amount numeric(12,2) NOT NULL,
    sku_code text NOT NULL REFERENCES public.sku(sku_code),
    plan_type text NOT NULL, -- 'monthly' or 'yearly'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 设置 RLS
ALTER TABLE public.sku ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- SKU 策略：所有人可见，仅管理员可编辑
CREATE POLICY "Anyone can view SKU" ON public.sku FOR SELECT USING (true);
CREATE POLICY "Admins can manage SKU" ON public.sku FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 订单策略：用户查看自己的，管理员查看所有
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 插入默认商品 SKU
INSERT INTO public.sku (sku_code, name, price, create_by)
SELECT 'membership_monthly', 'ZTV Premium Monthly Membership', 7.00, id FROM profiles WHERE role = 'admin' LIMIT 1
ON CONFLICT (sku_code) DO NOTHING;

INSERT INTO public.sku (sku_code, name, price, create_by)
SELECT 'membership_yearly', 'ZTV Premium Yearly Membership', 72.00, id FROM profiles WHERE role = 'admin' LIMIT 1
ON CONFLICT (sku_code) DO NOTHING;

-- 会员更新逻辑：支付成功后调用。我们也可以在 webhook 中直接更新 profiles 表。
-- 但我们需要确保原子性。
