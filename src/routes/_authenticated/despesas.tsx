import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout, StatCard } from "@/components/app-layout";
import { NewEntryDialog } from "@/components/entry-dialog";
import { PeriodFilter } from "@/components/period-filter";
import { DespesaForm } from "@/components/entry-forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRole } from "@/lib/use-role";
import { supabase } from "@/integrations/supabase/client";
import {
  brl,
  dateBR,
  fetchDespesas,
  matchesPeriod,
  type Despesa,
  yearsFrom,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({
    meta: [
      { title: "Despesas — Entrelaços" },
      {
        name: "description",
        content: "Despesas da ILPI Entrelaços por categoria, mês e ano.",
      },
      { property: "og:title", content: "Despesas — Entrelaços" },
      {
        property: "og:description",
        content: "Despesas por categoria, mês e ano.",
      },
    ],
  }),
  component: Despesas,
});

function Despesas() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["despesas"],
    queryFn: fetchDespesas,
  });
  const [year, setYear] = useState("todos");
  const [month, setMonth] = useState("todos");
  const [editing, setEditing] = useState<Despesa | null>(null);
  const { canEdit } = useRole();

  const years = yearsFrom(data.map((r) => r.mes_referencia ?? r.data_vencimento));
  const rows = data.filter((r) =>
    matchesPeriod(r.mes_referencia ?? r.data_vencimento, year, month),
  );
  const total = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const pago = rows
    .filter((r) => r.status === "Pago")
    .reduce((s, r) => s + Number(r.valor ?? 0), 0);

  async function remover(id: string) {
    const { error } = await supabase.from("despesas").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    toast.success("Lançamento excluído");
    void qc.invalidateQueries({ queryKey: ["despesas"] });
  }

  return (
    <AppLayout
      title="Despesas"
      description="Um lançamento por despesa da casa."
      actions={<NewEntryDialog defaultTab="despesa" />}
    >
      <PeriodFilter
        years={years}
        year={year}
        month={month}
        onYear={setYear}
        onMonth={setMonth}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total do período" value={brl(total)} />
        <StatCard label="Pago" value={brl(pago)} tone="negative" />
        <StatCard label="Em aberto" value={brl(total - pago)} tone="warning" />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Vencimento</th>
                <th className="px-4 py-2">Pagamento</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">{r.categoria}</td>
                  <td className="px-4 py-2 font-medium">{r.descricao ?? "—"}</td>
                  <td className="px-4 py-2">{dateBR(r.data_vencimento)}</td>
                  <td className="px-4 py-2">{dateBR(r.data_pagamento)}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {brl(Number(r.valor ?? 0))}
                  </td>
                  <td className="px-4 py-2">
                    {canEdit && (<div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remover(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-sm text-muted-foreground"
                  >
                    Nenhuma despesa neste período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar despesa</DialogTitle>
          </DialogHeader>
          {editing && (
            <DespesaForm record={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
