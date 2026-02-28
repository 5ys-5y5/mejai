-- Dependency checks before dropping public."B_chat_settings"
-- Run each section and verify no rows are returned.

-- 1) Views / materialized views that reference the table
SELECT table_schema, table_name
FROM information_schema.views
WHERE view_definition ILIKE '%B_chat_settings%';

SELECT schemaname, matviewname
FROM pg_matviews
WHERE definition ILIKE '%B_chat_settings%';

-- 2) Functions / procedures that reference the table (source search)
SELECT n.nspname AS schema_name, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosrc ILIKE '%B_chat_settings%';

-- 3) Triggers that reference functions mentioning the table
SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name, p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE p.prosrc ILIKE '%B_chat_settings%';

-- 4) Row level security policies referencing the table
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE qual ILIKE '%B_chat_settings%' OR with_check ILIKE '%B_chat_settings%';

-- 5) Foreign keys referencing the table
SELECT
  conname AS constraint_name,
  conrelid::regclass AS dependent_table
FROM pg_constraint
WHERE confrelid = 'public."B_chat_settings"'::regclass;

-- If all result sets are empty, you can drop safely:
-- DROP TABLE public."B_chat_settings";
