import { getConfig } from "@/core/config";
import { logger } from "@/core/security/redact";
import { getDb } from "@/lib/server/context";
import { DbInitError } from "@/db/client";

// Verificação rápida pós-publicação: banco responde e modo de operação.
// A resposta não expõe detalhes; o motivo de falha vai só para o log (redigido).
export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  try {
    const db = await getDb();
    await db.asSystem((tx) => tx.query("select 1"));
    const cfg = getConfig();
    return Response.json({ ok: true, demoMode: cfg.demoMode, aiProvider: cfg.aiProvider, database: hasDatabaseUrl ? "postgres" : "local" });
  } catch (e) {
    logger.error("health check failed", e);
    // Só um indicativo booleano, sem valores: ajuda a diagnosticar variável ausente.
    const stage = e instanceof DbInitError ? e.stage : "query";
    const sqlState = e instanceof DbInitError ? e.sqlState : null;
    return Response.json({ ok: false, databaseUrlConfigured: hasDatabaseUrl, stage, sqlState }, { status: 503 });
  }
}
