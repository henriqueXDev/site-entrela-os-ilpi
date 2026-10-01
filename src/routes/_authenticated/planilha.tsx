import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/use-role";
import { exportar, importar, parsePlanilha, type Parsed } from "@/lib/planilha";

export const Route = createFileRoute("/_authenticated/planilha")({
  head: () => ({
    meta: [
      { title: "Importar e exportar planilha — Entrelaços" },
      { name: "description", content: "Importe a planilha de controle e exporte os lançamentos no modelo da ILPI." },
      { property: "og:title", content: "Importar e exportar planilha — Entrelaços" },
      { property: "og:description", content: "Importe e exporte os lançamentos no modelo de planilha." },
    ],
  }),
  component: Planilha,
});

function Planilha() {
  const qc = useQueryClient();
  const { canEdit } = useRole();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileName, setFileName] = useState("");
  const [modo, setModo] = useState<"novos" | "substituir">("novos");
  const [busy, setBusy] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      setParsed(await parsePlanilha(file));
      setFileName(file.name);
    } catch (e) {
      setParsed(null);
      toast.error(e instanceof Error ? e.message : "Não foi possível ler a planilha.");
    }
  }

  async function confirmar() {
    if (!parsed) return;
    if (modo === "substituir" && !confirm("Isso apaga todos os lançamentos atuais do site e coloca os da planilha. Continuar?")) return;
    setBusy(true);
    try {
      const r = await importar(parsed, modo);
      toast.success(`Importado: ${r.mensalidades} mensalidades, ${r.despesas} despesas, ${r.folha} da folha.`);
      setParsed(null);
      setFileName("");
      void qc.invalidateQueries();
    } catch (e) {
      toast.error("Erro ao importar: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function baixar() {
    setBusy(true);
    try {
      await exportar(ano);
    } catch (e) {
      toast.error("Erro ao exportar: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout title="Planilha" description="Importe a planilha de controle ou baixe os dados do site no mesmo modelo.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Download className="h-4 w-4" /> Exportar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gera a planilha no modelo Entrelaços com todas as mensalidades, despesas e folha do site. O fluxo de caixa e o dashboard da planilha se calculam sozinhos.
          </p>
          <label className="mt-4 block text-sm">
            Ano do fluxo de caixa
            <input type="number" className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          </label>
          <Button className="mt-4" onClick={baixar} disabled={busy}>Baixar planilha</Button>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Upload className="h-4 w-4" /> Importar</h2>
          {!canEdit ? (
            <p className="mt-2 text-sm text-muted-foreground">Seu acesso é somente visualização. Peça a um administrador para importar.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Envie a planilha no modelo (abas Mensalidades, Despesas e Folha de Pagamento).
              </p>
              <input type="file" accept=".xlsx" className="mt-4 block w-full text-sm" onChange={(e) => onFile(e.target.files?.[0])} />
              {parsed && (
                <div className="mt-4 space-y-3 text-sm">
                  <p><strong>{fileName}</strong>: {parsed.mensalidades.length} mensalidades, {parsed.despesas.length} despesas, {parsed.folha.length} lançamentos da folha.</p>
                  <label className="flex items-start gap-2">
                    <input type="radio" checked={modo === "novos"} onChange={() => setModo("novos")} className="mt-1" />
                    <span>Adicionar só o que ainda não existe no site (recomendado)</span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="radio" checked={modo === "substituir"} onChange={() => setModo("substituir")} className="mt-1" />
                    <span>Substituir tudo: apagar os lançamentos do site e usar os da planilha</span>
                  </label>
                  <Button onClick={confirmar} disabled={busy}>{busy ? "Importando..." : "Importar"}</Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
