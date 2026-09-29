import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout, StatCard } from "@/components/app-layout";
import { NewEntryDialog } from "@/components/entry-dialog";
import { PeriodFilter } from "@/components/period-filter";
import { FolhaForm } from "@/components/entry-forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  brl,
  dateBR,
  fetchFolha,
  folhaTotal,
  matchesPeriod,
  type Folha,
  yearsFrom,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/folha")({
  head: () => ({
    meta: [
      { title: "Folha de pagamento — Entrelaços" },
      {
        name: "description",
        content: "Pagamentos da equipe da ILPI Entrelaços por mês e ano.",
      },
      { property: "og:title", content: "Folha de pagamento — Entrelaços" },
      {
        property: "og:description",
        content: "Pagamentos da equipe por mês e ano.",
      },
    ],
  }),
  component: FolhaPage,
});

function FolhaPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["folha"], queryFn: fetchFolha });
  const [year, setYear] = useState("todos");
  const [month, setMonth] = useState("todos");
  const [editing, setEditing] = useState<Folha | null>(null);

  const years = yearsFrom(data.map((r) => r.mes_referencia ?? r.data_pagamento));
  const rows = data.filter((r) =>
    matchesPeriod(r.mes_referencia ?? r.data_pagamento, year, month),
  );
  const custo = rows.reduce((s, r) => s + folhaTotal(r), 0);
  const pago = rows
    .filter((r) => r.status === "Pago")
    .reduce((s, r) => s + folhaTotal(r), 0);

  async function remover(id: string) {
    const { error } = await supabase
      .from("folha_pagamento")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    toast.success("Lançamento excluído");
    void qc.invalidateQueries({ queryKey: ["folha"] });
  }

  return (
    <AppLayout
      title="Folha de pagamento"
      description="Um lançamento por funcionário e mês."
      actions={<NewEntryDialog defaultTab="folha" />}
    >
      <PeriodFilter
        years={years}
        year={year}
        month={month}
        onYear={setYear}
        onMonth={setMonth}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Custo do período" value={brl(custo)} tone="warning" />
        <StatCard label="Já pago" value={brl(pago)} tone="negative" />
        <StatCard label="Lançamentos" value={String(rows.length)} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Funcionário</th>
                <th className="px-4 py-2">Cargo</th>
                <th className="px-4 py-2">Mês</th>
                <th className="px-4 py-2">Pagamento</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Custo total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 font-medium">{r.funcionario}</td>
                  <td className="px-4 py-2">{r.cargo ?? "—"}</td>
                  <td className="px-4 py-2">{dateBR(r.mes_referencia)}</td>
                  <td className="px-4 py-2">{dateBR(r.data_pagamento)}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {brl(folhaTotal(r))}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
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
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-sm text-muted-foreground"
                  >
                    Nenhum lançamento neste período.
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
            <DialogTitle>Editar lançamento da folha</DialogTitle>
          </DialogHeader>
          {editing && (
            <FolhaForm record={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
