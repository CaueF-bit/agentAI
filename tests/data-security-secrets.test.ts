import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Db } from "@/db/client";
import type { Actor } from "@/core/auth/actor";
import { addClient, addDocument, listClients } from "@/core/clients/clients";
import { AppError } from "@/core/errors";
import { toPublicError } from "@/core/http";
import { getInstallation, setConnection, updateLimits } from "@/core/installations/installations";
import { MockProvider } from "@/core/ai/mock-provider";
import type { DraftInput } from "@/core/ai/provider";
import { createRun, executeRun } from "@/core/runtime/runs";
import { open, seal } from "@/core/security/crypto";
import { redactString, redactValue } from "@/core/security/redact";
import { getConfig } from "@/core/config";
// @ts-expect-error script .mjs sem tipos
import { scanText } from "../scripts/scan-secrets.mjs";
import { deps, expectAppError, freshDb, installationOf, key, loginAs, O, U } from "./helpers";

// Categoria: dados, integrações, entradas maliciosas e proteção de informações.
// Os "segredos" abaixo são SINTÉTICOS, montados em tempo de execução para não parecerem reais no código.

const fakeAnthropic = ["sk", "ant", "api03", "A".repeat(30)].join("-");
const fakeStripe = ["sk", "live", "B".repeat(24)].join("_");

let db: Db;
let ana: Actor;
let ins: string;
beforeAll(async () => {
  db = await freshDb();
  ({ actor: ana } = await loginAs(db, U.ana.id));
  ins = await installationOf(db, O.horizonte.id);
});

describe("credenciais de integrações", () => {
  it("SEC-01 credencial fica cifrada no banco e só os 4 últimos caracteres voltam à interface", async () => {
    const secret = `smtp-token-sintetico-${"9".repeat(12)}WXYZ`;
    await setConnection(db, ana, ins, { kind: "whatsapp", label: "WhatsApp simulado", secret });
    const raw = await db.asSystem(async (tx) => (await tx.query(`select * from connections where installation_id = $1 and kind = 'whatsapp'`, [ins])).rows[0]);
    expect(JSON.stringify(raw)).not.toContain(secret);
    const view = await getInstallation(db, ana, ins);
    const conn = view.connections.find((c) => c.kind === "whatsapp")!;
    expect(conn.secret_last4).toBe("••••WXYZ");
    expect(JSON.stringify(view)).not.toContain(secret);
  });

  it("SEC-02 instalações não compartilham credenciais: texto cifrado copiado para outra instalação não abre", async () => {
    const insB = await installationOf(db, O.sul.id);
    const sealed = seal("credencial-da-instalacao-A", ins);
    expect(open(sealed, ins)).toBe("credencial-da-instalacao-A");
    expect(() => open(sealed, insB)).toThrow();
    expect(() => open(sealed, ins, Buffer.alloc(32, 1))).toThrow(); // chave errada
    expect(getConfig().credentialsKeyIsEphemeral).toBe(true); // em teste/demo a chave não é fixa no código
  });

  it("SEC-03 auditoria registra a troca de credencial sem o segredo", async () => {
    const secret = `outro-token-sintetico-${"7".repeat(10)}`;
    await setConnection(db, ana, ins, { kind: "email", label: "E-mail trocado", secret });
    const rows = await db.asSystem(async (tx) => (await tx.query(`select metadata from audit_log where action = 'connection.set'`)).rows);
    expect(rows.length).toBeGreaterThan(0);
    expect(JSON.stringify(rows)).not.toContain(secret);
  });
});

describe("logs e erros sem segredos", () => {
  it("SEC-04 redação mascara chaves, tokens Bearer, URLs de banco e campos sensíveis", () => {
    const text = `falha com ${fakeAnthropic} e Bearer abc.def.ghijklmnop e postgres://app:senhaSuper@db.example/prod token=xyz12345`;
    const out = redactString(text);
    expect(out).not.toContain(fakeAnthropic);
    expect(out).not.toContain("senhaSuper");
    expect(out).not.toContain("abc.def.ghijklmnop");
    expect(out).not.toContain("xyz12345");
    const obj = redactValue({ user: "ana", apiKey: "qualquer", nested: { password: "p", note: fakeStripe } }) as Record<string, unknown>;
    expect(JSON.stringify(obj)).not.toMatch(/qualquer|"p"|BBBB/);
    expect(obj.user).toBe("ana");
  });

  it("SEC-05 respostas de erro não expõem detalhes internos nem segredos", () => {
    const internal = toPublicError(new Error(`conexão falhou: postgres://admin:${fakeStripe}@10.0.0.5/prod`));
    expect(internal.status).toBe(500);
    expect(JSON.stringify(internal)).not.toMatch(/postgres|10\.0\.0\.5|BBBB/);
    expect(internal.errorId).toMatch(/[0-9a-f-]{36}/);
    const known = toPublicError(new AppError("forbidden", undefined, { sql: "select * from sessions" }));
    expect(JSON.stringify(known)).not.toContain("sessions");
    expect(known.status).toBe(403);
  });

  it("SEC-06 verificador de segredos detecta padrões e não acusa o .env.example", () => {
    const planted = `const k = "${fakeAnthropic}";\nAPI_TOKEN=${"x".repeat(20)}\nconst ok = 1;`;
    expect(scanText(planted).map((f: { type: string }) => f.type)).toEqual(["Chave Anthropic", "Atribuição de segredo em .env"]);
    const example = readFileSync(".env.example", "utf8");
    expect(scanText(example)).toEqual([]);
  });
});

describe("entradas maliciosas", () => {
  it("SEC-07 textos com SQL e nomes de arquivo com caminho relativo são tratados como dado ou rejeitados", async () => {
    const evil = "Robert'); DROP TABLE documents; --";
    const id = await addClient(db, ana, { name: evil, taxRegime: "simples", contactEmail: "r@r.example" });
    expect((await listClients(db, ana)).find((c) => c.id === id)?.name).toBe(evil);
    await expectAppError(addDocument(db, ana, { clientCompanyId: id, competence: "2026-10", filename: "../../etc/passwd", content: "x" }), "validation");
    await expectAppError(addDocument(db, ana, { clientCompanyId: id, competence: "2026-13", filename: "ok.txt", content: "x" }), "validation");
    await expectAppError(addClient(db, ana, { name: "X", taxRegime: "isento_total", contactEmail: "a@a.example" }), "validation");
    const count = await db.asSystem(async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from documents`)).rows[0].n);
    expect(count).toBeGreaterThan(0); // tabela intacta
  });

  it("SEC-08 instruções e conteúdo recuperado ficam separados: texto dos documentos nunca chega à redação de mensagens", async () => {
    await updateLimits(db, ana, ins, { monthlyBudgetCents: 7500, maxConcurrentRuns: 1, approvalPolicy: "never" });
    const seen: DraftInput[] = [];
    const spy = new MockProvider();
    const original = spy.draftReminder.bind(spy);
    spy.draftReminder = async (i) => {
      seen.push(i);
      return original(i);
    };
    const id = await createRun(db, ana, ins, { idempotencyKey: key("sep") });
    await executeRun(db, ana, id, deps([], { provider: spy }));
    expect(seen.length).toBeGreaterThan(0);
    const all = JSON.stringify(seen);
    expect(all).not.toMatch(/IGNORE AS INSTRUÇÕES|outro@endereco/);
    for (const i of seen) expect(Object.keys(i).sort()).toEqual(["clientName", "competence", "deadlineDay", "firmName", "missingLabels", "tone"]);
  });
});
