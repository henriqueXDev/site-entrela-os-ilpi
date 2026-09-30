import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/fluxo")({
  head: () => ({
    meta: [
      { title: "Fluxo de caixa — Entrelaços" },
      {
        name: "description",
        content:
          "Entradas, saídas e resultado de cada mês da ILPI Entrelaços, com detalhe dos lançamentos.",
      },
      { property: "og:title", content: "Fluxo de caixa — Entrelaços" },
      {
        property: "og:description",
        content: "Entradas, saídas e resultado de cada mês.",
      },
    ],
  }),
  component: Fluxo,
});

function Fluxo() {
  const mens = useQuery({ queryKey: ["mensalidades"], queryFn: fetchMensalidades });
  const desp = useQuery({ queryKey: ["despesas"], queryFn: fetchDespesas });
  const folha = useQuery({ queryKey: ["folha"], queryFn: fetchFolha });
  const [aberto, setAberto] = useState<string | null>(null);

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
    const k = monthKey(r.mes_referencia ?? r.data_pagamento);
    if (k) keys.add(k);
  }

  const meses = [...keys].sort().map((key) => {
    const m = (mens.data ?? []).filter(
      (r) => monthKey(r.mes_referencia) === key && r.status === "Pago",
    );
    const d = (desp.data ?? []).filter(
      (r) => monthKey(r.mes_referencia ?? r.data_vencimento) === key,
    );
    const f = (folha.data ?? []).filter(
      (r) => monthKey(r.mes_referencia ?? r.data_pagamento) === key,
    );
    const entradas = m.reduce((s, r) => s + Number(r.valor ?? 0), 0);
    const saidas =
      d.reduce((s, r) => s + Number(r.valor ?? 0), 0) +
      f.reduce((s, r) => s + folhaTotal(r), 0);
    return { key, entradas, saidas, resultado: entradas - saidas, m, d, f };
  });

  let acumulado = 0;
  const linhas = meses.map((mes) => {
    acumulado += mes.resultado;
    return { ...mes, acumulado };
  });

  const totalEntradas = meses.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = meses.reduce((s, m) => s + m.saidas, 0);

  return (
    <AppLayout
      title="Fluxo de caixa"
      description="Clique em um mês para ver os lançamentos que formam o resultado."
      actions={<NewEntryDialog />}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Entradas" value={brl(totalEntradas)} tone="positive" />
        <StatCard label="Saídas" value={brl(totalSaidas)} tone="negative" />
        <StatCard
          label="Saldo acumulado"
          value={brl(totalEntradas - totalSaidas)}
          tone={totalEntradas - totalSaidas >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Mês</th>
                <th className="px-4 py-2 text-right">Entradas</th>
                <th className="px-4 py-2 text-right">Saídas</th>
                <th className="px-4 py-2 text-right">Resultado</th>
                <th className="px-4 py-2 text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {linhas.map((l) => (
                <Fragment key={l.key}>
                  <tr
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setAberto(aberto === l.key ? null : l.key)}
                  >
                    <td className="px-4 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {aberto === l.key ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {monthLabel(l.key)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-success">
                      {brl(l.entradas)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-destructive">
                      {brl(l.saidas)}
                    </td>
                    <td
                      className={
                        l.resultado >= 0
                          ? "px-4 py-2 text-right font-medium tabular-nums text-success"
                          : "px-4 py-2 text-right font-medium tabular-nums text-destructive"
                      }
                    >
                      {brl(l.resultado)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {brl(l.acumulado)}
                    </td>
                  </tr>
                  {aberto === l.key && (
                    <tr>
                      <td colSpan={5} className="bg-muted/30 px-4 py-4">
                        <div className="grid gap-4 lg:grid-cols-3">
                          <Detalhe
                            titulo="Mensalidades recebidas"
                            itens={l.m.map((r) => ({
                              id: r.id,
                              nome: r.residente,
                              data: r.data_pagamento ?? r.data_vencimento,
                              valor: Number(r.valor ?? 0),
                            }))}
                          />
                          <Detalhe
                            titulo="Despesas"
                            itens={l.d.map((r) => ({
                              id: r.id,
                              nome: r.descricao ?? r.categoria,
                              data: r.data_pagamento ?? r.data_vencimento,
                              valor: Number(r.valor ?? 0),
                            }))}
                          />
                          <Detalhe
                            titulo="Folha"
                            itens={l.f.map((r) => ({
                              id: r.id,
                              nome: r.funcionario,
                              data: r.data_pagamento ?? r.mes_referencia,
                              valor: folhaTotal(r),
                            }))}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {linhas.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-sm text-muted-foreground"
                  >
                    Sem lançamentos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function Detalhe({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { id: string; nome: string; data: string | null; valor: number }[];
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <ul className="mt-2 space-y-1 text-xs">
        {itens.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span className="truncate">
              {i.nome}
              <span className="text-muted-foreground"> · {dateBR(i.data)}</span>
            </span>
            <span className="tabular-nums">{brl(i.valor)}</span>
          </li>
        ))}
        {itens.length === 0 && (
          <li className="text-muted-foreground">Nada neste mês.</li>
        )}
      </ul>
    </div>
  );
}
