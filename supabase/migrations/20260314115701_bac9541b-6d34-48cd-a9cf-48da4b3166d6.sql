
-- 1. login_logs: allow moderator to view all logs
DROP POLICY IF EXISTS "Users can view own login logs" ON public.login_logs;
CREATE POLICY "Users can view own login logs"
ON public.login_logs
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 2. order_items: allow moderator to view all
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 3. orders SELECT: allow moderator
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (
  (auth.uid() = buyer_id)
  OR (auth.uid() = seller_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 4. orders UPDATE: allow moderator
DROP POLICY IF EXISTS "Participants can update orders" ON public.orders;
CREATE POLICY "Participants can update orders"
ON public.orders
FOR UPDATE
USING (
  (auth.uid() = buyer_id)
  OR (auth.uid() = seller_id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
