
-- Fix overly permissive product_views insert policy
DROP POLICY "Anyone can log views" ON public.product_views;
CREATE POLICY "Authenticated users can log views" ON public.product_views FOR INSERT WITH CHECK (auth.role() = 'authenticated');
