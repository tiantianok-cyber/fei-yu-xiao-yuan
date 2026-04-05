-- ============================================================
-- 飞呀飞 校园二手交易平台 - 数据库初始化脚本
-- 生成日期: 2026-04-05
-- 说明: 合并所有迁移文件，可用于全新环境的一次性初始化
-- ============================================================

-- ============================
-- 1. 自定义枚举类型
-- ============================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.product_type AS ENUM ('book', 'other');
CREATE TYPE public.product_condition AS ENUM ('brand_new', 'almost_new', 'slightly_used', 'used', 'heavily_used');
CREATE TYPE public.product_status AS ENUM ('on_sale', 'in_trade', 'sold', 'off_shelf');
CREATE TYPE public.order_status AS ENUM ('trading', 'completed', 'cancelled');
CREATE TYPE public.reviewer_role AS ENUM ('buyer', 'seller');
CREATE TYPE public.account_status AS ENUM ('enabled', 'disabled');

-- ============================
-- 2. 通用函数
-- ============================

-- updated_at 自动更新
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 角色检查（SECURITY DEFINER 避免 RLS 递归）
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================
-- 3. 数据表
-- ============================

-- 用户资料
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  province TEXT,
  city TEXT,
  district TEXT,
  community TEXT,
  school TEXT,
  child_grade TEXT,
  child_semester TEXT,
  avatar_url TEXT,
  status public.account_status NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 用户角色
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 商品
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type public.product_type NOT NULL DEFAULT 'book',
  name TEXT NOT NULL,
  author TEXT,
  translator TEXT,
  publisher TEXT,
  publish_date TEXT,
  cover_image_url TEXT,
  grade TEXT[],
  semester TEXT,
  book_tag TEXT,
  condition public.product_condition NOT NULL,
  condition_note TEXT,
  description TEXT,
  defect_description TEXT,
  price NUMERIC(10,2) NOT NULL,
  school TEXT,
  status public.product_status NOT NULL DEFAULT 'on_sale',
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_products_seller ON public.products(seller_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_type ON public.products(type);
CREATE INDEX idx_products_school ON public.products(school);

-- 购物车
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 订单
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status public.order_status NOT NULL DEFAULT 'trading',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);

-- 订单明细
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  price_at_purchase NUMERIC(10,2) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 评价
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewer_role public.reviewer_role NOT NULL,
  cooperation_score INTEGER NOT NULL CHECK (cooperation_score >= 1 AND cooperation_score <= 5),
  description_match_score INTEGER CHECK (description_match_score >= 1 AND description_match_score <= 5),
  content TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);

-- 登录日志
CREATE TABLE public.login_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device TEXT,
  ip TEXT
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- 商品浏览记录
CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- ============================
-- 4. RLS 策略
-- ============================

-- profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- products
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT
  USING (
    (status = ANY (ARRAY['on_sale'::product_status, 'in_trade'::product_status]))
    OR (seller_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );
CREATE POLICY "Users can create products" ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE
  USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE
  USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));

-- cart_items
CREATE POLICY "Users can view own cart" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add to cart" ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from cart" ON public.cart_items FOR DELETE USING (auth.uid() = user_id);

-- orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT
  USING (
    (auth.uid() = buyer_id) OR (auth.uid() = seller_id)
    OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
  );
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update orders" ON public.orders FOR UPDATE
  USING (
    (auth.uid() = buyer_id) OR (auth.uid() = seller_id)
    OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- order_items
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.buyer_id = auth.uid()
  ));

-- reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- login_logs
CREATE POLICY "System can insert login logs" ON public.login_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own login logs" ON public.login_logs FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- product_views
CREATE POLICY "Authenticated users can log views" ON public.product_views FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'::text);
CREATE POLICY "Admins can view product views" ON public.product_views FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

-- ============================
-- 5. 业务触发器和函数
-- ============================

-- 注册时自动创建 profile 和分配默认角色
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, nickname, province, city, district, community, school, child_grade, child_semester)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    COALESCE(NEW.raw_user_meta_data->>'province', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'district', ''),
    COALESCE(NEW.raw_user_meta_data->>'community', ''),
    COALESCE(NEW.raw_user_meta_data->>'school', ''),
    COALESCE(NEW.raw_user_meta_data->>'child_grade', ''),
    COALESCE(NEW.raw_user_meta_data->>'child_semester', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 清理旧登录日志
CREATE OR REPLACE FUNCTION public.cleanup_old_login_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_logs WHERE login_time < now() - interval '1 year';
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_login_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF random() < 0.01 THEN
    PERFORM public.cleanup_old_login_logs();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_login_logs
  AFTER INSERT ON public.login_logs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_cleanup_old_login_logs();

-- 商品浏览计数
CREATE OR REPLACE FUNCTION public.increment_product_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET view_count = view_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_view_insert
  AFTER INSERT ON public.product_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_product_view_count();

-- 商品状态自动同步（基于订单状态）
CREATE OR REPLACE FUNCTION public.recompute_product_status(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_status public.product_status;
BEGIN
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = _product_id AND o.status = 'completed'
    ) THEN 'sold'::public.product_status
    WHEN EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = _product_id AND o.status = 'trading'
    ) THEN 'in_trade'::public.product_status
    ELSE 'on_sale'::public.product_status
  END INTO _next_status;

  UPDATE public.products
  SET status = _next_status, updated_at = now()
  WHERE id = _product_id AND status IS DISTINCT FROM _next_status;
END;
$$;

-- 订单明细变更时同步商品状态
CREATE OR REPLACE FUNCTION public.sync_product_status_on_order_item_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_product_status(NEW.product_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_product_status(OLD.product_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_product_status_on_order_items
  AFTER INSERT OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_status_on_order_item_change();

-- 订单状态变更时同步商品状态
CREATE OR REPLACE FUNCTION public.sync_product_status_on_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _product_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    FOR _product_id IN
      SELECT oi.product_id FROM public.order_items oi WHERE oi.order_id = NEW.id
    LOOP
      PERFORM public.recompute_product_status(_product_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_product_status_on_orders
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_status_on_order_update();

-- ============================
-- 6. 存储桶
-- ============================
-- 需要在 Supabase Dashboard 或通过 API 创建:
-- 桶名: product-images, 公开访问: 是
