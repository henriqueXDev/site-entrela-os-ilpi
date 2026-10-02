import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppLayout, StatCard } from "@/components/app-layout";
import { PeriodFilter } from "@/components/period-filter";
import {
  brl,
  dateBR,
  fetchDespesas,
  fetchFolha,
  folhaTotal,
  matchesPeriod,
  MESES,
  ym,
  yearsFrom,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard de gastos — Entrelaços" },
      {
        name: "description",
        content:
          "Tudo o que foi gasto na ILPI Entrelaços, por mês, ano e categoria.",
      },
      { property: "og:title", content: "Dashboard de gastos — Entrelaços" },
      {
        property: "og:description",
        content: "Gastos por mês, ano e categoria.",
      },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Dashboard() {
  const { data: despesas = [] } = useQuery({
    queryKey: ["despesas"],
    queryFn: fetchDespesas,
  });
  const { data: folha = [] } = useQuery({
    queryKey: ["folha"],
    queryFn: fetchFolha,
  });

  const years = yearsFrom([
    ...despesas.map((r) => r.mes_referencia ?? r.data_vencimento),
    ...folha.map((r) => r.mes_referencia),
  ]);
  const [year, setYear] = useState("todos");
  const [month, setMonth] = useState("todos");
  const [categoria, setCategoria] = useState("todas");

  const despesasFiltradas = despesas.filter((r) =>
    matchesPeriod(r.mes_referencia ?? r.data_vencimento, year, month),
  );
  const folhaFiltrada = folha.filter((r) =>
    matchesPeriod(r.mes_referencia, year, month),
  );

  // Agrupa gastos por categoria (folha vira a categoria "Folha de pagamento")
  const porCategoria = new Map<string, number>();
  for (const r of despesasFiltradas) {
    const cat = r.categoria || "Outros";
    porCategoria.set(
      cat,
      (porCategoria.get(cat) ?? 0) + Number(r.valor ?? 0),
    );
  }
  const totalFolha = folhaFiltrada.reduce((s, r) => s + folhaTotal(r), 0);
  if (totalFolha > 0) {
    porCategoria.set(
      "Folha de pagamento",
      (porCategoria.get("Folha de pagamento") ?? 0) + totalFolha,
    );
  }

  const categorias = [...porCategoria.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);

  const categoriasVisiveis =
    categoria === "todas"
      ? categorias
      : categorias.filter((c) => c.nome === categoria);

  const totalGeral = categoriasVisiveis.reduce((s, c) => s + c.total, 0);
  const totalPago =
    despesasFiltradas
      .filter((r) => r.status === "Pago")
      .reduce((s, r) => s + Number(r.valor ?? 0), 0) +
    folhaFiltrada
      .filter((r) => r.status === "Pago")
      .reduce((s, r) => s + folhaTotal(r), 0);
  const totalPendente = totalGeralFiltrado() - totalPago;

  function totalGeralFiltrado() {
    return categorias.reduce((s, c) => s + c.total, 0);
  }

  // Gastos mês a mês (para o gráfico de evolução)
  const porMes = MESES.map((nome, i) => {
    const d = despesasFiltradas
      .filter(
        (r) =>
          ym(r.mes_referencia ?? r.data_vencimento)?.month === i + 1 &&
          (categoria === "todas" ||
            categoria === "Folha de pagamento" ||
            (r.categoria || "Outros") === categoria),
      )
      .reduce((s, r) => s + Number(r.valor ?? 0), 0);
    const f =
      categoria === "todas" || categoria === "Folha de pagamento"
        ? folhaFiltrada
            .filter((r) => ym(r.mes_referencia)?.month === i + 1)
            .reduce((s, r) => s + folhaTotal(r), 0)
        : 0;
    return { mes: nome.slice(0, 3), total: d + f };
  }).filter((m) => m.total > 0 || month !== "todos" || year !== "todos");

  // Detalhes da categoria selecionada
  const detalhes =
    categoria === "todas"
      ? despesasFiltradas
      : categoria === "Folha de pagamento"
        ? []
        : despesasFiltradas.filter(
            (r) => (r.categoria || "Outros") === categoria,
          );

  return (
    <AppLayout
      title="Dashboard de gastos"
      description="Tudo o que foi gasto, por mês, ano e categoria."
    >
      <div className="flex flex-wrap items-center gap-2">
        <PeriodFilter
          years={years}
          year={year}
          month={month}
          onYear={setYear}
          onMonth={setMonth}
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.nome} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total gasto"
          value={brl(totalGeral)}
          tone="negative"
        />
        <StatCard label="Pago" value={brl(totalPago)} />
        <StatCard
          label="Pendente / atrasado"
          value={brl(Math.max(totalPendente, 0))}
          tone="warning"
        />
        <StatCard
          label="Categorias com gasto"
          value={String(categoriasVisiveis.length)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 text-base font-semibold">
            Gastos por categoria
          </h2>
          {categoriasVisiveis.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum gasto neste período.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoriasVisiveis}
                    dataKey="total"
                    nameKey="nome"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {categoriasVisiveis.map((c, i) => (
                      <Cell
                        key={c.nome}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 text-base font-semibold">
            Evolução mês a mês
          </h2>
          {porMes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum gasto neste período.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Bar
                    dataKey="total"
                    name="Gastos"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-semibold">
            Resumo por categoria ({categoriasVisiveis.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">% do total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categoriasVisiveis.map((c) => (
                <tr key={c.nome}>
                  <td className="px-4 py-2 font-medium">{c.nome}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {brl(c.total)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {totalGeral > 0
                      ? `${((c.total / totalGeral) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
              {categoriasVisiveis.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-sm text-muted-foreground"
                  >
                    Nenhum gasto neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {categoria !== "todas" && categoria !== "Folha de pagamento" && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold">
              Despesas de {categoria} ({detalhes.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Descrição</th>
                  <th className="px-4 py-2">Fornecedor</th>
                  <th className="px-4 py-2">Vencimento</th>
                  <th className="px-4 py-2">Pagamento</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {detalhes.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium">
                      {r.descricao || "—"}
                    </td>
                    <td className="px-4 py-2">{r.fornecedor || "—"}</td>
                    <td className="px-4 py-2">{dateBR(r.data_vencimento)}</td>
                    <td className="px-4 py-2">{dateBR(r.data_pagamento)}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {brl(Number(r.valor ?? 0))}
                    </td>
                  </tr>
                ))}
                {detalhes.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-sm text-muted-foreground"
                    >
                      Nenhuma despesa nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
