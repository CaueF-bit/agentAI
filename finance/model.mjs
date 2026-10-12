// Modelo financeiro reproduzível: TAM/SAM/SOM, custo por cliente, margem e sensibilidade.
// Uso: node finance/model.mjs [caminho/para/assumptions.json]
// Saída: finance/output/report.md e finance/output/sensitivity.csv
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCENARIOS = ["conservative", "base", "optimistic"];

export function marketSizing(a, scenario) {
  const s = a.market.scenarios[scenario];
  const total = a.market.totalAccountingOrgs.value;
  const multi = total * a.market.shareMultiPerson.value;
  const solo = total - multi;
  const tam = multi * s.annualSpendMultiBrl + solo * s.annualSpendSoloBrl;
  const samFirms = multi * s.shareDigitalReady;
  const sam = samFirms * s.annualSpendMultiBrl;
  return { totalFirms: total, multiFirms: multi, samFirms, tamBrl: tam, samBrl: sam };
}

// SOM por capacidade comercial: clientes = novos (demos x conversão, com rampa) - churn.
export function acquisition(a, scenario) {
  const s = a.acquisition.scenarios[scenario];
  let customers = 0;
  const byMonth = [];
  for (let m = 1; m <= a.acquisition.months; m++) {
    const ramp = Math.min(1, m / s.rampMonths);
    const newCustomers = s.demosPerMonth * ramp * s.closeRate;
    customers = customers * (1 - s.monthlyChurn) + newCustomers;
    byMonth.push(customers);
  }
  const at = (m) => byMonth[m - 1];
  const arr = (m) => at(m) * s.arpaMonthlyBrl * 12;
  return {
    customersM12: at(12), customersM24: at(24), customersM36: at(36),
    arrM12: arr(12), arrM24: arr(24), arrM36: arr(36),
    arpaMonthlyBrl: s.arpaMonthlyBrl,
  };
}

function tokenCostUsd(prices, model, tokens, count) {
  const p = prices[model];
  if (!p) throw new Error(`Preço ausente para o modelo ${model}`);
  return count * ((tokens.input * p.input + tokens.output * p.output) / 1e6);
}

// Custo variável mensal de servir UM escritório, em BRL.
export function costPerFirm(a, costScenario, usageMultiplier = 1, supportHoursOverride) {
  const c = a.costScenarios[costScenario];
  const u = a.usage;
  const fx = a.fx.brlPerUsd;
  const docs = u.clientCompaniesPerFirm * u.docsPerClientMonth * usageMultiplier;
  const reminders = u.clientCompaniesPerFirm * u.remindersPerClientMonth * usageMultiplier;
  const prices = a.modelPricesUsdPerMTok;

  const modelUsd =
    (tokenCostUsd(prices, c.classifyModel, u.classifyTokens, docs) +
      tokenCostUsd(prices, c.draftModel, u.draftTokens, reminders) +
      tokenCostUsd(prices, c.draftModel, u.builderAndSandboxTokensMonth, 1)) *
    (1 + c.retryOverhead);

  const whatsappMsgs = reminders * c.whatsappShare;
  const emailMsgs = reminders - whatsappMsgs;
  const channelsUsd =
    whatsappMsgs * a.unitCosts.whatsappTemplateUsd.value + emailMsgs * a.unitCosts.emailUsd.value;

  const supportHours = supportHoursOverride ?? c.supportHoursPerFirmMonth;
  const supportBrl = supportHours * a.unitCosts.supportCostBrlPerHour.value;

  return {
    modelBrl: modelUsd * fx,
    channelsBrl: channelsUsd * fx,
    infraBrl: c.variableInfraBrlPerFirm,
    supportBrl,
    totalBrl: modelUsd * fx + channelsUsd * fx + c.variableInfraBrlPerFirm + supportBrl,
  };
}

// Receita retida e margem de contribuição por escritório/mês.
// Faturamento bruto (o que o cliente paga) != receita retida (depois do repasse a criadores).
export function contribution(a, scenario, opts = {}) {
  const arpa = a.acquisition.scenarios[scenario].arpaMonthlyBrl;
  const billed = arpa;
  const partnerPortion = billed * a.revenueSplit.partnerAgentRevenueShare;
  const creatorPayout = partnerPortion * a.revenueSplit.creatorPayoutPct;
  const retained = billed - creatorPayout;
  const paymentFee = billed * a.unitCosts.cardFeePct.value + a.unitCosts.cardFeeFixedBrl.value;
  const taxes = retained * a.unitCosts.revenueTaxPct.value;
  const cost = costPerFirm(a, opts.costScenario ?? scenario, opts.usageMultiplier ?? 1, opts.supportHours);
  const margin = retained - paymentFee - taxes - cost.totalBrl;
  return { billed, creatorPayout, retained, paymentFee, taxes, cost, margin, marginPct: margin / retained };
}

export function breakEven(a, scenario) {
  const fixed = Object.entries(a.fixedCostsMonthlyBrl)
    .filter(([k]) => !k.startsWith("_"))
    .reduce((sum, [, v]) => sum + v.value, 0);
  const { margin } = contribution(a, scenario);
  const cac = a.cacBrl[scenario];
  return {
    fixedMonthlyBrl: fixed,
    breakEvenCustomers: margin > 0 ? Math.ceil(fixed / margin) : Infinity,
    cacBrl: cac,
    paybackMonths: margin > 0 ? cac / margin : Infinity,
  };
}

const brl = (v) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const usd = (v, fx) => "US$ " + Math.round(v / fx).toLocaleString("pt-BR");
const n1 = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function buildReport(a) {
  const fx = a.fx.brlPerUsd;
  const lines = [];
  lines.push("# Relatório do modelo financeiro (gerado)", "");
  lines.push(`Gerado por \`finance/model.mjs\` a partir de \`finance/assumptions.json\`. Câmbio ilustrativo: R$ ${fx} por US$ (${a.fx.source}).`);
  lines.push("**Todos os números dependem de hipóteses não validadas.** Não editar este arquivo à mão: altere as premissas e rode `npm run finance`.", "");

  lines.push("## TAM / SAM / SOM", "");
  lines.push("| Cenário | TAM (ano) | SAM (ano) | Escritórios no SAM | Clientes no mês 36 | SOM = ARR no mês 36 |");
  lines.push("|---|---|---|---|---|---|");
  for (const s of SCENARIOS) {
    const m = marketSizing(a, s);
    const q = acquisition(a, s);
    lines.push(`| ${s} | ${brl(m.tamBrl)} (${usd(m.tamBrl, fx)}) | ${brl(m.samBrl)} (${usd(m.samBrl, fx)}) | ${Math.round(m.samFirms).toLocaleString("pt-BR")} | ${n1(q.customersM36)} | ${brl(q.arrM36)} (${usd(q.arrM36, fx)}) |`);
  }
  lines.push("");
  lines.push("| Cenário | Clientes no mês 12 | ARR no mês 12 | Clientes no mês 24 | ARR no mês 24 |");
  lines.push("|---|---|---|---|---|");
  for (const s of SCENARIOS) {
    const q = acquisition(a, s);
    lines.push(`| ${s} | ${n1(q.customersM12)} | ${brl(q.arrM12)} | ${n1(q.customersM24)} | ${brl(q.arrM24)} |`);
  }

  lines.push("", "## Economia por escritório (mensal)", "");
  lines.push("| Cenário | Faturado | Repasse a criadores | Receita retida | Taxa de pagamento | Impostos | Modelos de IA | Canais | Infraestrutura | Suporte | Margem de contribuição | Margem % |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const s of SCENARIOS) {
    const c = contribution(a, s);
    lines.push(`| ${s} | ${brl(c.billed)} | ${brl(c.creatorPayout)} | ${brl(c.retained)} | ${brl(c.paymentFee)} | ${brl(c.taxes)} | ${brl(c.cost.modelBrl)} | ${brl(c.cost.channelsBrl)} | ${brl(c.cost.infraBrl)} | ${brl(c.cost.supportBrl)} | ${brl(c.margin)} | ${(c.marginPct * 100).toFixed(0)}% |`);
  }

  lines.push("", "## Ponto de equilíbrio e CAC (hipóteses)", "");
  lines.push("| Cenário | Custo fixo mensal | Clientes para equilíbrio | CAC | Prazo de recuperação do CAC (meses) |");
  lines.push("|---|---|---|---|---|");
  for (const s of SCENARIOS) {
    const b = breakEven(a, s);
    lines.push(`| ${s} | ${brl(b.fixedMonthlyBrl)} | ${b.breakEvenCustomers} | ${brl(b.cacBrl)} | ${n1(b.paybackMonths)} |`);
  }
  lines.push("", "LTV não é calculado: não há histórico de retenção.");

  lines.push("", "## Sensibilidade (cenário base de preço)", "");
  lines.push("Margem de contribuição por escritório/mês, variando o consumo (multiplicador de documentos e lembretes) e as horas de suporte.", "");
  const header = ["Consumo \\ Suporte (h/mês)", ...a.sensitivity.supportHours.map(String)];
  lines.push("| " + header.join(" | ") + " |");
  lines.push("|" + header.map(() => "---").join("|") + "|");
  for (const mult of a.sensitivity.usageMultipliers) {
    const row = a.sensitivity.supportHours.map((h) =>
      brl(contribution(a, "base", { costScenario: "base", usageMultiplier: mult, supportHours: h }).margin),
    );
    lines.push(`| ${mult}x | ${row.join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

export function buildSensitivityCsv(a) {
  const rows = [["usage_multiplier", "support_hours", "model_brl", "support_brl", "margin_brl"]];
  for (const mult of a.sensitivity.usageMultipliers) {
    for (const h of a.sensitivity.supportHours) {
      const c = contribution(a, "base", { costScenario: "base", usageMultiplier: mult, supportHours: h });
      rows.push([mult, h, c.cost.modelBrl.toFixed(2), c.cost.supportBrl.toFixed(2), c.margin.toFixed(2)]);
    }
  }
  return rows.map((r) => r.join(",")).join("\n") + "\n";
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  const assumptionsPath = process.argv[2] ?? join(here, "assumptions.json");
  const a = JSON.parse(readFileSync(assumptionsPath, "utf8"));
  const out = join(here, "output");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "report.md"), buildReport(a));
  writeFileSync(join(out, "sensitivity.csv"), buildSensitivityCsv(a));
  console.log(buildReport(a));
}
