
CREATE OR REPLACE FUNCTION public.increment_product_view_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.products
  SET view_count = view_count + 1
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_view_insert
  AFTER INSERT ON public.product_views
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_product_view_count();
