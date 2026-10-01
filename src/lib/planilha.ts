import type ExcelJS from "exceljs";
import modelo from "@/assets/modelo-entrelacos.xlsx.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { fetchDespesas, fetchFolha, fetchMensalidades } from "@/lib/finance";

const FIRST = 5; // first data row in the model

async function loadExcel() {
  const mod = await import("exceljs");
  return ((mod as unknown as { default?: typeof ExcelJS }).default ?? mod) as typeof ExcelJS;
}

function raw(cell: ExcelJS.Cell): unknown {
  const v = cell.value as unknown;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown; formula?: string; sharedFormula?: string };
    if (o.result != null && typeof o.result !== "object") return o.result;
    if (o.result instanceof Date) return o.result;
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.text != null) return o.text;
    const f = o.formula ?? o.sharedFormula;
    const m = f && /^DATE\((\d+),(\d+),(\d+)\)$/.exec(f.replace(/\s/g, ""));
    if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
    return null;
  }
  return v;
}

function str(cell: ExcelJS.Cell) {
  const v = raw(cell);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function numv(cell: ExcelJS.Cell) {
  const v = raw(cell);
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function datev(cell: ExcelJS.Cell) {
  const v = raw(cell);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (typeof v === "string") {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim());
    if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  return null;
}
const firstOfMonth = (d: string | null) => (d ? `${d.slice(0, 7)}-01` : null);
const today = () => new Date().toISOString().slice(0, 10);
function statusOf(pag: string | null, venc: string | null) {
  if (pag) return "Pago";
  if (venc && venc < today()) return "Atrasado";
  return "Pendente";
}

function sheet(wb: ExcelJS.Workbook, name: string) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`A planilha não tem a aba "${name}".`);
  return ws;
}

export async function parsePlanilha(file: File) {
  const Excel = await loadExcel();
  const wb = new Excel.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const mensalidades = [];
  const ms = sheet(wb, "Mensalidades");
  for (let r = FIRST; r <= ms.rowCount; r++) {
    const row = ms.getRow(r);
    const residente = str(row.getCell(2));
    if (!residente) continue;
    const venc = datev(row.getCell(5));
    const pag = datev(row.getCell(6));
    mensalidades.push({
      residente,
      mes_referencia: firstOfMonth(datev(row.getCell(3)) ?? venc),
      valor: numv(row.getCell(4)),
      data_vencimento: venc,
      data_pagamento: pag,
      status: statusOf(pag, venc),
      forma_pagamento: str(row.getCell(8)),
      observacoes: str(row.getCell(9)),
    });
  }

  const despesas = [];
  const ds = sheet(wb, "Despesas");
  for (let r = FIRST; r <= ds.rowCount; r++) {
    const row = ds.getRow(r);
    const categoria = str(row.getCell(1));
    const valor = numv(row.getCell(4));
    if (!categoria && valor == null) continue;
    const venc = datev(row.getCell(5));
    const pag = datev(row.getCell(6));
    despesas.push({
      categoria: categoria ?? "Outros",
      descricao: str(row.getCell(2)),
      fornecedor: str(row.getCell(3)),
      valor,
      data_vencimento: venc,
      data_pagamento: pag,
      status: statusOf(pag, venc),
      forma_pagamento: str(row.getCell(8)),
      mes_referencia: firstOfMonth(datev(row.getCell(9)) ?? venc ?? pag),
      observacoes: str(row.getCell(10)),
    });
  }

  const folha = [];
  const fs = sheet(wb, "Folha de Pagamento");
  for (let r = FIRST; r <= fs.rowCount; r++) {
    const row = fs.getRow(r);
    const funcionario = str(row.getCell(1));
    if (!funcionario) continue;
    const bruto = numv(row.getCell(4));
    const extra = numv(row.getCell(5));
    const vt = numv(row.getCell(6));
    const inss = numv(row.getCell(7));
    const outros = numv(row.getCell(9));
    const fgts = numv(row.getCell(8)) ?? (bruto != null ? (bruto + (extra ?? 0)) * 0.08 : null);
    const liquido =
      numv(row.getCell(10)) ??
      (bruto != null ? bruto + (extra ?? 0) - (inss ?? 0) - (outros ?? 0) : null);
    const custo =
      numv(row.getCell(11)) ?? (liquido ?? 0) + (inss ?? 0) + (fgts ?? 0) + (vt ?? 0);
    const pag = datev(row.getCell(12));
    folha.push({
      funcionario,
      cargo: str(row.getCell(2)),
      mes_referencia: firstOfMonth(datev(row.getCell(3)) ?? pag),
      salario_bruto: bruto,
      plantao_extra: extra,
      vale_transporte: vt,
      inss,
      fgts,
      outros_descontos: outros,
      salario_liquido: liquido,
      custo_total: custo,
      data_pagamento: pag,
      status: pag ? "Pago" : "Pendente",
      observacoes: str(row.getCell(14)),
    });
  }

  return { mensalidades, despesas, folha };
}

export type Parsed = Awaited<ReturnType<typeof parsePlanilha>>;

const low = (s: unknown) => String(s ?? "").trim().toLowerCase();
const keyM = (r: { residente: string; mes_referencia: string | null }) =>
  `${low(r.residente)}|${r.mes_referencia ?? ""}`;
const keyD = (r: { categoria: string; descricao: string | null; valor: number | null; data_vencimento: string | null }) =>
  `${low(r.categoria)}|${low(r.descricao)}|${Number(r.valor ?? 0).toFixed(2)}|${r.data_vencimento ?? ""}`;
const keyF = (r: { funcionario: string; mes_referencia: string | null }) =>
  `${low(r.funcionario)}|${r.mes_referencia ?? ""}`;

export async function importar(p: Parsed, modo: "novos" | "substituir") {
  let { mensalidades, despesas, folha } = p;
  if (modo === "substituir") {
    for (const t of ["mensalidades", "despesas", "folha_pagamento"] as const) {
      const { error } = await supabase.from(t).delete().not("id", "is", null);
      if (error) throw error;
    }
  } else {
    const [m, d, f] = await Promise.all([fetchMensalidades(), fetchDespesas(), fetchFolha()]);
    const sm = new Set(m.map(keyM));
    const sd = new Set(d.map(keyD));
    const sf = new Set(f.map(keyF));
    mensalidades = mensalidades.filter((r) => !sm.has(keyM(r)));
    despesas = despesas.filter((r) => !sd.has(keyD(r)));
    folha = folha.filter((r) => !sf.has(keyF(r)));
  }
  if (mensalidades.length) {
    const { error } = await supabase.from("mensalidades").insert(mensalidades);
    if (error) throw error;
  }
  if (despesas.length) {
    const { error } = await supabase.from("despesas").insert(despesas);
    if (error) throw error;
  }
  if (folha.length) {
    const { error } = await supabase.from("folha_pagamento").insert(folha);
    if (error) throw error;
  }
  return { mensalidades: mensalidades.length, despesas: despesas.length, folha: folha.length };
}

function toDate(v: string | null | undefined) {
  if (!v) return null;
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function fillRows(ws: ExcelJS.Worksheet, count: number, write: (row: ExcelJS.Row, i: number, r: number) => void, cols: number) {
  const last = Math.max(ws.rowCount, FIRST + count - 1);
  for (let r = FIRST; r <= last; r++) {
    const row = ws.getRow(r);
    const i = r - FIRST;
    if (i < count) write(row, i, r);
    else for (let c = 1; c <= cols; c++) {
      const cell = row.getCell(c);
      const v = cell.value as unknown;
      if (!(v && typeof v === "object" && ("formula" in v || "sharedFormula" in v))) cell.value = null;
    }
    row.commit();
  }
}

export async function exportar(ano: number) {
  const Excel = await loadExcel();
  const [m, d, f] = await Promise.all([fetchMensalidades(), fetchDespesas(), fetchFolha()]);
  const buf = await (await fetch(modelo.url)).arrayBuffer();
  const wb = new Excel.Workbook();
  await wb.xlsx.load(buf);

  fillRows(sheet(wb, "Mensalidades"), m.length, (row, i, r) => {
    const x = m[i]!;
    row.getCell(2).value = x.residente;
    row.getCell(3).value = toDate(x.mes_referencia);
    row.getCell(4).value = x.valor != null ? Number(x.valor) : null;
    row.getCell(5).value = toDate(x.data_vencimento);
    row.getCell(6).value = toDate(x.data_pagamento);
    row.getCell(7).value = { formula: `IF(F${r}<>"","Pago",IF(AND(E${r}<>"",TODAY()>E${r}),"Atrasado",IF(E${r}<>"","Pendente","")))` } as ExcelJS.CellFormulaValue;
    row.getCell(8).value = x.forma_pagamento;
    row.getCell(9).value = x.observacoes;
  }, 9);

  fillRows(sheet(wb, "Despesas"), d.length, (row, i, r) => {
    const x = d[i]!;
    row.getCell(1).value = x.categoria;
    row.getCell(2).value = x.descricao;
    row.getCell(3).value = x.fornecedor;
    row.getCell(4).value = x.valor != null ? Number(x.valor) : null;
    row.getCell(5).value = toDate(x.data_vencimento);
    row.getCell(6).value = toDate(x.data_pagamento);
    row.getCell(7).value = { formula: `IF(F${r}<>"","Pago",IF(AND(E${r}<>"",TODAY()>E${r}),"Atrasado",IF(E${r}<>"","Pendente","")))` } as ExcelJS.CellFormulaValue;
    row.getCell(8).value = x.forma_pagamento;
    row.getCell(9).value = x.data_vencimento
      ? ({ formula: `IF(E${r}<>"",DATE(YEAR(E${r}),MONTH(E${r}),1),"")` } as ExcelJS.CellFormulaValue)
      : toDate(x.mes_referencia);
    row.getCell(10).value = x.observacoes;
  }, 10);

  fillRows(sheet(wb, "Folha de Pagamento"), f.length, (row, i, r) => {
    const x = f[i]!;
    const n = (v: number | null) => (v != null ? Number(v) : null);
    row.getCell(1).value = x.funcionario;
    row.getCell(2).value = x.cargo;
    row.getCell(3).value = toDate(x.mes_referencia);
    row.getCell(4).value = n(x.salario_bruto);
    row.getCell(5).value = n(x.plantao_extra);
    row.getCell(6).value = n(x.vale_transporte);
    row.getCell(7).value = n(x.inss);
    row.getCell(8).value = { formula: `IF(D${r}<>"",(D${r}+E${r})*0.08,"")` } as ExcelJS.CellFormulaValue;
    row.getCell(9).value = n(x.outros_descontos);
    row.getCell(10).value = { formula: `IF(D${r}<>"",D${r}+E${r}-G${r}-I${r},"")` } as ExcelJS.CellFormulaValue;
    row.getCell(11).value = x.salario_bruto != null
      ? ({ formula: `J${r}+G${r}+H${r}+F${r}` } as ExcelJS.CellFormulaValue)
      : n(x.custo_total);
    row.getCell(12).value = toDate(x.data_pagamento);
    row.getCell(13).value = { formula: `IF(L${r}<>"","Pago",IF(D${r}<>"","Pendente",""))` } as ExcelJS.CellFormulaValue;
    row.getCell(14).value = x.observacoes;
  }, 14);

  const fc = wb.getWorksheet("Fluxo de Caixa");
  if (fc) fc.getCell("B3").value = ano;
  wb.calcProperties.fullCalcOnLoad = true;

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `controle_Entrelacos_${today()}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
