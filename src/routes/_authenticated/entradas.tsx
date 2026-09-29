import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppLayout, StatCard } from "@/components/app-layout";
import { NewEntryDialog } from "@/components/entry-dialog";
import { PeriodFilter } from "@/components/period-filter";
import { brl, dateBR, fetchMensalidades, MESES, ym, yearsFrom } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/entradas")({
  head: () => ({
    meta: [
      { title: "Entradas mensais — Entrelaços" },
      {
        name: "description",
        content:
          "Mensalidades previstas e recebidas mês a mês na ILPI Entrelaços.",
      },
      { property: "og:title", content: "Entradas mensais — Entrelaços" },
      {
        property: "og:description",
        content: "Mensalidades previstas e recebidas mês a mês.",
      },
    ],
  }),
  component: Entradas,
});

function Entradas() {
  const { data = [] } = useQuery({
    queryKey: ["mensalidades"],
    queryFn: fetchMensalidades,
  });

  const years = yearsFrom(data.map((r) => r.mes_referencia));
  const currentYear = String(years[0] ?? new Date().getFullYear());
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState("todos");

  const anoRows = data.filter(
    (r) => String(ym(r.mes_referencia)?.year ?? "") === year,
  );

  const porMes = MESES.map((nome, i) => {
    const rows = anoRows.filter((r) => ym(r.mes_referencia)?.month === i + 1);
    const previsto = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
    const recebido = rows
      .filter((r) => r.status === "Pago")
      .reduce((s, r) => s + Number(r.valor ?? 0), 0);
    return { mes: nome.slice(0, 3), nome, previsto, recebido, rows };
  });

  const selecionado =
    month === "todos" ? null : porMes[Number(month) - 1] ?? null;
  const base = selecionado ? [selecionado] : porMes;
  const previsto = base.reduce((s, m) => s + m.previsto, 0);
  const recebido = base.reduce((s, m) => s + m.recebido, 0);
  const totalAno = porMes.reduce((s, m) => s + m.recebido, 0);
  const lista = selecionado
    ? selecionado.rows
    : anoRows.slice().sort((a, b) =>
        (a.mes_referencia ?? "").localeCompare(b.mes_referencia ?? ""),
      );

  return (
    <AppLayout
      title="Entradas mensais"
      description="Mensalidades previstas e recebidas ao longo do ano."
      actions={<NewEntryDialog />}
    >
      <PeriodFilter
        years={years}
        year={year}
        month={month}
        onYear={setYear}
        onMonth={setMonth}
        allowAllYears={false}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Previsto" value={brl(previsto)} />
        <StatCard label="Recebido" value={brl(recebido)} tone="positive" />
        <StatCard
          label="Em aberto"
          value={brl(previsto - recebido)}
          tone="warning"
        />
        <StatCard label={`Recebido em ${year}`} value={brl(totalAno)} />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold">
          Previsto × recebido — {year}
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(v: number) => brl(v)}
                labelFormatter={(l) => String(l)}
              />
              <Legend />
              <Bar
                dataKey="previsto"
                name="Previsto"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="recebido"
                name="Recebido"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            Mensalidades{" "}
            {selecionado ? `de ${selecionado.nome}` : `de ${year}`} (
            {lista.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Residente</th>
                <th className="px-4 py-2">Mês</th>
                <th className="px-4 py-2">Vencimento</th>
                <th className="px-4 py-2">Pagamento</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium">{r.residente}</td>
                  <td className="px-4 py-2">
                    {r.mes_referencia
                      ? MESES[(ym(r.mes_referencia)?.month ?? 1) - 1]
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{dateBR(r.data_vencimento)}</td>
                  <td className="px-4 py-2">{dateBR(r.data_pagamento)}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {brl(Number(r.valor ?? 0))}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-sm text-muted-foreground"
                  >
                    Nenhuma mensalidade neste período.
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
