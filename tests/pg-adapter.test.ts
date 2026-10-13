import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createPgDb, type Db } from "@/db/client";
import { DEMO, seedDemo } from "@/db/seed";
import { createDemoSession, requireActor } from "@/core/auth/session";
import { getInstallation, updateLimits } from "@/core/installations/installations";
import { decideApproval, listPendingApprovals } from "@/core/approvals/approvals";
import { createRun, executeRun } from "@/core/runtime/runs";
import { SimulatedChannel } from "@/core/runtime/channels";
import { periodOf } from "@/core/budget/budget";
import { deps, expectAppError, key } from "./helpers";

// Integração do adaptador `pg` (o mesmo usado com o Postgres gerenciado na Vercel), falando o
// protocolo de rede real do Postgres contra um servidor local de teste (PGlite exposto por socket).
// Limitação: servidor de conexão única; concorrência real continua pendente (docs/assumptions-and-risks.md R-07).

let server: PGLiteSocketServer;
let pglite: PGlite;
let db: Db;

beforeAll(async () => {
  pglite = new PGlite();
  await pglite.waitReady;
  const port = 55000 + Math.floor(Math.random() * 5000);
  server = new PGLiteSocketServer({ db: pglite, port, host: "127.0.0.1" });
  await server.start();
  db = await createPgDb(`postgresql://postgres@127.0.0.1:${port}/postgres`, { max: 1 });
  await seedDemo(db);
});

afterAll(async () => {
  await db?.close();
  await server?.stop();
  await pglite?.close();
});

const login = async (userId: string) => requireActor(db, await createDemoSession(db, userId));
const insOf = (orgId: string) =>
  db.asSystem(async (tx) => (await tx.query<{ id: string }>(`select id from installations where org_id = $1 limit 1`, [orgId])).rows[0].id);

describe("adaptador Postgres (protocolo real)", () => {
  it("PG-01 cria o esquema, aplica RLS com o papel app_user e isola organizações", async () => {
    const carla = await login(DEMO.users.carla.id);
    const insA = await insOf(DEMO.orgs.horizonte.id);
    await expectAppError(getInstallation(db, carla, insA), "not_found");
    const seen = await db.asTenant({ orgId: DEMO.orgs.sul.id }, async (tx) => (await tx.query<{ org_id: string }>(`select distinct org_id from client_companies`)).rows);
    expect(seen.map((r) => r.org_id)).toEqual([DEMO.orgs.sul.id]);
    await expect(db.asTenant({ orgId: DEMO.orgs.sul.id }, (tx) => tx.query(`select * from sessions`))).rejects.toThrow(/permission denied/);
    // Uma falha dentro da transação desfaz tudo (rollback) e a conexão volta utilizável.
    await expect(
      db.asTenant({ orgId: DEMO.orgs.sul.id }, async (tx) => {
        await tx.query(`update installations set status = 'paused' where org_id = $1`, [DEMO.orgs.sul.id]);
        throw new Error("falha proposital");
      }),
    ).rejects.toThrow("falha proposital");
    const st = await db.asSystem(async (tx) => (await tx.query<{ status: string }>(`select status from installations where org_id = $1`, [DEMO.orgs.sul.id])).rows[0].status);
    expect(st).toBe("active");
  });

  it("PG-02 execução, aprovação e cobrança de orçamento funcionam pelo adaptador pg", async () => {
    const ana = await login(DEMO.users.ana.id);
    const ins = await insOf(DEMO.orgs.horizonte.id);
    await updateLimits(db, ana, ins, { monthlyBudgetCents: 7500, maxConcurrentRuns: 1, approvalPolicy: "always" });
    const run = await executeRun(db, ana, await createRun(db, ana, ins, { idempotencyKey: key("pg") }), deps());
    expect(run.status).toBe("succeeded");
    const pending = await listPendingApprovals(db, ana, ins);
    expect(pending).toHaveLength(2);
    const ch = new SimulatedChannel(["transient", "ok"]);
    expect(await decideApproval(db, ana, pending[0].id, "approve", pending[0].params_hash, { channel: ch, sleep: async () => {} })).toBe("executed");
    expect(ch.deliveries).toHaveLength(1);
    const b = await db.asSystem(async (tx) => (await tx.query<{ spent_cents: number; reserved_cents: number }>(`select spent_cents, reserved_cents from budget_periods where installation_id = $1 and period = $2`, [ins, periodOf()])).rows[0]);
    expect(b.reserved_cents).toBe(0);
    expect(b.spent_cents).toBe(run.cost_cents + 1);
  });
});
