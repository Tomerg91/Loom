-- Ensure all required enum types exist
-- This migration creates missing enum types that are required for signup to work

-- Create user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('client', 'coach', 'admin');
        RAISE NOTICE 'Created user_role enum type';
    ELSE
        RAISE NOTICE 'user_role enum type already exists';
    END IF;
END$$;

-- Create user_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
        RAISE NOTICE 'Created user_status enum type';
    ELSE
        RAISE NOTICE 'user_status enum type already exists';
    END IF;
END$$;

-- Create language enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language') THEN
        CREATE TYPE language AS ENUM ('en', 'he');
        RAISE NOTICE 'Created language enum type';
    ELSE
        RAISE NOTICE 'language enum type already exists';
    END IF;
END$$;

-- Verify enum types are available
DO $$
DECLARE
    user_role_exists boolean;
    user_status_exists boolean; 
    language_exists boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') INTO user_role_exists;
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') INTO user_status_exists;
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language') INTO language_exists;
    
    RAISE NOTICE 'Enum type verification: user_role=%, user_status=%, language=%', 
        user_role_exists, user_status_exists, language_exists;
        
    IF NOT (user_role_exists AND user_status_exists AND language_exists) THEN
        RAISE EXCEPTION 'One or more required enum types are missing';
    END IF;
END$$;