import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CopyPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout, StatCard } from "@/components/app-layout";
import { NewEntryDialog } from "@/components/entry-dialog";
import { PeriodFilter } from "@/components/period-filter";
import { MensalidadeForm } from "@/components/entry-forms";
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
  fetchMensalidades,
  matchesPeriod,
  MESES,
  type Mensalidade,
  ym,
  yearsFrom,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/mensalidades")({
  head: () => ({
    meta: [
      { title: "Mensalidades — Entrelaços" },
      {
        name: "description",
        content: "Mensalidades dos residentes da ILPI Entrelaços por mês e ano.",
      },
      { property: "og:title", content: "Mensalidades — Entrelaços" },
      {
        property: "og:description",
        content: "Mensalidades dos residentes por mês e ano.",
      },
    ],
  }),
  component: Mensalidades,
});

function Mensalidades() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["mensalidades"],
    queryFn: fetchMensalidades,
  });
  const [year, setYear] = useState("todos");
  const [month, setMonth] = useState("todos");
  const [editing, setEditing] = useState<Mensalidade | null>(null);
  const [repetir, setRepetir] = useState(false);

  const years = yearsFrom(data.map((r) => r.mes_referencia));
  const rows = data.filter((r) => matchesPeriod(r.mes_referencia, year, month));
  const previsto = rows.reduce((s, r) => s + Number(r.valor ?? 0), 0);
  const recebido = rows
    .filter((r) => r.status === "Pago")
    .reduce((s, r) => s + Number(r.valor ?? 0), 0);

  async function remover(id: string) {
    const { error } = await supabase.from("mensalidades").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    toast.success("Lançamento excluído");
    void qc.invalidateQueries({ queryKey: ["mensalidades"] });
  }

  return (
    <AppLayout
      title="Mensalidades"
      description="Um lançamento por residente e mês."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRepetir(true)}>
            <CopyPlus className="mr-1 h-4 w-4" /> Repetir mês anterior
          </Button>
          <NewEntryDialog defaultTab="mensalidade" />
        </div>
      }
    >
      <PeriodFilter
        years={years}
        year={year}
        month={month}
        onYear={setYear}
        onMonth={setMonth}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Previsto no período" value={brl(previsto)} />
        <StatCard label="Recebido" value={brl(recebido)} tone="positive" />
        <StatCard
          label="Em aberto"
          value={brl(previsto - recebido)}
          tone="warning"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Residente</th>
                <th className="px-4 py-2">Mês</th>
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
                  <td className="px-4 py-2 font-medium">{r.residente}</td>
                  <td className="px-4 py-2">
                    {r.mes_referencia
                      ? `${MESES[(ym(r.mes_referencia)?.month ?? 1) - 1]}/${ym(r.mes_referencia)?.year}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{dateBR(r.data_vencimento)}</td>
                  <td className="px-4 py-2">{dateBR(r.data_pagamento)}</td>
                  <td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {brl(Number(r.valor ?? 0))}
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
                    Nenhuma mensalidade neste período.
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
            <DialogTitle>Editar mensalidade</DialogTitle>
          </DialogHeader>
          {editing && (
            <MensalidadeForm
              record={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <RepetirDialog
        open={repetir}
        onOpenChange={setRepetir}
        data={data}
      />
    </AppLayout>
  );
}

function RepetirDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: Mensalidade[];
}) {
  const qc = useQueryClient();
  const [destino, setDestino] = useState("");
  const [saving, setSaving] = useState(false);

  async function copiar() {
    if (!destino) {
      toast.error("Escolha o mês de destino.");
      return;
    }
    const alvo = new Date(destino + "T00:00:00");
    const alvoKey = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}`;
    const anterior = new Date(alvo);
    anterior.setMonth(anterior.getMonth() - 1);
    const antKey = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, "0")}`;

    const origem = data.filter(
      (r) => (r.mes_referencia ?? "").slice(0, 7) === antKey,
    );
    if (origem.length === 0) {
      toast.error("O mês anterior não tem mensalidades para copiar.");
      return;
    }
    const jaExiste = new Set(
      data
        .filter((r) => (r.mes_referencia ?? "").slice(0, 7) === alvoKey)
        .map((r) => r.residente.toLowerCase()),
    );

    const novos = origem
      .filter((r) => !jaExiste.has(r.residente.toLowerCase()))
      .map((r) => {
        const dia = r.data_vencimento ? r.data_vencimento.slice(8, 10) : "05";
        return {
          residente: r.residente,
          mes_referencia: `${alvoKey}-01`,
          valor: r.valor,
          data_vencimento: `${alvoKey}-${dia}`,
          data_pagamento: null,
          status: "Pendente",
          forma_pagamento: r.forma_pagamento,
          observacoes: null,
        };
      });

    if (novos.length === 0) {
      toast.info("Todas as mensalidades já existem no mês escolhido.");
      onOpenChange(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("mensalidades").insert(novos);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível repetir: " + error.message);
      return;
    }
    toast.success(`${novos.length} mensalidades criadas.`);
    void qc.invalidateQueries({ queryKey: ["mensalidades"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Repetir mensalidades do mês anterior</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Escolha o mês de destino. As mensalidades do mês anterior serão
          copiadas com o mesmo dia de vencimento, sem marcar recebimento.
        </p>
        <input
          type="month"
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={destino ? destino.slice(0, 7) : ""}
          onChange={(e) => setDestino(e.target.value + "-01")}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={copiar} disabled={saving}>
            {saving ? "Copiando..." : "Repetir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
