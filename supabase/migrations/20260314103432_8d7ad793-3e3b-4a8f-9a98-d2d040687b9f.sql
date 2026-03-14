-- Recompute product status from related order statuses (completed > trading > on_sale)
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
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = _product_id
        AND o.status = 'completed'
    ) THEN 'sold'::public.product_status
    WHEN EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = _product_id
        AND o.status = 'trading'
    ) THEN 'in_trade'::public.product_status
    ELSE 'on_sale'::public.product_status
  END
  INTO _next_status;

  UPDATE public.products
  SET status = _next_status,
      updated_at = now()
  WHERE id = _product_id
    AND status IS DISTINCT FROM _next_status;
END;
$$;

-- Keep product status synced when order items are created/removed
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

DROP TRIGGER IF EXISTS trg_sync_product_status_on_order_items ON public.order_items;
CREATE TRIGGER trg_sync_product_status_on_order_items
AFTER INSERT OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_status_on_order_item_change();

-- Keep product status synced when order status changes
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
      SELECT oi.product_id
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
    LOOP
      PERFORM public.recompute_product_status(_product_id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_status_on_orders ON public.orders;
CREATE TRIGGER trg_sync_product_status_on_orders
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_status_on_order_update();

-- Backfill existing data inconsistencies
DO $$
DECLARE
  _product_id uuid;
BEGIN
  FOR _product_id IN
    SELECT DISTINCT oi.product_id
    FROM public.order_items oi
  LOOP
    PERFORM public.recompute_product_status(_product_id);
  END LOOP;
END;
$$;