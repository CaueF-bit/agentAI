import type { Tx } from "@/db/client";

// Orçamento por instalação e mês. A reserva é UM UPDATE condicional: no Postgres, o
// WHERE é reavaliado após o bloqueio da linha, então execuções simultâneas não conseguem
// reservar juntas além do limite. A restrição CHECK da tabela é a segunda barreira.

export function periodOf(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function ensurePeriod(tx: Tx, orgId: string, installationId: string, period: string, limitCents: number) {
  await tx.query(
    `insert into budget_periods (installation_id, period, org_id, limit_cents) values ($1, $2, $3, $4)
     on conflict (installation_id, period) do nothing`,
    [installationId, period, orgId, limitCents],
  );
}

export async function reserve(tx: Tx, installationId: string, period: string, cents: number): Promise<boolean> {
  if (cents <= 0) return true;
  const r = await tx.query(
    `update budget_periods set reserved_cents = reserved_cents + $3
      where installation_id = $1 and period = $2 and spent_cents + reserved_cents + $3 <= limit_cents
      returning 1`,
    [installationId, period, cents],
  );
  return r.rows.length === 1;
}

/** Converte reserva em gasto real (nunca acima do reservado; excedente é registrado à parte). */
export async function settle(tx: Tx, installationId: string, period: string, reservedCents: number, actualCents: number) {
  const charged = Math.min(Math.max(0, actualCents), reservedCents);
  if (reservedCents <= 0 && charged <= 0) return { charged: 0, overrun: Math.max(0, actualCents) };
  await tx.query(
    `update budget_periods set reserved_cents = reserved_cents - $3, spent_cents = spent_cents + $4
      where installation_id = $1 and period = $2`,
    [installationId, period, reservedCents, charged],
  );
  return { charged, overrun: Math.max(0, actualCents - reservedCents) };
}
