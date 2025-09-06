-- Payments table for Tranzila and future providers
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ILS',
  description text,
  status text not null default 'pending', -- pending | paid | failed | canceled
  provider text not null default 'tranzila',
  provider_transaction_id text,
  idempotency_key text,
  metadata jsonb default '{}'::jsonb,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uniqueness to ensure idempotency and prevent duplicate IPNs
create unique index if not exists payments_provider_txn_unique
  on public.payments(provider, provider_transaction_id)
  where provider_transaction_id is not null;

create unique index if not exists payments_idempotency_unique
  on public.payments(idempotency_key)
  where idempotency_key is not null;

-- Helpful search indexes
create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);

-- RLS Policies (assumes RLS enabled on schema)
alter table public.payments enable row level security;

-- Clients/coaches can read their own payments
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own
  on public.payments for select
  using (auth.uid() = user_id);

-- Only server/service role should insert/update (webhooks)
drop policy if exists payments_modify_none on public.payments;
create policy payments_modify_none
  on public.payments for all
  using (false)
  with check (false);

