CREATE OR REPLACE FUNCTION get_total_expenses()
RETURNS TABLE (
  total float,
  adolfo float,
  kari float
) AS $$
BEGIN
  RETURN QUERY
  WITH income_data AS (
    SELECT adolfo_percentage, kari_percentage
    FROM income
    ORDER BY created_at DESC
    LIMIT 1
  ),
  total_expenses AS (
    SELECT SUM(amount) AS total
    FROM expenses
  ),
  percentage_expenses AS (
    SELECT SUM(amount) AS total_percentage
    FROM expenses
    WHERE type = 'percentage'
  ),
  shared_expenses AS (
    SELECT SUM(amount) AS total_shared
    FROM expenses
    WHERE type = 'shared'
  ),
  kari_expenses AS (
    SELECT SUM(amount) AS total_kari
    FROM expenses
    WHERE type = 'kari'
  )
  SELECT
    ROUND(total_expenses.total::numeric, 2)::float,
    ROUND((
      percentage_expenses.total_percentage * income_data.adolfo_percentage / 100 +
      shared_expenses.total_shared / 2
    )::numeric, 2)::float,
    ROUND((
      percentage_expenses.total_percentage * income_data.kari_percentage / 100 +
      shared_expenses.total_shared / 2 +
      kari_expenses.total_kari
    )::numeric, 2)::float
  FROM income_data, total_expenses, percentage_expenses, shared_expenses, kari_expenses;
END;
$$ LANGUAGE plpgsql;
