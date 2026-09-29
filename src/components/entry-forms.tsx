import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIAS,
  FORMAS,
  STATUS,
  num,
  type Despesa,
  type Folha,
  type Mensalidade,
} from "@/lib/finance";

const NONE = "__none__";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Actions({
  saving,
  onCancel,
  editing,
}: {
  saving: boolean;
  onCancel: () => void;
  editing: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={saving}>
        {saving ? "Salvando..." : editing ? "Salvar alterações" : "Lançar"}
      </Button>
    </div>
  );
}

function useSave(table: string, keys: string[]) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function save(payload: Record<string, unknown>, id?: string) {
    setSaving(true);
    const query = id
      ? supabase.from(table as never).update(payload as never).eq("id", id)
      : supabase.from(table as never).insert(payload as never);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar: " + error.message);
      return false;
    }
    toast.success(id ? "Lançamento atualizado" : "Lançamento registrado");
    for (const k of keys) void qc.invalidateQueries({ queryKey: [k] });
    return true;
  }

  return { save, saving };
}

const KEYS = ["mensalidades", "despesas", "folha"];

export function MensalidadeForm({
  record,
  onDone,
  defaultMonth,
}: {
  record?: Mensalidade;
  onDone: () => void;
  defaultMonth?: string;
}) {
  const { save, saving } = useSave("mensalidades", KEYS);
  const [form, setForm] = useState({
    residente: record?.residente ?? "",
    mes_referencia: record?.mes_referencia ?? defaultMonth ?? "",
    valor: record?.valor != null ? String(record.valor) : "",
    data_vencimento: record?.data_vencimento ?? "",
    data_pagamento: record?.data_pagamento ?? "",
    status: record?.status ?? "Pendente",
    forma_pagamento: record?.forma_pagamento ?? "",
    observacoes: record?.observacoes ?? "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.residente.trim()) {
          toast.error("Informe o residente");
          return;
        }
        const ok = await save(
          {
            residente: form.residente.trim(),
            mes_referencia: form.mes_referencia || null,
            valor: num(form.valor),
            data_vencimento: form.data_vencimento || null,
            data_pagamento: form.data_pagamento || null,
            status: form.status,
            forma_pagamento: form.forma_pagamento || null,
            observacoes: form.observacoes || null,
          },
          record?.id,
        );
        if (ok) onDone();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Residente">
          <Input
            value={form.residente}
            onChange={(e) => set("residente", e.target.value)}
            placeholder="Nome do residente"
          />
        </Field>
        <Field label="Valor (R$)">
          <Input
            value={form.valor}
            onChange={(e) => set("valor", e.target.value)}
            inputMode="decimal"
            placeholder="3500,00"
          />
        </Field>
        <Field label="Mês de referência">
          <Input
            type="date"
            value={form.mes_referencia}
            onChange={(e) => set("mes_referencia", e.target.value)}
          />
        </Field>
        <Field label="Vencimento">
          <Input
            type="date"
            value={form.data_vencimento}
            onChange={(e) => set("data_vencimento", e.target.value)}
          />
        </Field>
        <Field label="Data do pagamento">
          <Input
            type="date"
            value={form.data_pagamento}
            onChange={(e) => set("data_pagamento", e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Forma de pagamento">
          <Select
            value={form.forma_pagamento || NONE}
            onValueChange={(v) => set("forma_pagamento", v === NONE ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Não informado</SelectItem>
              {FORMAS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Observações">
        <Textarea
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          rows={2}
        />
      </Field>
      <Actions saving={saving} onCancel={onDone} editing={!!record} />
    </form>
  );
}

export function DespesaForm({
  record,
  onDone,
}: {
  record?: Despesa;
  onDone: () => void;
}) {
  const { save, saving } = useSave("despesas", KEYS);
  const [form, setForm] = useState({
    categoria: record?.categoria ?? "Alimentação",
    descricao: record?.descricao ?? "",
    fornecedor: record?.fornecedor ?? "",
    valor: record?.valor != null ? String(record.valor) : "",
    data_vencimento: record?.data_vencimento ?? "",
    data_pagamento: record?.data_pagamento ?? "",
    status: record?.status ?? "Pendente",
    forma_pagamento: record?.forma_pagamento ?? "",
    mes_referencia: record?.mes_referencia ?? "",
    observacoes: record?.observacoes ?? "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await save(
          {
            categoria: form.categoria,
            descricao: form.descricao || null,
            fornecedor: form.fornecedor || null,
            valor: num(form.valor),
            data_vencimento: form.data_vencimento || null,
            data_pagamento: form.data_pagamento || null,
            status: form.status,
            forma_pagamento: form.forma_pagamento || null,
            mes_referencia: form.mes_referencia || null,
            observacoes: form.observacoes || null,
          },
          record?.id,
        );
        if (ok) onDone();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoria">
          <Select
            value={form.categoria}
            onValueChange={(v) => set("categoria", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Descrição">
          <Input
            value={form.descricao}
            onChange={(e) => set("descricao", e.target.value)}
            placeholder="Ex.: carne da semana"
          />
        </Field>
        <Field label="Fornecedor">
          <Input
            value={form.fornecedor}
            onChange={(e) => set("fornecedor", e.target.value)}
          />
        </Field>
        <Field label="Valor (R$)">
          <Input
            value={form.valor}
            onChange={(e) => set("valor", e.target.value)}
            inputMode="decimal"
            placeholder="150,00"
          />
        </Field>
        <Field label="Mês de referência">
          <Input
            type="date"
            value={form.mes_referencia}
            onChange={(e) => set("mes_referencia", e.target.value)}
          />
        </Field>
        <Field label="Vencimento">
          <Input
            type="date"
            value={form.data_vencimento}
            onChange={(e) => set("data_vencimento", e.target.value)}
          />
        </Field>
        <Field label="Data do pagamento">
          <Input
            type="date"
            value={form.data_pagamento}
            onChange={(e) => set("data_pagamento", e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Forma de pagamento">
          <Select
            value={form.forma_pagamento || NONE}
            onValueChange={(v) => set("forma_pagamento", v === NONE ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Não informado</SelectItem>
              {FORMAS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Observações">
        <Textarea
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          rows={2}
        />
      </Field>
      <Actions saving={saving} onCancel={onDone} editing={!!record} />
    </form>
  );
}

export function FolhaForm({
  record,
  onDone,
}: {
  record?: Folha;
  onDone: () => void;
}) {
  const { save, saving } = useSave("folha_pagamento", KEYS);
  const [form, setForm] = useState({
    funcionario: record?.funcionario ?? "",
    cargo: record?.cargo ?? "",
    mes_referencia: record?.mes_referencia ?? "",
    salario_bruto: record?.salario_bruto != null ? String(record.salario_bruto) : "",
    plantao_extra: record?.plantao_extra != null ? String(record.plantao_extra) : "",
    vale_transporte:
      record?.vale_transporte != null ? String(record.vale_transporte) : "",
    inss: record?.inss != null ? String(record.inss) : "",
    outros_descontos:
      record?.outros_descontos != null ? String(record.outros_descontos) : "",
    data_pagamento: record?.data_pagamento ?? "",
    status: record?.status ?? "Pendente",
    observacoes: record?.observacoes ?? "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const bruto = num(form.salario_bruto) ?? 0;
  const plantao = num(form.plantao_extra) ?? 0;
  const vt = num(form.vale_transporte) ?? 0;
  const inss = num(form.inss) ?? 0;
  const outros = num(form.outros_descontos) ?? 0;
  const fgts = Math.round(bruto * 0.08 * 100) / 100;
  const liquido = bruto + plantao - inss - outros;
  const custo = bruto + plantao + vt + fgts;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.funcionario.trim()) {
          toast.error("Informe o funcionário");
          return;
        }
        const ok = await save(
          {
            funcionario: form.funcionario.trim(),
            cargo: form.cargo || null,
            mes_referencia: form.mes_referencia || null,
            salario_bruto: num(form.salario_bruto),
            plantao_extra: num(form.plantao_extra),
            vale_transporte: num(form.vale_transporte),
            inss: num(form.inss),
            fgts,
            outros_descontos: num(form.outros_descontos),
            salario_liquido: liquido,
            custo_total: custo,
            data_pagamento: form.data_pagamento || null,
            status: form.status,
            observacoes: form.observacoes || null,
          },
          record?.id,
        );
        if (ok) onDone();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Funcionário">
          <Input
            value={form.funcionario}
            onChange={(e) => set("funcionario", e.target.value)}
          />
        </Field>
        <Field label="Cargo">
          <Input
            value={form.cargo}
            onChange={(e) => set("cargo", e.target.value)}
            placeholder="cuidadora"
          />
        </Field>
        <Field label="Mês de referência">
          <Input
            type="date"
            value={form.mes_referencia}
            onChange={(e) => set("mes_referencia", e.target.value)}
          />
        </Field>
        <Field label="Salário bruto (R$)">
          <Input
            value={form.salario_bruto}
            onChange={(e) => set("salario_bruto", e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Plantão extra (R$)">
          <Input
            value={form.plantao_extra}
            onChange={(e) => set("plantao_extra", e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Vale transporte (R$)">
          <Input
            value={form.vale_transporte}
            onChange={(e) => set("vale_transporte", e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="INSS (R$)">
          <Input
            value={form.inss}
            onChange={(e) => set("inss", e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Outros descontos (R$)">
          <Input
            value={form.outros_descontos}
            onChange={(e) => set("outros_descontos", e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Data do pagamento">
          <Input
            type="date"
            value={form.data_pagamento}
            onChange={(e) => set("data_pagamento", e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        FGTS 8%: <strong className="text-foreground">{fgts.toFixed(2)}</strong> ·
        Líquido: <strong className="text-foreground">{liquido.toFixed(2)}</strong>{" "}
        · Custo total:{" "}
        <strong className="text-foreground">{custo.toFixed(2)}</strong>
      </div>
      <Field label="Observações">
        <Textarea
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          rows={2}
        />
      </Field>
      <Actions saving={saving} onCancel={onDone} editing={!!record} />
    </form>
  );
}
