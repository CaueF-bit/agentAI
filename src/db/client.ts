import { PGlite } from "@electric-sql/pglite";
import { mkdirSync } from "node:fs";
import { Pool } from "pg";
import { SCHEMA_SQL } from "./schema";

export type Row = Record<string, unknown>;

export interface Tx {
  query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[]; affectedRows?: number }>;
}

export interface TenantScope {
  orgId: string;
  userId?: string | null;
}

/**
 * Acesso ao banco com dois modos explícitos:
 * - `asTenant`: transação com o papel `app_user` (sujeito a RLS) e `app.org_id` definido.
 *   Todo acesso a dados de cliente passa por aqui.
 * - `asSystem`: transação com o dono do esquema (sem RLS). Só para autenticação, catálogo
 *   público, webhooks e operador — usado apenas em módulos de sistema.
 *
 * Duas implementações: PGlite (embutido; demo local e testes) e Postgres via `pg`
 * (banco gerenciado, ex.: Neon). Nunca abra uma transação dentro de outra.
 */
export interface Db {
  asTenant<T>(scope: TenantScope, fn: (tx: Tx) => Promise<T>): Promise<T>;
  asSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const TENANT_SETUP = "select set_config('app.org_id', $1, true), set_config('app.user_id', $2, true)";

class PgliteDb implements Db {
  constructor(private readonly pg: PGlite) {}

  async asTenant<T>(scope: TenantScope, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!scope.orgId) throw new Error("asTenant requires orgId");
    return this.pg.transaction(async (tx) => {
      await tx.query("set local role app_user");
      await tx.query(TENANT_SETUP, [scope.orgId, scope.userId ?? ""]);
      return fn(tx as unknown as Tx);
    });
  }

  async asSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.pg.transaction(async (tx) => fn(tx as unknown as Tx));
  }

  async close(): Promise<void> {
    await this.pg.close();
  }
}

class PgDb implements Db {
  constructor(private readonly pool: Pool) {}

  private async inTransaction<T>(setup: (tx: Tx) => Promise<void>, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const tx: Tx = {
      async query(sql, params) {
        const r = await client.query(sql, params as unknown[] | undefined);
        return { rows: r.rows, affectedRows: r.rowCount ?? undefined };
      },
    };
    try {
      await client.query("begin");
      await setup(tx);
      const result = await fn(tx);
      await client.query("commit");
      return result;
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  asTenant<T>(scope: TenantScope, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!scope.orgId) throw new Error("asTenant requires orgId");
    return this.inTransaction(async (tx) => {
      await tx.query("set local role app_user");
      await tx.query(TENANT_SETUP, [scope.orgId, scope.userId ?? ""]);
    }, fn);
  }

  asSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.inTransaction(async () => {}, fn);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/** Banco embutido (PGlite). Sem dataDir = em memória (testes). */
export async function createDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  const exists = await pg.query<{ t: string | null }>("select to_regclass('public.organizations')::text as t");
  if (!exists.rows[0]?.t) await pg.exec(SCHEMA_SQL);
  return new PgliteDb(pg);
}

/**
 * Postgres gerenciado. A conexão deve usar TLS (sslmode=require na URL do provedor).
 * O esquema é criado uma única vez, sob trava consultiva (várias instâncias podem iniciar juntas).
 */
export async function createPgDb(connectionString: string, opts: { max?: number } = {}): Promise<Db> {
  const pool = new Pool({ connectionString, max: opts.max ?? 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock(727001)");
    const exists = await client.query<{ t: string | null }>("select to_regclass('public.organizations')::text as t");
    if (!exists.rows[0]?.t) await client.query(SCHEMA_SQL);
  } finally {
    await client.query("select pg_advisory_unlock(727001)").catch(() => {});
    client.release();
  }
  return new PgDb(pool);
}
