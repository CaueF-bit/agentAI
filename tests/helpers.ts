import { createDb, type Db } from "@/db/client";
import { DEMO, seedDemo } from "@/db/seed";
import { createDemoSession, requireActor } from "@/core/auth/session";
import type { Actor } from "@/core/auth/actor";
import { MockProvider } from "@/core/ai/mock-provider";
import { SimulatedChannel, type FailureMode } from "@/core/runtime/channels";
import type { RunDeps } from "@/core/runtime/runs";
import { AppError, type ErrorCode } from "@/core/errors";
import { expect } from "vitest";

// Cada arquivo de teste cria o PRÓPRIO banco em memória com dados fictícios.
// Nenhum teste conecta a banco de produção.

export async function freshDb(): Promise<Db> {
  const db = await createDb();
  await seedDemo(db);
  return db;
}

/** Login real pela sessão (o ator vem do banco, como na aplicação). */
export async function loginAs(db: Db, userId: string): Promise<{ token: string; actor: Actor }> {
  const token = await createDemoSession(db, userId);
  return { token, actor: await requireActor(db, token) };
}

export const U = DEMO.users;
export const O = DEMO.orgs;

export function deps(plan: FailureMode[] = [], extra: Partial<RunDeps> = {}): RunDeps & { channel: SimulatedChannel } {
  return {
    provider: new MockProvider(),
    channel: new SimulatedChannel(plan),
    pricingModel: "claude-opus-5-5",
    sleep: async () => {},
    ...extra,
  } as RunDeps & { channel: SimulatedChannel };
}

export async function expectAppError(p: Promise<unknown>, code: ErrorCode): Promise<AppError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe(code);
    return e as AppError;
  }
  throw new Error(`esperava AppError(${code}), mas a operação teve sucesso`);
}

export async function installationOf(db: Db, orgId: string): Promise<string> {
  return db.asSystem(async (tx) => (await tx.query<{ id: string }>(`select id from installations where org_id = $1 order by created_at limit 1`, [orgId])).rows[0].id);
}

let keySeq = 0;
export const key = (label = "k") => `test:${label}:${++keySeq}:${Date.now()}`;
