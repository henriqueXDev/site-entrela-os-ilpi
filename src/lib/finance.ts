import { supabase } from "@/integrations/supabase/client";

export type Mensalidade = {
  id: string;
  residente: string;
  mes_referencia: string | null;
  valor: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
};

export type Despesa = {
  id: string;
  categoria: string;
  descricao: string | null;
  fornecedor: string | null;
  valor: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  mes_referencia: string | null;
  observacoes: string | null;
};

export type Folha = {
  id: string;
  funcionario: string;
  cargo: string | null;
  mes_referencia: string | null;
  salario_bruto: number | null;
  plantao_extra: number | null;
  vale_transporte: number | null;
  inss: number | null;
  fgts: number | null;
  outros_descontos: number | null;
  salario_liquido: number | null;
  custo_total: number | null;
  data_pagamento: string | null;
  status: string;
  observacoes: string | null;
};

export const CATEGORIAS = [
  "Alimentação",
  "Medicamentos e Insumos de Saúde",
  "Materiais de Higiene e Limpeza",
  "Água/Luz/Telefone/Internet",
  "Aluguel/Condomínio",
  "Manutenção e Reparos",
  "Serviços Terceirizados",
  "Transporte",
  "Impostos e Taxas",
  "Outros",
];

export const FORMAS = ["Pix", "Dinheiro", "Cartão", "Boleto", "Transferência"];
export const STATUS = ["Pago", "Pendente", "Atrasado"];

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function brl(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function dateBR(value: string | null | undefined) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-08-01" -> { year: 2026, month: 8 } */
export function ym(value: string | null | undefined) {
  if (!value) return null;
  const [y, m] = value.slice(0, 10).split("-").map(Number);
  return { year: y, month: m };
}

export function monthKey(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MESES[m - 1]} / ${y}`;
}

export function matchesPeriod(
  value: string | null | undefined,
  year: string,
  month: string,
) {
  const parsed = ym(value);
  if (year !== "todos") {
    if (!parsed || String(parsed.year) !== year) return false;
  }
  if (month !== "todos") {
    if (!parsed || String(parsed.month) !== month) return false;
  }
  return true;
}

export function num(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function folhaTotal(row: Folha) {
  if (row.custo_total != null) return Number(row.custo_total);
  return (
    Number(row.salario_bruto ?? 0) +
    Number(row.plantao_extra ?? 0) +
    Number(row.vale_transporte ?? 0) +
    Number(row.fgts ?? 0)
  );
}

export async function fetchMensalidades() {
  const { data, error } = await supabase
    .from("mensalidades")
    .select("*")
    .order("data_vencimento", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Mensalidade[];
}

export async function fetchDespesas() {
  const { data, error } = await supabase
    .from("despesas")
    .select("*")
    .order("data_vencimento", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Despesa[];
}

export async function fetchFolha() {
  const { data, error } = await supabase
    .from("folha_pagamento")
    .select("*")
    .order("mes_referencia", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Folha[];
}

export function yearsFrom(values: (string | null | undefined)[]) {
  const set = new Set<number>();
  for (const v of values) {
    const parsed = ym(v);
    if (parsed) set.add(parsed.year);
  }
  return [...set].sort((a, b) => b - a);
}
