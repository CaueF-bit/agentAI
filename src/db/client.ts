import { PGlite } from "@electric-sql/pglite";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
 * Observação: o PGlite executa uma transação por vez (conexão única). Nunca abra uma
 * transação dentro de outra; o runtime faz operações curtas e independentes.
 */
export class Db {
  constructor(private readonly pg: PGlite) {}

  async asTenant<T>(scope: TenantScope, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!scope.orgId) throw new Error("asTenant requires orgId");
    return this.pg.transaction(async (tx) => {
      await tx.query("set local role app_user");
      await tx.query("select set_config('app.org_id', $1, true), set_config('app.user_id', $2, true)", [
        scope.orgId,
        scope.userId ?? "",
      ]);
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

export async function createDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  const exists = await pg.query<{ t: string | null }>("select to_regclass('public.organizations')::text as t");
  if (!exists.rows[0]?.t) {
    const schema = readFileSync(join(process.cwd(), "src", "db", "schema.sql"), "utf8");
    await pg.exec(schema);
  }
  return new Db(pg);
}
