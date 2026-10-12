import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getConfig } from "../config";

// Cifra de credenciais de integrações com AES-256-GCM (primitiva padrão do Node, sem criptografia própria).
// A chave fica FORA do banco (variável de ambiente / gerenciador de segredos).
// Associated data = installationId: um texto cifrado copiado para outra instalação não decifra.

export interface Sealed {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
}

export function seal(plaintext: string, associatedData: string, key = getConfig().credentialsKey, keyId = getConfig().credentialsKeyId): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: ct.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), keyId };
}

export function open(sealed: Omit<Sealed, "keyId">, associatedData: string, key = getConfig().credentialsKey): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export function last4(secret: string): string {
  return secret.length <= 4 ? "****" : `••••${secret.slice(-4)}`;
}
