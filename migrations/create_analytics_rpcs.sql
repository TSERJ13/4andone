-- ====================================================================
-- Run these SQL queries in your Supabase SQL Editor to enable accurate,
-- real-time analytics calculations bypassing the 1000-row client limit.
-- ====================================================================

-- 1. get_platform_metrics: Calculates visitor totals and unique counts
CREATE OR REPLACE FUNCTION public.get_platform_metrics(
  today_start timestamptz,
  week_start timestamptz,
  month_start timestamptz,
  year_start timestamptz
)
RETURNS TABLE (
  visits_today bigint,
  visits_week bigint,
  visits_month bigint,
  visits_year bigint,
  unique_today bigint,
  unique_week bigint,
  unique_month bigint,
  unique_year bigint,
  avg_duration_seconds double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.page_visits WHERE created_at >= today_start) as visits_today,
    (SELECT COUNT(*) FROM public.page_visits WHERE created_at >= week_start) as visits_week,
    (SELECT COUNT(*) FROM public.page_visits WHERE created_at >= month_start) as visits_month,
    (SELECT COUNT(*) FROM public.page_visits WHERE created_at >= year_start) as visits_year,
    (SELECT COUNT(DISTINCT session_id) FROM public.page_visits WHERE created_at >= today_start) as unique_today,
    (SELECT COUNT(DISTINCT session_id) FROM public.page_visits WHERE created_at >= week_start) as unique_week,
    (SELECT COUNT(DISTINCT session_id) FROM public.page_visits WHERE created_at >= month_start) as unique_month,
    (SELECT COUNT(DISTINCT session_id) FROM public.page_visits WHERE created_at >= year_start) as unique_year,
    COALESCE((SELECT AVG(duration_seconds) FROM public.page_visits WHERE created_at >= month_start AND duration_seconds > 0), 0) as avg_duration_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. get_country_stats: Groups and aggregates page_visits by country
CREATE OR REPLACE FUNCTION public.get_country_stats(start_time timestamptz)
RETURNS TABLE (
  country_code text,
  country_name text,
  count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.country_code, 
    COALESCE(MAX(pv.country_name), pv.country_code) as country_name, 
    COUNT(*) as count
  FROM public.page_visits pv
  WHERE pv.created_at >= start_time AND pv.country_code IS NOT NULL
  GROUP BY pv.country_code
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. get_traffic_buckets: Calculates visitor counts in time slots (hourly, daily, monthly)
CREATE OR REPLACE FUNCTION public.get_traffic_buckets(period_type text, start_time timestamptz)
RETURNS TABLE (
  bucket_label text,
  visit_count bigint
) AS $$
BEGIN
  IF period_type = 'day' THEN
    RETURN QUERY
    SELECT 
      to_char(created_at AT TIME ZONE 'UTC', 'HH24') || 'h' as bucket_label,
      COUNT(*) as visit_count
    FROM public.page_visits
    WHERE created_at >= start_time
    GROUP BY bucket_label
    ORDER BY bucket_label;
  ELSIF period_type = 'week' THEN
    RETURN QUERY
    SELECT 
      to_char(created_at AT TIME ZONE 'UTC', 'Dy') as bucket_label,
      COUNT(*) as visit_count
    FROM public.page_visits
    WHERE created_at >= start_time
    GROUP BY bucket_label, to_char(created_at AT TIME ZONE 'UTC', 'D')
    ORDER BY to_char(created_at AT TIME ZONE 'UTC', 'D');
  ELSIF period_type = 'month' THEN
    RETURN QUERY
    SELECT 
      to_char(created_at AT TIME ZONE 'UTC', 'DD') as bucket_label,
      COUNT(*) as visit_count
    FROM public.page_visits
    WHERE created_at >= start_time
    GROUP BY bucket_label
    ORDER BY bucket_label;
  ELSE -- year
    RETURN QUERY
    SELECT 
      to_char(created_at AT TIME ZONE 'UTC', 'Mon') as bucket_label,
      COUNT(*) as visit_count
    FROM public.page_visits
    WHERE created_at >= start_time
    GROUP BY bucket_label, to_char(created_at AT TIME ZONE 'UTC', 'MM')
    ORDER BY to_char(created_at AT TIME ZONE 'UTC', 'MM');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. get_recent_activity: Returns the most recent visitor logs
CREATE OR REPLACE FUNCTION public.get_recent_activity(limit_val integer)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  session_id text,
  user_ref text,
  duration_seconds integer,
  country_code text,
  country_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.id,
    pv.created_at,
    pv.session_id,
    pv.user_ref,
    pv.duration_seconds,
    pv.country_code,
    pv.country_name
  FROM public.page_visits pv
  ORDER BY pv.created_at DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
