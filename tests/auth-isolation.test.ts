import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createDemoSession, requireActor, requirePlatformAdmin, revokeSession, switchOrg } from "@/core/auth/session";
import { getInstallation, setConnection, setPaused, updateLimits } from "@/core/installations/installations";
import { createRun, executeRun, getRunDetail } from "@/core/runtime/runs";
import { decideApproval, listPendingApprovals } from "@/core/approvals/approvals";
import { addDocument, listClients } from "@/core/clients/clients";
import { getDefinition, listDefinitions } from "@/core/agents/definitions";
import { revokeMember } from "@/core/orgs/members";
import { resetConfigForTests } from "@/core/config";
import { deps, expectAppError, freshDb, installationOf, key, loginAs, O, U } from "./helpers";

// Categoria: autenticação, autorização e isolamento entre clientes.

let db: Db;
let insA: string; // instalação da Horizonte (cliente A)
let insB: string; // instalação da Sul (cliente B)

beforeAll(async () => {
  db = await freshDb();
  insA = await installationOf(db, O.horizonte.id);
  insB = await installationOf(db, O.sul.id);
});

describe("autenticação", () => {
  it("AUTH-01 usuário deslogado ou com token inválido não acessa recursos privados", async () => {
    await expectAppError(requireActor(db, null), "unauthenticated");
    await expectAppError(requireActor(db, "token-inventado-qualquer"), "unauthenticated");
  });

  it("AUTH-02 sessão encerrada (logout) deixa de valer", async () => {
    const token = await createDemoSession(db, U.ana.id);
    await requireActor(db, token);
    await revokeSession(db, token);
    await expectAppError(requireActor(db, token), "unauthenticated");
  });

  it("AUTH-03 login de demonstração é bloqueado fora do DEMO_MODE", async () => {
    process.env.DEMO_MODE = "false";
    process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    process.env.TESTPAY_WEBHOOK_SECRET = "segredo-de-teste-local";
    resetConfigForTests();
    try {
      await expectAppError(createDemoSession(db, U.ana.id), "demo_disabled");
    } finally {
      process.env.DEMO_MODE = "true";
      delete process.env.CREDENTIALS_ENCRYPTION_KEY;
      delete process.env.TESTPAY_WEBHOOK_SECRET;
      resetConfigForTests();
    }
  });
});

describe("isolamento entre organizações", () => {
  it("ISO-01 cliente B não lê a instalação do cliente A (resposta 'não encontrado', sem confirmar existência)", async () => {
    const { actor: carla } = await loginAs(db, U.carla.id);
    await expectAppError(getInstallation(db, carla, insA), "not_found");
    const own = await getInstallation(db, carla, insB);
    expect(own.installation.id).toBe(insB);
  });

  it("ISO-02 cliente B não altera, pausa nem grava credenciais na instalação do cliente A", async () => {
    const { actor: carla } = await loginAs(db, U.carla.id);
    await expectAppError(setPaused(db, carla, insA, true), "not_found");
    await expectAppError(updateLimits(db, carla, insA, { monthlyBudgetCents: 1000, maxConcurrentRuns: 1, approvalPolicy: "never" }), "not_found");
    await expectAppError(setConnection(db, carla, insA, { kind: "email", label: "intrusa", secret: "segredo-intruso-123" }), "not_found");
    const { actor: ana } = await loginAs(db, U.ana.id);
    const after = await getInstallation(db, ana, insA);
    expect(after.installation.status).toBe("active");
    expect(after.connections.map((c) => c.label)).not.toContain("intrusa");
  });

  it("ISO-03 trocar IDs na requisição não permite executar nem ler execuções de outra organização", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id);
    const { actor: carla } = await loginAs(db, U.carla.id);
    await expectAppError(createRun(db, carla, insA, { idempotencyKey: key("iso03") }), "not_found");
    const runA = await createRun(db, ana, insA, { idempotencyKey: key("iso03a") });
    await expectAppError(executeRun(db, carla, runA, deps()), "not_found");
    await expectAppError(getRunDetail(db, carla, runA), "not_found");
  });

  it("ISO-04 cliente B não decide aprovações do cliente A", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id);
    const { actor: carla } = await loginAs(db, U.carla.id);
    const runA = await createRun(db, ana, insA, { idempotencyKey: key("iso04") });
    await executeRun(db, ana, runA, deps());
    const pending = await listPendingApprovals(db, ana, insA);
    expect(pending.length).toBeGreaterThan(0);
    const d = deps();
    await expectAppError(decideApproval(db, carla, pending[0].id, "approve", pending[0].params_hash, d), "not_found");
    expect(d.channel.deliveries).toHaveLength(0);
    expect(await listPendingApprovals(db, carla)).toHaveLength(0);
  });

  it("ISO-05 cliente B não envia documento para empresa-cliente do cliente A trocando o ID", async () => {
    const { actor: ana } = await loginAs(db, U.ana.id);
    const { actor: carla } = await loginAs(db, U.carla.id);
    const clientA = (await listClients(db, ana))[0];
    await expectAppError(addDocument(db, carla, { clientCompanyId: clientA.id, competence: "2026-10", filename: "x.txt", content: "y" }), "not_found");
  });

  it("ISO-06 RLS no banco com o papel real da aplicação: só enxerga e grava a própria organização", async () => {
    const seen = await db.asTenant({ orgId: O.sul.id }, async (tx) => (await tx.query<{ org_id: string }>(`select distinct org_id from documents union select distinct org_id from client_companies`)).rows);
    expect(seen.every((r) => r.org_id === O.sul.id)).toBe(true);
    const clientA = await db.asSystem(async (tx) => (await tx.query<{ id: string }>(`select id from client_companies where org_id = $1 limit 1`, [O.horizonte.id])).rows[0].id);
    await expect(
      db.asTenant({ orgId: O.sul.id }, (tx) =>
        tx.query(`insert into documents (id, org_id, client_company_id, competence, filename, content_text) values ('doc_x', $1, $2, '2026-10', 'a.txt', 'b')`, [O.horizonte.id, clientA]),
      ),
    ).rejects.toThrow(/row-level security/);
    const updated = await db.asTenant({ orgId: O.sul.id }, (tx) => tx.query(`update installations set status = 'paused' where id = $1`, [insA]));
    expect(updated.affectedRows ?? 0).toBe(0);
  });

  it("ISO-07 papel da aplicação não tem acesso a sessões, usuários, filiações nem eventos de cobrança", async () => {
    for (const table of ["sessions", "users", "memberships", "billing_events", "platform_settings"]) {
      await expect(db.asTenant({ orgId: O.horizonte.id }, (tx) => tx.query(`select * from ${table} limit 1`))).rejects.toThrow(/permission denied/);
    }
  });

  it("ISO-08 rascunhos de um criador não são visíveis para outro criador", async () => {
    const { actor: diego } = await loginAs(db, U.diego.id);
    const { actor: carla } = await loginAs(db, U.carla.id);
    const [defLab] = await listDefinitions(db, diego);
    await expectAppError(getDefinition(db, carla, defLab.id), "not_found");
    expect((await listDefinitions(db, carla)).some((d) => d.id === defLab.id)).toBe(false);
  });
});

describe("autorização e privilégios", () => {
  it("PRIV-01 membro comum não aprova mensagens, não pausa e não muda limites", async () => {
    const { actor: bruno } = await loginAs(db, U.bruno.id);
    expect(bruno.role).toBe("member");
    await expectAppError(setPaused(db, bruno, insA, true), "forbidden");
    await expectAppError(updateLimits(db, bruno, insA, { monthlyBudgetCents: 15000, maxConcurrentRuns: 1, approvalPolicy: "never" }), "forbidden");
    await expectAppError(decideApproval(db, bruno, "apr_qualquer", "approve", "x", deps()), "forbidden");
    // Mas pode disparar execução (permissão de membro).
    await expect(createRun(db, bruno, insA, { idempotencyKey: key("priv01") })).resolves.toMatch(/^run_/);
  });

  it("PRIV-02 usuário não entra em organização sem filiação nem vira operador manipulando a requisição", async () => {
    const { token } = await loginAs(db, U.bruno.id);
    await expectAppError(switchOrg(db, token, O.sul.id), "forbidden");
    await expectAppError(requirePlatformAdmin(db, token), "forbidden");
    const after = await requireActor(db, token);
    expect(after.orgId).toBe(O.horizonte.id);
    expect(after.role).toBe("member");
  });

  it("PRIV-03 operador da plataforma não age como cliente (sem filiação a organizações)", async () => {
    const token = await createDemoSession(db, U.operadora.id);
    await expect(requirePlatformAdmin(db, token)).resolves.toBeTruthy();
    await expectAppError(requireActor(db, token), "forbidden");
  });

  it("PRIV-04 revogar acesso impede novas ações protegidas imediatamente", async () => {
    const { token, actor: ana } = await loginAs(db, U.ana.id);
    const { token: brunoToken } = await loginAs(db, U.bruno.id);
    await revokeMember(db, ana, U.bruno.id);
    await expectAppError(requireActor(db, brunoToken), "forbidden");
    await expect(requireActor(db, token)).resolves.toBeTruthy();
  });
});
