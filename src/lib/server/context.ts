import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createDb, createPgDb, initStage, type Db } from "@/db/client";
import { seedDemoIfEmpty } from "@/db/seed";
import { getConfig } from "@/core/config";
import type { Actor } from "@/core/auth/actor";
import { requireActor, requirePlatformAdmin, resolveSession } from "@/core/auth/session";
import { AppError } from "@/core/errors";
import { getModelProvider } from "@/core/ai";
import { SimulatedChannel } from "@/core/runtime/channels";
import type { RunDeps } from "@/core/runtime/runs";

export const SESSION_COOKIE = "agentai_session";

const g = globalThis as unknown as { __agentaiDb?: Promise<Db>; __agentaiChannel?: SimulatedChannel };

/** Banco único por processo. Em modo demo, popula dados fictícios na primeira inicialização. */
export function getDb(): Promise<Db> {
  if (!g.__agentaiDb) {
    g.__agentaiDb = (async () => {
      // Postgres gerenciado quando configurado (ex.: Neon pelo Marketplace da Vercel); senão, PGlite local.
      const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      if (!url && process.env.VERCEL) throw new Error("DATABASE_URL ausente: na Vercel o banco local não persiste.");
      const cfg = await initStage("config", () => getConfig());
      const db = url ? await createPgDb(url) : await createDb(process.env.PGLITE_DATA_DIR || ".data/pglite");
      if (cfg.demoMode) await initStage("seed", () => seedDemoIfEmpty(db));
      return db;
    })();
    // Falha na inicialização não fica em cache: a próxima requisição tenta de novo.
    g.__agentaiDb.catch(() => {
      g.__agentaiDb = undefined;
    });
  }
  return g.__agentaiDb;
}

/** Canal simulado único por processo (nenhuma mensagem real sai da plataforma no MVP). */
export function getChannel(): SimulatedChannel {
  g.__agentaiChannel ??= new SimulatedChannel();
  return g.__agentaiChannel;
}

export function runDeps(): RunDeps {
  return { provider: getModelProvider(), channel: getChannel(), pricingModel: getConfig().anthropicModel };
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function currentSession() {
  return resolveSession(await getDb(), await sessionToken());
}

export async function getActorOrNull(): Promise<Actor | null> {
  try {
    return await requireActor(await getDb(), await sessionToken());
  } catch {
    return null;
  }
}

/** Para páginas: exige ator; sem sessão, manda para o login. */
export async function requirePageActor(): Promise<Actor> {
  try {
    return await requireActor(await getDb(), await sessionToken());
  } catch (e) {
    if (e instanceof AppError && e.code === "forbidden") redirect("/login?motivo=sem-acesso");
    redirect("/login");
  }
}

export async function requirePageOperator(): Promise<{ userId: string }> {
  try {
    return await requirePlatformAdmin(await getDb(), await sessionToken());
  } catch {
    redirect("/login?motivo=operador");
  }
}
