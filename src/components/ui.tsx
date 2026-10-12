import type { ReactNode } from "react";

export function brl(cents: number | null | undefined): string {
  const v = (cents ?? 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dt(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Mensagens de retorno das ações (?ok= / ?erro=). Texto vem do servidor já seguro. */
export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (!ok && !erro) return null;
  return (
    <div
      role="status"
      className={`rise mb-6 rounded border px-4 py-3 text-sm ${erro ? "border-stamp bg-stamp-wash text-stamp" : "border-ledger bg-ledger-wash text-ledger-deep"}`}
    >
      {erro ?? ok}
    </div>
  );
}

const TONES = {
  green: "text-ledger",
  red: "text-stamp",
  amber: "text-amber",
  gray: "text-muted",
  ink: "text-ink",
} as const;

export function Stamp({ children, tone = "ink" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`stamp ${TONES[tone]}`}>{children}</span>;
}

const STATUS_LABEL: Record<string, [string, keyof typeof TONES]> = {
  active: ["ativa", "green"],
  paused: ["pausada", "amber"],
  pending: ["pendente", "amber"],
  past_due: ["inadimplente", "red"],
  canceled: ["cancelada", "red"],
  queued: ["na fila", "gray"],
  running: ["executando", "amber"],
  succeeded: ["concluída", "green"],
  failed: ["falhou", "red"],
  cancelled: ["interrompida", "amber"],
  budget_blocked: ["sem orçamento", "red"],
  sent: ["enviada", "green"],
  approved: ["aprovada", "green"],
  rejected: ["rejeitada", "gray"],
  executed: ["executada", "green"],
  listed: ["listado", "green"],
  unlisted: ["retirado", "gray"],
};

export function StatusStamp({ status }: { status: string }) {
  const [label, tone] = STATUS_LABEL[status] ?? [status, "ink"];
  return <Stamp tone={tone}>{label}</Stamp>;
}

export function PageTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="rise mb-8 border-b border-ink pb-5">
      {kicker && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-ledger">{kicker}</p>}
      <h1 className="text-4xl font-semibold leading-tight md:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-3xl text-ink-soft">{children}</div>}
    </div>
  );
}

export function Meter({ used, reserved, limit }: { used: number; reserved: number; limit: number }) {
  const pct = (n: number) => `${Math.min(100, (n / Math.max(1, limit)) * 100)}%`;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-sm border border-ink/70 bg-paper-deep">
        <div className="bg-ledger" style={{ width: pct(used) }} />
        <div className="bg-amber/70" style={{ width: pct(reserved) }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span className="num">gasto {brl(used)}{reserved ? ` · reservado ${brl(reserved)}` : ""}</span>
        <span className="num">limite {brl(limit)}</span>
      </div>
    </div>
  );
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function flashFrom(sp: SearchParams) {
  const p = await sp;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return { ok: one(p.ok), erro: one(p.erro) };
}
