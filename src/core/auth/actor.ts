import { AppError } from "../errors";

export type Role = "owner" | "admin" | "member";

/** Identidade resolvida no servidor a cada requisição. Nunca vem do navegador. */
export interface Actor {
  userId: string;
  userName: string;
  orgId: string;
  orgName: string;
  role: Role;
  orgIsCreator: boolean;
  orgIsBuyer: boolean;
  isPlatformAdmin: boolean;
}

const RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };

export function hasRole(actor: Actor, min: Role): boolean {
  return RANK[actor.role] >= RANK[min];
}

export function assertRole(actor: Actor, min: Role): void {
  if (!hasRole(actor, min)) throw new AppError("forbidden");
}

export function assertCreatorOrg(actor: Actor): void {
  if (!actor.orgIsCreator) throw new AppError("forbidden", "Sua organização não está habilitada como criadora.");
}

export function assertBuyerOrg(actor: Actor): void {
  if (!actor.orgIsBuyer) throw new AppError("forbidden", "Sua organização não está habilitada como compradora.");
}

export function tenantScope(actor: Actor) {
  return { orgId: actor.orgId, userId: actor.userId };
}
