CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_id uuid;
BEGIN
  RAISE NOTICE 'Custom access token hook started for event: %', event;

  -- Extract user ID from the event
  user_id := (event->>'user_id')::uuid;
  RAISE NOTICE 'Hook: Extracted user_id: %', user_id;
  
  -- Fetch the user role from the users table
  SELECT role::text INTO user_role 
  FROM public.users 
  WHERE id = user_id;
  RAISE NOTICE 'Hook: Fetched user_role: %', user_role;
  
  -- Get existing claims
  claims := event->'claims';
  
  -- Add the role to claims
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  ELSE
    -- Default role if none found
    RAISE NOTICE 'Hook: user_role is NULL, defaulting to client';
    claims := jsonb_set(claims, '{role}', to_jsonb('client'));
  END IF;
  
  -- Update the event with new claims
  event := jsonb_set(event, '{claims}', claims);
  
  RAISE NOTICE 'Hook: Returning event: %', event;
  RETURN event;
END;
$$;