-- ============================================================================
-- ÇEYİZ DEFTERİ — Supabase / PostgreSQL Şeması
--
-- Kullanım: Supabase Dashboard > SQL Editor içine yapıştırıp çalıştırın.
-- Bu şema henüz hiçbir Supabase projesine UYGULANMAMIŞTIR (bu sandbox'ta canlı
-- bir Supabase projesine bağlanılamadı) — yeni bir proje açtığınızda ilk
-- migration olarak bunu çalıştırmanız yeterlidir.
--
-- Mimari notlar:
--   * Her tablo user_id (veya couple_id üzerinden dolaylı) ile sahiplenilir.
--   * RLS tüm tablolarda ZORUNLU olarak açık; "kendi verin" politikası uygulanır.
--   * "couples" ile ortak hesap (madde 25) desteklenir: bir işlem hem bir
--     kullanıcıya hem opsiyonel olarak bir couple'a bağlanabilir; couple
--     üyeleri (owner/partner/read_only) ortak verileri görebilir.
--   * Para birimleri numeric(14,2) — kuruş hassasiyeti için.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- PROFİL
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency text not null default 'TRY',
  locale text not null default 'tr',
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ÇİFT / ORTAK HESAP (Premium)
-- ---------------------------------------------------------------------------
create table if not exists couples (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Ortak Hesap',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists couple_members (
  id uuid primary key default uuid_generate_v4(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','partner','read_only')),
  invited_email text,
  status text not null default 'active' check (status in ('invited','active','removed')),
  created_at timestamptz not null default now(),
  unique (couple_id, user_id)
);

-- ---------------------------------------------------------------------------
-- KREDİ KARTLARI
-- ---------------------------------------------------------------------------
create table if not exists credit_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  name text not null,
  bank text,
  card_limit numeric(14,2) not null default 0,
  statement_day int not null default 1 check (statement_day between 1 and 28),
  due_day int not null default 15 check (due_day between 1 and 28),
  existing_debt numeric(14,2) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- İŞLEMLER (gelir / gider / transfer)
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  who_added text not null default 'me' check (who_added in ('me','partner','shared')),
  type text not null check (type in ('income','expense','transfer')),
  origin text not null default 'manual' check (origin in ('manual','recurring','import')),
  recurring_id uuid,
  "group" text check ("group" in ('dugun','ev','diger')),
  category text,
  desc text not null,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  date date not null,
  payment_method text,
  card_id uuid references credit_cards(id) on delete set null,
  is_installment boolean not null default false,
  down_payment numeric(14,2) default 0,
  installment_count int,
  installment_period text check (installment_period in ('aylik','haftalik','3aylik')),
  income_status text check (income_status in ('Alındı','Alınmadı')),
  from_account text,
  to_account text,
  note text default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_transactions_user on transactions(user_id);
create index if not exists idx_transactions_couple on transactions(couple_id);
create index if not exists idx_transactions_date on transactions(date);

-- ---------------------------------------------------------------------------
-- TAKSİT / ÖDEME SATIRLARI (her transaction en az 1 satır üretir)
-- ---------------------------------------------------------------------------
create table if not exists installments (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  no int not null,          -- 0 = peşinat, 1..N = taksit sırası
  "of" int not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  cancelled boolean not null default false,
  card_id uuid references credit_cards(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_installments_tx on installments(transaction_id);
create index if not exists idx_installments_due on installments(due_date);

create table if not exists transaction_payments (
  id uuid primary key default uuid_generate_v4(),
  installment_id uuid not null references installments(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_date date not null,
  method text,
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_installment on transaction_payments(installment_id);

-- ---------------------------------------------------------------------------
-- DÜZENLİ İŞLEMLER
-- ---------------------------------------------------------------------------
create table if not exists recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  kind text not null check (kind in ('income','expense')),
  desc text not null,
  amount numeric(14,2) not null,
  category text,
  "group" text,
  payment_method text,
  card_id uuid references credit_cards(id) on delete set null,
  start_date date not null,
  frequency text not null check (frequency in ('monthly','weekly','yearly','custom')),
  interval_days int,
  end_date date,
  active boolean not null default true,
  last_generated_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- BÜTÇELER (düğün / ev — kategori bazlı planlanan tutar)
-- ---------------------------------------------------------------------------
create table if not exists budget_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  category text not null,
  "group" text not null check ("group" in ('dugun','ev')),
  planned_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

-- ---------------------------------------------------------------------------
-- EV KURMA — oda bazlı ürünler (madde 23)
-- ---------------------------------------------------------------------------
create table if not exists home_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  room text not null,
  product_name text not null,
  store text,
  price numeric(14,2),
  planned_budget numeric(14,2),
  transaction_id uuid references transactions(id) on delete set null,
  product_url text,
  warranty_months int,
  note text,
  purchase_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- BORÇ / ALACAK
-- ---------------------------------------------------------------------------
create table if not exists debts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete set null,
  direction text not null check (direction in ('borc','alacak')),
  person text not null,
  amount numeric(14,2) not null,
  due_date date,
  note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists debt_payments (
  id uuid primary key default uuid_generate_v4(),
  debt_id uuid not null references debts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_date date not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- BİLDİRİMLER
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  level text not null default 'info' check (level in ('info','amber','red','green')),
  related_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ABONELİK / PREMIUM
-- ---------------------------------------------------------------------------
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','trial','premium','cancelled')),
  cycle text check (cycle in ('monthly','yearly')),
  started_at timestamptz,
  trial_ends_at timestamptz,
  provider text,              -- 'stripe' | 'app_store' | 'play_store'
  provider_ref text,          -- dış sistem abonelik/işlem id'si
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- KULLANICI AYARLARI
-- ---------------------------------------------------------------------------
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lock_enabled boolean not null default false,
  pin_hash text,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table profiles enable row level security;
alter table couples enable row level security;
alter table couple_members enable row level security;
alter table credit_cards enable row level security;
alter table transactions enable row level security;
alter table installments enable row level security;
alter table transaction_payments enable row level security;
alter table recurring_transactions enable row level security;
alter table budget_categories enable row level security;
alter table home_items enable row level security;
alter table debts enable row level security;
alter table debt_payments enable row level security;
alter table notifications enable row level security;
alter table subscriptions enable row level security;
alter table user_settings enable row level security;

-- Yardımcı: kullanıcının bir couple'ın aktif üyesi olup olmadığını kontrol eder
create or replace function is_couple_member(target_couple_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from couple_members
    where couple_id = target_couple_id and user_id = auth.uid() and status = 'active'
  );
$$;

-- profiles
create policy "profiles_self" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- couples: üyeler görebilir, yalnızca oluşturan güncelleyebilir/silebilir
create policy "couples_select_member" on couples for select
  using (created_by = auth.uid() or is_couple_member(id));
create policy "couples_insert_owner" on couples for insert
  with check (created_by = auth.uid());
create policy "couples_update_owner" on couples for update
  using (created_by = auth.uid());

create policy "couple_members_select" on couple_members for select
  using (user_id = auth.uid() or is_couple_member(couple_id));
create policy "couple_members_insert_owner" on couple_members for insert
  with check (exists (select 1 from couples c where c.id = couple_id and c.created_by = auth.uid()));

-- Ortak desen: kullanıcı kendi kaydını her zaman görür; couple_id set edilmişse
-- couple üyeleri de görebilir. Sahiplik (insert/update/delete) her zaman
-- user_id = auth.uid() ile sınırlıdır — bir couple üyesi başka birinin adına
-- kayıt oluşturamaz, yalnızca kendi user_id'siyle couple_id atayabilir.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['credit_cards','transactions','recurring_transactions','budget_categories','home_items','debts']
  loop
    execute format($f$
      create policy "%1$s_select_own_or_couple" on %1$s for select
        using (user_id = auth.uid() or (couple_id is not null and is_couple_member(couple_id)));
    $f$, tbl);
    execute format($f$
      create policy "%1$s_insert_own" on %1$s for insert
        with check (user_id = auth.uid());
    $f$, tbl);
    execute format($f$
      create policy "%1$s_update_own_or_partner" on %1$s for update
        using (user_id = auth.uid() or (couple_id is not null and is_couple_member(couple_id)));
    $f$, tbl);
    execute format($f$
      create policy "%1$s_delete_own" on %1$s for delete
        using (user_id = auth.uid());
    $f$, tbl);
  end loop;
end $$;

-- installments / payments: transactions üzerinden dolaylı yetkilendirme
create policy "installments_via_tx" on installments for all
  using (exists (
    select 1 from transactions t where t.id = transaction_id
    and (t.user_id = auth.uid() or (t.couple_id is not null and is_couple_member(t.couple_id)))
  ));
create policy "payments_via_installment" on transaction_payments for all
  using (exists (
    select 1 from installments i join transactions t on t.id = i.transaction_id
    where i.id = installment_id
    and (t.user_id = auth.uid() or (t.couple_id is not null and is_couple_member(t.couple_id)))
  ));
create policy "debt_payments_via_debt" on debt_payments for all
  using (exists (
    select 1 from debts d where d.id = debt_id
    and (d.user_id = auth.uid() or (d.couple_id is not null and is_couple_member(d.couple_id)))
  ));

-- notifications / subscriptions / settings: yalnızca kendi kaydı
create policy "notifications_self" on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subscriptions_self" on subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_settings_self" on user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- Yeni kullanıcı için otomatik profil + abonelik satırı
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1));
  insert into public.subscriptions (user_id, plan) values (new.id, 'free');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
