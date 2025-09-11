-- Debug migration to investigate user_role enum issue
-- This will help us understand why the signup is still failing

-- Check if user_role enum exists and in which schemas
DO $$
DECLARE
    enum_record RECORD;
    schema_count INTEGER := 0;
    current_search_path TEXT;
BEGIN
    -- Show current search path
    SHOW search_path INTO current_search_path;
    RAISE NOTICE 'Current search_path: %', current_search_path;
    
    -- List all user_role enums in all schemas
    FOR enum_record IN 
        SELECT 
            n.nspname AS schema_name,
            t.typname AS type_name,
            t.oid AS type_oid,
            array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
        FROM pg_type t 
        JOIN pg_namespace n ON n.oid = t.typnamespace
        LEFT JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        GROUP BY n.nspname, t.typname, t.oid
        ORDER BY n.nspname
    LOOP
        schema_count := schema_count + 1;
        RAISE NOTICE 'Found user_role enum in schema: %, values: %', 
            enum_record.schema_name, enum_record.enum_values;
    END LOOP;
    
    IF schema_count = 0 THEN
        RAISE NOTICE 'NO user_role enum found in any schema!';
        
        -- Try to create it in public schema
        BEGIN
            CREATE TYPE public.user_role AS ENUM ('client', 'coach', 'admin');
            RAISE NOTICE 'Successfully created user_role enum in public schema';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'user_role enum already exists (caught duplicate_object)';
        WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create user_role enum: % %', SQLSTATE, SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Found % user_role enum(s)', schema_count;
    END IF;
    
    -- Test enum casting
    BEGIN
        PERFORM 'client'::user_role;
        RAISE NOTICE 'user_role enum casting works without schema prefix';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'user_role casting failed without prefix: % %', SQLSTATE, SQLERRM;
    END;
    
    BEGIN
        PERFORM 'client'::public.user_role;
        RAISE NOTICE 'public.user_role enum casting works with schema prefix';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'public.user_role casting failed: % %', SQLSTATE, SQLERRM;
    END;
    
    -- Check the actual trigger function
    BEGIN
        SELECT pg_get_functiondef(oid) INTO current_search_path
        FROM pg_proc 
        WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;
        
        RAISE NOTICE 'handle_new_user function definition found: %', 
            length(current_search_path) || ' characters';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not get handle_new_user function definition: % %', SQLSTATE, SQLERRM;
    END;
END$$;