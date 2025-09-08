-- Expose a DB health check function for app diagnostics via RPC
create or replace function public.db_health_check()
returns jsonb
language plpgsql
security definer
as $$
declare
  has_handle_new_user boolean;
  users_rls boolean;
  payments_rls boolean;
begin
  select exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'handle_new_user' and n.nspname = 'public'
  ) into has_handle_new_user;

  select c.relrowsecurity
    into users_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'users' and n.nspname = 'public'
    limit 1;

  select c.relrowsecurity
    into payments_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'payments' and n.nspname = 'public'
    limit 1;

  return jsonb_build_object(
    'has_handle_new_user', coalesce(has_handle_new_user, false),
    'users_rls_enabled', coalesce(users_rls, false),
    'payments_rls_enabled', coalesce(payments_rls, false),
    'timestamp', now()
  );
end;
$$;

comment on function public.db_health_check() is 'Returns JSONB with health info: trigger presence and RLS flags';

