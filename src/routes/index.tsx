import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HeartHandshake, PiggyBank, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrelaços — Gestão financeira da ILPI" },
      {
        name: "description",
        content:
          "Controle de mensalidades, despesas, folha de pagamento e fluxo de caixa da ILPI Entrelaços em um só lugar.",
      },
      { property: "og:title", content: "Entrelaços — Gestão financeira da ILPI" },
      {
        property: "og:description",
        content:
          "Mensalidades, despesas, folha e fluxo de caixa da instituição em um painel simples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Administração da ILPI
        </span>
        <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">
          Entrelaços — controle financeiro da casa
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Mensalidades dos residentes, despesas do dia a dia, folha de pagamento
          e o fluxo de caixa mês a mês, no lugar da planilha.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">
            Entrar <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>

        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          {[
            {
              icon: HeartHandshake,
              title: "Mensalidades",
              text: "Previsto, recebido e em aberto por mês e por residente.",
            },
            {
              icon: Receipt,
              title: "Despesas e folha",
              text: "Lançamentos por categoria e pagamentos da equipe.",
            },
            {
              icon: PiggyBank,
              title: "Fluxo de caixa",
              text: "Resultado de cada mês com os lançamentos que o formam.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
