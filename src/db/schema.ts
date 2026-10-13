// Esquema do banco (SQL). Embutido no código para ir junto em qualquer deploy, sem ler arquivo do disco.
// Executado uma vez em banco vazio por src/db/client.ts.
export const SCHEMA_SQL = String.raw`
-- Esquema do MVP. Executado por src/db/migrate.ts (idempotente: só cria se não existir).
-- Isolamento: toda tabela de cliente tem org_id e RLS. A aplicação executa consultas de
-- cliente com o papel app_user (sem BYPASSRLS) e app.org_id definido por transação.
-- Detalhes: docs/technical/data-model.md e docs/technical/security-and-permissions.md.

create table organizations (
  id text primary key,
  name text not null,
  is_creator boolean not null default false,
  is_buyer boolean not null default false,
  is_fictitious boolean not null default true,
  created_at timestamptz not null default now()
);

create table users (
  id text primary key,
  email text not null unique,
  name text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table memberships (
  org_id text not null references organizations(id),
  user_id text not null references users(id),
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (org_id, user_id)
);

-- Sessões: só o hash SHA-256 do token opaco é guardado.
create table sessions (
  token_hash text primary key,
  user_id text not null references users(id),
  active_org_id text references organizations(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table agent_definitions (
  id text primary key,
  org_id text not null references organizations(id),
  name text not null,
  draft_spec jsonb not null,
  draft_updated_at timestamptz not null default now(),
  created_by text not null references users(id),
  created_at timestamptz not null default now()
);

create table agent_versions (
  id text primary key,
  org_id text not null references organizations(id),
  definition_id text not null references agent_definitions(id),
  version integer not null check (version > 0),
  spec jsonb not null,
  spec_hash text not null,
  published_by text not null references users(id),
  published_at timestamptz not null default now(),
  unique (definition_id, version)
);

-- Versões publicadas são imutáveis.
create function forbid_version_update() returns trigger language plpgsql as $$
begin
  raise exception 'agent_versions is immutable';
end $$;
create trigger agent_versions_immutable before update or delete on agent_versions
  for each row execute function forbid_version_update();

create table catalog_listings (
  id text primary key,
  org_id text not null references organizations(id),
  definition_id text not null unique references agent_definitions(id),
  slug text not null unique,
  title text not null,
  summary text not null,
  latest_version_id text not null references agent_versions(id),
  is_fictitious boolean not null default true,
  status text not null default 'listed' check (status in ('listed', 'unlisted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Planos: definidos pelo operador/seed. O cliente só lê. Preço em centavos de BRL.
create table plans (
  id text primary key,
  listing_id text not null references catalog_listings(id),
  code text not null,
  name text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  included_client_companies integer not null check (included_client_companies > 0),
  max_monthly_budget_cents integer not null check (max_monthly_budget_cents > 0),
  max_concurrent_runs integer not null check (max_concurrent_runs between 1 and 10),
  unique (listing_id, code)
);

create table installations (
  id text primary key,
  org_id text not null references organizations(id),
  listing_id text not null references catalog_listings(id),
  version_id text not null references agent_versions(id),
  plan_id text not null references plans(id),
  status text not null check (status in ('active', 'paused')),
  monthly_budget_cents integer not null check (monthly_budget_cents > 0),
  max_concurrent_runs integer not null check (max_concurrent_runs between 1 and 10),
  approval_policy text not null default 'always' check (approval_policy in ('always', 'first_contact', 'never')),
  created_by text not null references users(id),
  created_at timestamptz not null default now(),
  paused_at timestamptz,
  paused_by text references users(id)
);

create table subscriptions (
  id text primary key,
  org_id text not null references organizations(id),
  installation_id text not null unique references installations(id),
  plan_id text not null references plans(id),
  price_cents integer not null check (price_cents >= 0),
  status text not null check (status in ('pending', 'active', 'past_due', 'canceled')),
  mode text not null check (mode = 'test'),
  provider_ref text not null unique,
  last_event_at timestamptz,
  created_at timestamptz not null default now()
);

-- Credenciais por instalação, cifradas com chave fora do banco (AES-256-GCM).
create table connections (
  id text primary key,
  org_id text not null references organizations(id),
  installation_id text not null references installations(id),
  kind text not null check (kind in ('email', 'whatsapp')),
  label text not null,
  secret_ciphertext text not null,
  secret_iv text not null,
  secret_tag text not null,
  secret_last4 text not null,
  key_id text not null,
  created_at timestamptz not null default now(),
  unique (installation_id, kind)
);

create table client_companies (
  id text primary key,
  org_id text not null references organizations(id),
  name text not null,
  tax_regime text not null check (tax_regime in ('mei', 'simples', 'presumido', 'real')),
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table documents (
  id text primary key,
  org_id text not null references organizations(id),
  client_company_id text not null references client_companies(id),
  competence text not null check (competence ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  filename text not null,
  content_text text not null,
  classified_type text,
  classified_by_run text,
  received_at timestamptz not null default now()
);

create table runs (
  id text primary key,
  org_id text not null references organizations(id),
  installation_id text not null references installations(id),
  version_id text not null references agent_versions(id),
  competence text not null,
  trigger text not null check (trigger in ('manual', 'schedule')),
  idempotency_key text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'budget_blocked')),
  steps_used integer not null default 0,
  tool_calls_used integer not null default 0,
  cost_cents integer not null default 0,
  summary jsonb,
  error_code text,
  error_message text,
  created_by text references users(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (installation_id, idempotency_key)
);

create table run_steps (
  id text primary key,
  org_id text not null references organizations(id),
  run_id text not null references runs(id),
  seq integer not null,
  tool text not null,
  status text not null check (status in ('ok', 'denied', 'error')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, seq)
);

create table approvals (
  id text primary key,
  org_id text not null references organizations(id),
  installation_id text not null references installations(id),
  run_id text not null references runs(id),
  action text not null check (action in ('messages.send')),
  idempotency_key text not null,
  params jsonb not null,
  params_hash text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'executed', 'failed')),
  requested_at timestamptz not null default now(),
  decided_by text references users(id),
  decided_at timestamptz,
  unique (installation_id, idempotency_key)
);

-- Saída de mensagens (envio simulado no MVP). A chave de idempotência impede duplicidade.
create table outbound_messages (
  id text primary key,
  org_id text not null references organizations(id),
  installation_id text not null references installations(id),
  client_company_id text not null references client_companies(id),
  competence text not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  idempotency_key text not null,
  body text not null,
  status text not null check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (installation_id, idempotency_key)
);

-- Orçamento por instalação e mês. A restrição garante que gasto + reservado nunca passe do limite,
-- mesmo com execuções simultâneas (a reserva é um UPDATE condicional atômico).
create table budget_periods (
  installation_id text not null references installations(id),
  period text not null,
  org_id text not null references organizations(id),
  limit_cents integer not null check (limit_cents >= 0),
  spent_cents integer not null default 0 check (spent_cents >= 0),
  reserved_cents integer not null default 0 check (reserved_cents >= 0),
  primary key (installation_id, period),
  check (spent_cents + reserved_cents <= limit_cents)
);

create table usage_events (
  id text primary key,
  org_id text not null references organizations(id),
  installation_id text not null references installations(id),
  run_id text references runs(id),
  kind text not null check (kind in ('model', 'channel')),
  detail text not null,
  cost_cents integer not null check (cost_cents >= 0),
  created_at timestamptz not null default now()
);

-- Eventos do provedor de pagamento (simulado). Só o papel do sistema acessa.
create table billing_events (
  provider_event_id text primary key,
  type text not null,
  subscription_ref text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  result text not null,
  processed_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  org_id text references organizations(id),
  actor_user_id text references users(id),
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Papel da aplicação e políticas (RLS)
-- ---------------------------------------------------------------------------
-- O dono do esquema (papel de sistema) ignora o RLS por ser dono das tabelas; app_user nunca.
-- Idempotente: no Postgres gerenciado o papel é do cluster e pode já existir.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;
-- O papel de conexão precisa poder assumir app_user (SET ROLE) a cada transação de cliente.
grant app_user to current_user;
grant usage on schema public to app_user;

-- Tabelas de cliente: leitura e escrita só na própria organização.
do $$
declare t text;
begin
  foreach t in array array[
    'agent_definitions', 'installations', 'subscriptions', 'connections', 'client_companies',
    'documents', 'runs', 'run_steps', 'approvals', 'outbound_messages', 'budget_periods', 'usage_events'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy tenant_isolation on %I using (org_id = current_setting(''app.org_id'', true)) with check (org_id = current_setting(''app.org_id'', true))',
      t);
    execute format('grant select, insert, update on %I to app_user', t);
  end loop;
end $$;

-- Assinaturas: a aplicação cria (pendente) e lê; status e preço só mudam pelo código de
-- sistema que processa eventos assinados do provedor.
revoke update on subscriptions from app_user;

-- Limites nunca acima do teto do plano, mesmo que algum código esqueça de validar.
create function enforce_plan_caps() returns trigger language plpgsql as $$
declare cap record;
begin
  select max_monthly_budget_cents, max_concurrent_runs into cap from plans where id = new.plan_id;
  if new.monthly_budget_cents > cap.max_monthly_budget_cents or new.max_concurrent_runs > cap.max_concurrent_runs then
    raise exception 'installation limits exceed plan caps';
  end if;
  return new;
end $$;
create trigger installations_plan_caps before insert or update on installations
  for each row execute function enforce_plan_caps();

create function enforce_budget_limit() returns trigger language plpgsql as $$
begin
  if new.limit_cents > (select monthly_budget_cents from installations where id = new.installation_id) then
    raise exception 'budget limit exceeds installation budget';
  end if;
  return new;
end $$;
create trigger budget_periods_limit before insert or update of limit_cents on budget_periods
  for each row execute function enforce_budget_limit();

-- Versões: a própria organização vê e cria; qualquer organização lê versões ligadas a anúncio listado.
alter table agent_versions enable row level security;
create policy versions_own on agent_versions
  using (org_id = current_setting('app.org_id', true))
  with check (org_id = current_setting('app.org_id', true));
create policy versions_listed_read on agent_versions for select
  using (exists (select 1 from catalog_listings l where l.definition_id = agent_versions.definition_id and l.status = 'listed'));
-- Quem contratou continua lendo a versão instalada mesmo se o anúncio for retirado.
create policy versions_installed_read on agent_versions for select
  using (exists (select 1 from installations i where i.version_id = agent_versions.id));
grant select, insert on agent_versions to app_user;

-- Anúncios: todos leem os listados; só a organização dona cria/atualiza.
alter table catalog_listings enable row level security;
create policy listings_read on catalog_listings for select
  using (status = 'listed' or org_id = current_setting('app.org_id', true)
         or exists (select 1 from installations i where i.listing_id = catalog_listings.id));
create policy listings_write on catalog_listings for insert
  with check (org_id = current_setting('app.org_id', true));
create policy listings_update on catalog_listings for update
  using (org_id = current_setting('app.org_id', true))
  with check (org_id = current_setting('app.org_id', true));
grant select, insert, update on catalog_listings to app_user;

-- Planos: só leitura para a aplicação (preços nunca vêm do cliente).
grant select on plans to app_user;

-- Auditoria: a organização só insere e lê os próprios registros.
alter table audit_log enable row level security;
create policy audit_own on audit_log
  using (org_id = current_setting('app.org_id', true))
  with check (org_id = current_setting('app.org_id', true));
grant select, insert on audit_log to app_user;
grant usage on sequence audit_log_id_seq to app_user;

-- Interruptor global do operador: app_user só consegue LER, via função.
create function platform_kill_switch() returns boolean language sql stable security definer as $$
  select coalesce((select (value->>'enabled')::boolean from platform_settings where key = 'kill_switch'), false)
$$;
revoke all on function platform_kill_switch() from public;
grant execute on function platform_kill_switch() to app_user;

-- organizations, users, memberships, sessions, billing_events e platform_settings:
-- sem permissão para app_user (acessadas só pelo código de sistema, em src/core/system).
`;
