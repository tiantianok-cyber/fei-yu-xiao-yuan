
-- Create a scheduled cleanup function to delete login_logs older than 1 year
CREATE OR REPLACE FUNCTION public.cleanup_old_login_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.login_logs
  WHERE login_time < now() - interval '1 year';
END;
$$;

-- Create a trigger that runs cleanup on each insert (lightweight, only deletes old rows)
CREATE OR REPLACE FUNCTION public.trigger_cleanup_old_login_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Run cleanup roughly 1% of the time to avoid overhead on every insert
  IF random() < 0.01 THEN
    PERFORM public.cleanup_old_login_logs();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_login_logs
AFTER INSERT ON public.login_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_cleanup_old_login_logs();
