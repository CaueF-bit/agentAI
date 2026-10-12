import { getConfig } from "@/core/config";
import { getDb } from "@/lib/server/context";

// Verificação rápida pós-publicação: banco responde e modo de operação. Não expõe dados.
export async function GET() {
  try {
    const db = await getDb();
    await db.asSystem((tx) => tx.query("select 1"));
    const cfg = getConfig();
    return Response.json({ ok: true, demoMode: cfg.demoMode, aiProvider: cfg.aiProvider });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
