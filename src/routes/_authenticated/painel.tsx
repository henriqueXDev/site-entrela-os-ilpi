import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppLayout, StatCard } from "@/components/app-layout";
import { NewEntryDialog } from "@/components/entry-dialog";
import {
  brl,
  dateBR,
  fetchDespesas,
  fetchFolha,
  fetchMensalidades,
  folhaTotal,
  monthKey,
  monthLabel,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Visão geral — Entrelaços" },
      {
        name: "description",
        content: "Resumo financeiro do mês da ILPI Entrelaços.",
      },
      { property: "og:title", content: "Visão geral — Entrelaços" },
      {
        property: "og:description",
        content: "Resumo financeiro do mês da ILPI Entrelaços.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const mens = useQuery({ queryKey: ["mensalidades"], queryFn: fetchMensalidades });
  const desp = useQuery({ queryKey: ["despesas"], queryFn: fetchDespesas });
  const folha = useQuery({ queryKey: ["folha"], queryFn: fetchFolha });

  const keys = new Set<string>();
  for (const r of mens.data ?? []) {
    const k = monthKey(r.mes_referencia);
    if (k) keys.add(k);
  }
  for (const r of desp.data ?? []) {
    const k = monthKey(r.mes_referencia ?? r.data_vencimento);
    if (k) keys.add(k);
  }
  for (const r of folha.data ?? []) {
    const k = monthKey(r.mes_referencia);
    if (k) keys.add(k);
  }
  const hoje = new Date();
  const hojeKey = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const ordenadas = [...keys].sort();
  const current =
    ordenadas.filter((k) => k <= hojeKey).pop() ?? ordenadas.pop();

  const mesMens = (mens.data ?? []).filter(
    (r) => monthKey(r.mes_referencia) === current,
  );
  const mesDesp = (desp.data ?? []).filter(
    (r) => monthKey(r.mes_referencia ?? r.data_vencimento) === current,
  );
  const mesFolha = (folha.data ?? []).filter(
    (r) => monthKey(r.mes_referencia) === current,
  );

  const recebido = mesMens
    .filter((r) => r.status === "Pago")
    .reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const previsto = mesMens.reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const despesas = mesDesp
    .filter((r) => r.status === "Pago")
    .reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const folhaTotalMes = mesFolha.reduce((s, r) => s + folhaTotal(r), 0);
  const resultado = recebido - despesas - folhaTotalMes;

  const ultimos = [
    ...mesMens.map((r) => ({
      id: r.id,
      data: r.data_pagamento ?? r.data_vencimento,
      texto: `Mensalidade — ${r.residente}`,
      valor: Number(r.valor ?? 0),
      entrada: true,
    })),
    ...mesDesp.map((r) => ({
      id: r.id,
      data: r.data_pagamento ?? r.data_vencimento,
      texto: `${r.categoria}${r.descricao ? " — " + r.descricao : ""}`,
      valor: Number(r.valor ?? 0),
      entrada: false,
    })),
  ]
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))
    .reverse()
    .slice(0, 12);

  return (
    <AppLayout
      title="Visão geral"
      description={
        current ? `Mês em destaque: ${monthLabel(current)}` : "Sem lançamentos"
      }
      actions={<NewEntryDialog />}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mensalidades recebidas"
          value={brl(recebido)}
          tone="positive"
          hint={`Previsto ${brl(previsto)}`}
        />
        <StatCard label="Despesas pagas" value={brl(despesas)} tone="negative" />
        <StatCard label="Folha do mês" value={brl(folhaTotalMes)} tone="warning" />
        <StatCard
          label="Resultado do mês"
          value={brl(resultado)}
          tone={resultado >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-8 rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">Últimos lançamentos</h2>
        </div>
        <ul className="divide-y">
          {ultimos.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{l.texto}</p>
                <p className="text-xs text-muted-foreground">
                  {dateBR(l.data)}
                </p>
              </div>
              <span
                className={
                  l.entrada
                    ? "shrink-0 tabular-nums text-success"
                    : "shrink-0 tabular-nums text-destructive"
                }
              >
                {l.entrada ? "+" : "−"} {brl(l.valor)}
              </span>
            </li>
          ))}
          {ultimos.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              Nenhum lançamento ainda.
            </li>
          )}
        </ul>
      </div>
    </AppLayout>
  );
}
