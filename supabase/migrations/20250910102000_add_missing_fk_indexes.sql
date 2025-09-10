-- Create missing indexes for foreign key columns to improve performance
DO
$$
DECLARE
  r RECORD;
  idx_exists BOOLEAN;
  idx_name TEXT;
BEGIN
  FOR r IN
    SELECT
      ns.nspname AS schema_name,
      cl.relname AS table_name,
      c.conname AS constraint_name,
      a.attname AS column_name,
      c.conrelid AS table_oid
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    JOIN LATERAL unnest(c.conkey) AS k(attnum) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f'
      AND ns.nspname = 'public'
  LOOP
    -- Check if an index exists on the FK column
    SELECT EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      WHERE i.indrelid = r.table_oid
        AND i.indisvalid
        AND i.indisready
        AND array_position(i.indkey, (SELECT attnum FROM pg_attribute WHERE attrelid = r.table_oid AND attname = r.column_name)) IS NOT NULL
    ) INTO idx_exists;

    IF NOT idx_exists THEN
      idx_name := format('idx_%s_%s_fk', r.table_name, r.column_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%I)', idx_name, r.schema_name, r.table_name, r.column_name);
      RAISE NOTICE 'Created missing FK index % on %.% (%)', idx_name, r.schema_name, r.table_name, r.column_name;
    END IF;
  END LOOP;
END
$$;

