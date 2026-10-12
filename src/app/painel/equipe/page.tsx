import { listMembers } from "@/core/orgs/members";
import { getDb, requirePageActor } from "@/lib/server/context";
import { dt, Flash, flashFrom, PageTitle, Stamp, type SearchParams } from "@/components/ui";
import { revokeMemberAction } from "../../actions";

const ROLE: Record<string, string> = { owner: "sócio(a)", admin: "admin", member: "membro" };

export default async function TeamPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requirePageActor();
  const members = await listMembers(await getDb(), actor);
  const isAdmin = actor.role !== "member";
  return (
    <div>
      <Flash {...(await flashFrom(searchParams))} />
      <PageTitle kicker={actor.orgName} title="Equipe">
        Papéis são verificados no servidor a cada ação. Revogar o acesso vale imediatamente.
      </PageTitle>
      <table className="ledger">
        <thead><tr><th>Pessoa</th><th>Papel</th><th>Situação</th><th /></tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.user_id}>
              <td>{m.name}<br /><span className="text-xs text-muted">{m.email}</span></td>
              <td>{ROLE[m.role]}</td>
              <td>{m.revoked_at ? <Stamp tone="gray">revogado {dt(m.revoked_at)}</Stamp> : <Stamp tone="green">ativo</Stamp>}</td>
              <td className="text-right">
                {isAdmin && !m.revoked_at && m.user_id !== actor.userId && (
                  <form action={revokeMemberAction}>
                    <input type="hidden" name="userId" value={m.user_id} />
                    <button className="btn btn-danger !py-1 text-xs">Revogar acesso</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
