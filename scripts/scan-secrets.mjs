// Verificação simples de segredos nos arquivos versionados (git ls-files + não rastreados não ignorados).
// Não substitui uma ferramenta dedicada (ex.: gitleaks) na CI — ver docs/operations/launch-requirements.md.
// Uso: node scripts/scan-secrets.mjs   (sai com código 1 se encontrar algo)
// Nunca imprime o valor encontrado: só arquivo, linha e tipo.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RULES = [
  { type: "Chave Anthropic", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { type: "Chave estilo OpenAI", re: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}/ },
  { type: "Chave Stripe", re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { type: "Segredo de webhook", re: /\bwhsec_[A-Za-z0-9]{16,}/ },
  { type: "Token GitHub", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { type: "Chave AWS", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { type: "Chave privada", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { type: "URL de banco com senha", re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s/]+:[^@\s]{3,}@/ },
  { type: "Atribuição de segredo em .env", re: /^\s*(?:[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY))\s*=\s*\S{8,}/m },
];

// Arquivos de teste e este próprio script contêm exemplos SINTÉTICOS de padrões.
const SKIP = [/^tests\/.*secret.*\.test\.ts$/, /^scripts\/scan-secrets\.mjs$/, /^package-lock\.json$/];

export function scanText(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const r of RULES) if (r.re.test(line)) findings.push({ line: i + 1, type: r.type });
  });
  return findings;
}

function listFiles() {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  let total = 0;
  for (const file of listFiles()) {
    if (SKIP.some((s) => s.test(file))) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text.includes("\u0000")) continue; // binário
    for (const f of scanText(text)) {
      total++;
      console.log(`POSSÍVEL SEGREDO: ${file}:${f.line} (${f.type}) — valor omitido`);
    }
  }
  if (total) {
    console.log(`\n${total} ocorrência(s). Remova, revogue/rotacione o segredo e lembre que ele continua no histórico do Git.`);
    process.exit(1);
  }
  console.log("Verificação de segredos: nenhuma ocorrência encontrada.");
}
