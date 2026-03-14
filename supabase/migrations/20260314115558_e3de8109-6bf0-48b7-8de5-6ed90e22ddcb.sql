
DROP POLICY IF EXISTS "Admins can view product views" ON public.product_views;

CREATE POLICY "Admins can view product views"
ON public.product_views
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
