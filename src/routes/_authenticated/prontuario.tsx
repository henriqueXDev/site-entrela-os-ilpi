import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FileClock, Plus, Printer, Search, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getPatients, getPatientRecords, useClinicalPermissions, type Evolution, type Prescription } from "@/lib/clinical";
import { dateBR } from "@/lib/finance";
import type { Database } from "@/integrations/supabase/types";

type EvolutionInsert = Database["public"]["Tables"]["evolucoes"]["Insert"];
type PrescriptionInsert = Database["public"]["Tables"]["prescricoes"]["Insert"];
const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
const labelClass = "grid gap-1 text-sm font-medium";
const stamp = (value: string) => new Date(value).toLocaleString("pt-BR");
const includesText = (value: unknown, term: string) => String(value ?? "").toLocaleLowerCase("pt-BR").includes(term);

export const Route = createFileRoute("/_authenticated/prontuario")({
  head: () => ({ meta: [
    { title: "Prontuário do Paciente — Entrelaços" },
    { name: "description", content: "Cadastro e histórico clínico protegido dos pacientes da Entrelaços." },
    { property: "og:title", content: "Prontuário do Paciente — Entrelaços" },
    { property: "og:description", content: "Cadastro e histórico clínico protegido dos pacientes da Entrelaços." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ProntuarioPage,
});

function ProntuarioPage() {
  const qc = useQueryClient();
  const permission = useClinicalPermissions();
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [dialog, setDialog] = useState<"patient" | "evolution" | "prescription" | null>(null);
  const [correcting, setCorrecting] = useState<Evolution | Prescription | null>(null);
  const [tab, setTab] = useState("resumo");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [professional, setProfessional] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [visitType, setVisitType] = useState("");
  const patients = useQuery({ queryKey: ["clinical-patients"], queryFn: getPatients, enabled: permission.allows("view") });
  const records = useQuery({ queryKey: ["clinical-records", selected], queryFn: () => getPatientRecords(selected), enabled: permission.allows("view") && !!selected });
  const audit = useQuery({ queryKey: ["clinical-audit", selected], queryFn: async () => {
    const { data, error } = await supabase.from("clinical_audit").select("id, action, actor_id, record_type, occurred_at").eq("paciente_id", selected).order("occurred_at", { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  }, enabled: permission.data?.profile === "admin" && !!selected && tab === "auditoria" });
  useEffect(() => {
    if (!selected || !permission.allows("view")) return;
    void supabase.rpc("log_clinical_access", { _patient_id: selected, _action: "acesso" }).then(({ error }) => { if (error) toast.error("Não foi possível registrar o acesso."); });
  }, [selected, permission.data?.profile]);
  const patient = records.data?.patient;
  const currentRecords = records.data;
  const term = globalSearch.toLocaleLowerCase("pt-BR").trim();
  const evolutions = useMemo(() => (records.data?.evolutions ?? []).filter(e =>
    (!fromDate || e.data_atendimento.slice(0, 10) >= fromDate) && (!toDate || e.data_atendimento.slice(0, 10) <= toDate) &&
    (!professional || includesText(e.profissional, professional.toLowerCase())) &&
    (!specialty || includesText(e.especialidade, specialty.toLowerCase())) &&
    (!visitType || includesText(e.tipo_atendimento, visitType.toLowerCase())) &&
    (!term || [e.profissional,e.especialidade,e.tipo_atendimento,e.queixa,e.evolucao,e.condutas,e.orientacoes,e.data_atendimento].some(v => includesText(v, term)))
  ), [records.data, fromDate, toDate, professional, specialty, visitType, term]);
  const prescriptions = (records.data?.prescriptions ?? []).filter(p => !term || [p.medicamento,p.dosagem,p.prescritor,p.orientacoes,p.data_prescricao].some(v => includesText(v, term)));
  const visiblePatients = (patients.data ?? []).filter(p => [p.nome,p.documento,p.id].some(v => includesText(v, search.toLocaleLowerCase("pt-BR"))));

  if (permission.isLoading) return <AppLayout title="Prontuário do Paciente"><p>Verificando seu acesso…</p></AppLayout>;
  if (permission.isError) return <AppLayout title="Prontuário do Paciente"><p>Não foi possível verificar seu acesso. Tente atualizar a página.</p></AppLayout>;
  if (!permission.allows("view")) return <AppLayout title="Prontuário do Paciente"><p className="text-muted-foreground">Seu perfil não tem acesso aos prontuários. Peça autorização ao administrador.</p></AppLayout>;

  function closeDialog() { setDialog(null); setCorrecting(null); }
  function onSaved(id?: string) {
    void qc.invalidateQueries({ queryKey: ["clinical-patients"] });
    void qc.invalidateQueries({ queryKey: ["clinical-records"] });
    void qc.invalidateQueries({ queryKey: ["clinical-audit"] });
    if (id) setSelected(id);
    closeDialog();
  }
  async function printPrescription(p: Prescription) {
    const { error } = await supabase.rpc("log_clinical_access", { _patient_id: p.paciente_id, _action: "impressao", _record_type: "prescricoes", _record_id: p.id });
    if (error) { toast.error("Não foi possível registrar a impressão."); return; }
    setTab("receitas");
    // Print the currently visible prescription, with the patient identified in the print heading.
    document.querySelectorAll("[data-prescription]").forEach(node => node.classList.toggle("print:hidden", node.getAttribute("data-prescription") !== p.id));
    window.print();
    document.querySelectorAll("[data-prescription]").forEach(node => node.classList.remove("print:hidden"));
  }
  return <AppLayout title="Prontuário do Paciente" description="Histórico clínico e acompanhamento individual" actions={permission.allows("create") ? <Button onClick={() => setDialog("patient")}><Plus className="mr-2 h-4 w-4"/>Novo paciente</Button> : undefined}>
    <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="lg:border-r lg:pr-5">
        <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input aria-label="Buscar pacientes" placeholder="Buscar paciente" value={search} onChange={e => setSearch(e.target.value)} className="pl-9"/></label>
        <div className="mt-3 max-h-72 space-y-1 overflow-auto lg:max-h-[65vh]">
          {patients.isLoading && <p className="text-sm text-muted-foreground">Carregando pacientes…</p>}
          {patients.isError && <p className="text-sm text-destructive">Não foi possível carregar os pacientes.</p>}
          {!patients.isLoading && visiblePatients.length === 0 && <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>}
          {visiblePatients.map(p => <Button key={p.id} variant={selected === p.id ? "secondary" : "ghost"} className="h-auto w-full justify-start py-2 text-left" onClick={() => { setSelected(p.id); setTab("resumo"); }}><span className="min-w-0 truncate">{p.nome}</span></Button>)}
        </div>
      </aside>
      <div className="min-w-0">
        {!selected ? <div className="py-20 text-center text-muted-foreground"><Stethoscope className="mx-auto mb-4 h-8 w-8"/><p>Selecione um paciente para consultar o prontuário.</p></div> : records.isError ? <p className="text-destructive">Não foi possível carregar este prontuário.</p> : records.isLoading || !patient ? <p className="text-muted-foreground">Carregando prontuário…</p> : <>
          <div className="border-b pb-5 print:border-0"><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold">{patient.nome}</h2><p className="text-sm text-muted-foreground">Paciente #{patient.id.slice(0, 8)} · {patient.status}</p></div><span className="rounded border px-2 py-1 text-xs text-muted-foreground">{patient.profissional_responsavel || "Sem responsável definido"}</span></div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm"><span>Documento: {patient.documento || "—"}</span><span>Nascimento: {dateBR(patient.nascimento)}</span><span>Cadastro: {dateBR(patient.created_at.slice(0, 10))}</span></div>
          </div>
          <div className="relative my-5 print:hidden"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input aria-label="Buscar no prontuário" className="pl-9" placeholder="Buscar evoluções, receitas, datas, profissionais…" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}/></div>
          <Tabs value={tab} onValueChange={setTab} className="w-full"><div className="overflow-x-auto print:hidden"><TabsList className="h-auto min-w-max justify-start">{[ ["resumo","Resumo"], ["evolucoes","Evoluções"], ["receitas","Receitas"], ["documentos","Documentos"], ["exames","Exames"], ["historico","Histórico"], ...(permission.data?.profile === "admin" ? [["auditoria","Auditoria"]] : []) ].map(([value = "resumo",label = ""]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}</TabsList></div>
            <TabsContent value="resumo"><div className="grid gap-3 sm:grid-cols-2"><div className="border-b py-4"><p className="text-xs uppercase text-muted-foreground">Evoluções registradas</p><strong className="text-2xl">{(currentRecords?.evolutions.length ?? 0)}</strong><p className="text-sm text-muted-foreground">Última: {currentRecords?.evolutions[0] ? stamp(currentRecords?.evolutions[0].data_atendimento) : "—"}</p></div><div className="border-b py-4"><p className="text-xs uppercase text-muted-foreground">Receitas registradas</p><strong className="text-2xl">{(currentRecords?.prescriptions.length ?? 0)}</strong><p className="text-sm text-muted-foreground">Última: {currentRecords?.prescriptions[0] ? dateBR(currentRecords?.prescriptions[0].data_prescricao) : "—"}</p></div></div><h3 className="mt-6 text-lg font-semibold">Atividade recente</h3><div className="mt-3 space-y-3">{[...(currentRecords?.evolutions ?? []).map(e => ({ id:e.id, date:e.data_atendimento, title:"Evolução · " + e.profissional, detail:e.evolucao })), ...(currentRecords?.prescriptions ?? []).map(p => ({ id:p.id, date:p.created_at, title:"Receita · " + p.medicamento, detail:p.dosagem }))].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5).map(item => <div key={item.id} className="border-b pb-3"><p className="text-xs text-muted-foreground">{stamp(item.date)}</p><p className="font-medium">{item.title}</p><p className="line-clamp-2 text-sm text-muted-foreground">{item.detail}</p></div>)}{(currentRecords?.evolutions.length ?? 0) + (currentRecords?.prescriptions.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Nenhum registro clínico ainda.</p>}</div></TabsContent>
            <TabsContent value="evolucoes"><div className="my-4 flex flex-wrap items-center justify-between gap-3 print:hidden"><h3 className="text-lg font-semibold">Evoluções</h3>{permission.allows("create") && <Button size="sm" onClick={() => setDialog("evolution")}><Plus className="mr-1 h-4 w-4"/>Registrar evolução</Button>}</div><div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 print:hidden"><Input aria-label="De" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}/><Input aria-label="Até" type="date" value={toDate} onChange={e => setToDate(e.target.value)}/><Input aria-label="Filtrar profissional" placeholder="Profissional" value={professional} onChange={e => setProfessional(e.target.value)}/><Input aria-label="Filtrar especialidade" placeholder="Especialidade" value={specialty} onChange={e => setSpecialty(e.target.value)}/><Input aria-label="Filtrar tipo de atendimento" placeholder="Tipo de atendimento" value={visitType} onChange={e => setVisitType(e.target.value)}/></div><div className="space-y-0 border-l-2 border-primary/30 pl-5">{evolutions.map(e => <article key={e.id} className="relative border-b py-5 before:absolute before:-left-[27px] before:top-7 before:size-3 before:rounded-full before:bg-primary"><p className="text-xs text-muted-foreground">{stamp(e.data_atendimento)} · {e.profissional} {e.especialidade && `· ${e.especialidade}`}</p><div className="mt-1 flex justify-between gap-2"><h4 className="font-semibold">{e.tipo_atendimento || "Atendimento"}{e.retifica_id && <span className="ml-2 text-xs font-normal text-warning">Retificação</span>}</h4>{permission.allows("edit") && <Button size="sm" variant="ghost" className="print:hidden" onClick={() => { setCorrecting(e); setDialog("evolution"); }}>Retificar</Button>}</div>{e.retifica_id && <p className="text-xs text-muted-foreground">Registro original: #{e.retifica_id.slice(0,8)} · Motivo: {e.motivo_retificacao}</p>}{e.queixa && <p className="mt-2 text-sm"><b>Queixa:</b> {e.queixa}</p>}<p className="mt-2 whitespace-pre-wrap text-sm">{e.evolucao}</p>{e.condutas && <p className="mt-2 text-sm"><b>Condutas:</b> {e.condutas}</p>}{e.orientacoes && <p className="mt-2 text-sm"><b>Orientações:</b> {e.orientacoes}</p>}{e.observacoes && <p className="mt-2 text-sm"><b>Observações:</b> {e.observacoes}</p>}</article>)}{evolutions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma evolução encontrada.</p>}</div></TabsContent>
            <TabsContent value="receitas"><div className="my-4 flex items-center justify-between gap-2 print:hidden"><h3 className="text-lg font-semibold">Receitas e prescrições</h3>{permission.allows("create") && <Button size="sm" onClick={() => setDialog("prescription")}><Plus className="mr-1 h-4 w-4"/>Nova receita</Button>}</div><div className="space-y-4">{prescriptions.map(p => <article data-prescription={p.id} key={p.id} className="border-b py-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{p.medicamento} · {p.dosagem}</p><p className="text-xs text-muted-foreground">{dateBR(p.data_prescricao)} · {p.prescritor} · {p.status}</p></div><div className="flex gap-1 print:hidden">{permission.allows("edit") && <Button size="sm" variant="ghost" onClick={() => { setCorrecting(p); setDialog("prescription"); }}>Retificar</Button>}{permission.allows("print") && <Button size="icon" variant="ghost" title="Imprimir receita" onClick={() => void printPrescription(p)}><Printer className="h-4 w-4"/></Button>}</div></div>{p.retifica_id && <p className="mt-1 text-xs text-warning">Retifica #{p.retifica_id.slice(0,8)} · {p.motivo_retificacao}</p>}<p className="mt-3 text-sm">Via: {p.via || "—"} · Frequência: {p.frequencia || "—"} · Duração: {p.duracao || "—"} · Quantidade: {p.quantidade || "—"}</p>{p.orientacoes && <p className="mt-2 text-sm">Orientações: {p.orientacoes}</p>}</article>)}{prescriptions.length === 0 && <p className="py-5 text-sm text-muted-foreground">Nenhuma receita encontrada.</p>}</div></TabsContent>
            <TabsContent value="documentos"><Unavailable title="Documentos"/></TabsContent><TabsContent value="exames"><Unavailable title="Exames"/></TabsContent>
            <TabsContent value="historico"><h3 className="my-4 text-lg font-semibold">Histórico de registros</h3><div className="space-y-3">{[...(currentRecords?.evolutions ?? []).map(e => ({ id:e.id, date:e.created_at, label:"Evolução", correction:e.retifica_id })), ...(currentRecords?.prescriptions ?? []).map(p => ({ id:p.id, date:p.created_at, label:"Receita", correction:p.retifica_id }))].sort((a,b) => b.date.localeCompare(a.date)).map(item => <div key={item.id} className="flex justify-between gap-3 border-b py-2 text-sm"><span>{item.label} {item.correction ? `· Retificação de #${item.correction.slice(0,8)}` : "· Registro original"}</span><span className="text-muted-foreground">{stamp(item.date)}</span></div>)}{(currentRecords?.evolutions.length ?? 0) + (currentRecords?.prescriptions.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}</div></TabsContent>
            {permission.data?.profile === "admin" && <TabsContent value="auditoria"><h3 className="my-4 text-lg font-semibold">Auditoria</h3>{audit.isError && <p className="text-destructive">Não foi possível carregar o histórico de auditoria.</p>}{(audit.data ?? []).map(a => <div key={a.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span>{a.action} · {a.record_type}</span><span className="text-muted-foreground">{stamp(a.occurred_at)} · {a.actor_id.slice(0,8)}</span></div>)}</TabsContent>}
          </Tabs>
        </>}
      </div>
    </div>
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) closeDialog(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{dialog === "patient" ? "Novo paciente" : correcting ? "Retificar registro" : dialog === "evolution" ? "Registrar evolução" : "Nova receita"}</DialogTitle></DialogHeader>{dialog === "patient" && <PatientForm onSaved={onSaved}/>}{dialog === "evolution" && selected && <EvolutionForm patientId={selected} original={correcting as Evolution | null} onSaved={() => onSaved()}/>}{dialog === "prescription" && selected && <PrescriptionForm patientId={selected} original={correcting as Prescription | null} onSaved={() => onSaved()}/>}</DialogContent></Dialog>
  </AppLayout>;
}
function Unavailable({ title }: { title: string }) { return <div className="py-10 text-center text-muted-foreground"><FileClock className="mx-auto mb-3 h-6 w-6"/><p>{title} estarão disponíveis na próxima etapa.</p></div>; }

function PatientForm({ onSaved }: { onSaved: (id: string) => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    const f = new FormData(e.currentTarget);
    const { data, error } = await supabase.from("pacientes").insert({ nome: String(f.get("nome") || "").trim(), documento: String(f.get("documento") || "").trim() || null, nascimento: String(f.get("nascimento") || "") || null, profissional_responsavel: String(f.get("responsavel") || "").trim() || null, status: String(f.get("status") || "Ativo") }).select("id").single();
    setSaving(false); if (error) { toast.error("Não foi possível cadastrar: " + error.message); return; } toast.success("Paciente cadastrado"); onSaved(data?.id ?? "");
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Nome completo *<Input name="nome" required/></label><label className={labelClass}>CPF ou documento<Input name="documento"/></label><label className={labelClass}>Nascimento<Input name="nascimento" type="date"/></label><label className={labelClass}>Profissional responsável<Input name="responsavel"/></label><label className={labelClass}>Status<select className={inputClass} name="status"><option>Ativo</option><option>Inativo</option></select></label><div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Cadastrar"}</Button></div></form>;
}
function EvolutionForm({ patientId, original, onSaved }: { patientId: string; original: Evolution | null; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); const f = new FormData(e.currentTarget);
    const row: EvolutionInsert = { paciente_id: patientId, data_atendimento: new Date(String(f.get("data"))).toISOString(), profissional: String(f.get("profissional") || "").trim(), especialidade: String(f.get("especialidade") || "") || null, tipo_atendimento: String(f.get("tipo") || "") || null, queixa: String(f.get("queixa") || "") || null, evolucao: String(f.get("evolucao") || "").trim(), condutas: String(f.get("condutas") || "") || null, orientacoes: String(f.get("orientacoes") || "") || null, observacoes: String(f.get("observacoes") || "") || null, ...(original ? { retifica_id: original.id, motivo_retificacao: String(f.get("motivo") || "").trim() } : {}) };
    const { error } = await supabase.from("evolucoes").insert(row); setSaving(false); if (error) { toast.error("Não foi possível salvar: " + error.message); return; } toast.success(original ? "Retificação registrada sem apagar o original" : "Evolução registrada"); onSaved();
  }
  const fields = [ ["profissional","Profissional *"], ["especialidade","Especialidade"], ["tipo","Tipo de atendimento"], ["queixa","Queixa / observações"], ["evolucao","Evolução clínica *"], ["condutas","Condutas"], ["orientacoes","Orientações"], ["observacoes","Observações adicionais"] ];
  const prior = original ? { profissional: original.profissional, especialidade: original.especialidade, tipo: original.tipo_atendimento, queixa: original.queixa, evolucao: original.evolucao, condutas: original.condutas, orientacoes: original.orientacoes, observacoes: original.observacoes } : {};
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Data e hora *<Input name="data" type="datetime-local" required defaultValue={original?.data_atendimento.slice(0,16) || new Date().toISOString().slice(0,16)}/></label>{fields.map(([name = "",label = ""]) => <label key={name} className={`${labelClass} ${["evolucao","condutas","orientacoes","observacoes"].includes(name) ? "sm:col-span-2" : ""}`}>{label}{["evolucao","condutas","orientacoes","observacoes"].includes(name) ? <textarea name={name} className={inputClass} rows={3} required={name === "evolucao"} defaultValue={prior[name as keyof typeof prior] ?? ""}/> : <Input name={name} required={name === "profissional"} defaultValue={prior[name as keyof typeof prior] ?? ""}/>}</label>)}{original && <label className={`${labelClass} sm:col-span-2`}>Motivo da retificação *<Input name="motivo" required/></label>}<div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : original ? "Registrar retificação" : "Salvar evolução"}</Button></div></form>;
}
function PrescriptionForm({ patientId, original, onSaved }: { patientId: string; original: Prescription | null; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); const f = new FormData(e.currentTarget);
    const row: PrescriptionInsert = { paciente_id: patientId, medicamento: String(f.get("medicamento") || "").trim(), dosagem: String(f.get("dosagem") || "").trim(), via: String(f.get("via") || "") || null, frequencia: String(f.get("frequencia") || "") || null, duracao: String(f.get("duracao") || "") || null, quantidade: String(f.get("quantidade") || "") || null, orientacoes: String(f.get("orientacoes") || "") || null, data_prescricao: String(f.get("data")), prescritor: String(f.get("prescritor") || "").trim(), status: String(f.get("status")), ...(original ? { retifica_id: original.id, motivo_retificacao: String(f.get("motivo") || "").trim() } : {}) };
    const { error } = await supabase.from("prescricoes").insert(row); setSaving(false); if (error) { toast.error("Não foi possível salvar: " + error.message); return; } toast.success(original ? "Retificação registrada sem apagar o original" : "Receita registrada"); onSaved();
  }
  const fields: [string,string,boolean][] = [["medicamento","Medicamento",true],["dosagem","Dosagem",true],["via","Via de administração",false],["frequencia","Frequência",false],["duracao","Duração",false],["quantidade","Quantidade",false],["prescritor","Profissional prescritor",true]];
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">{fields.map(([name = "",label = "",required]) => <label key={name} className={labelClass}>{label}{required ? " *" : ""}<Input name={name} required={required} defaultValue={original?.[name as keyof Prescription] as string ?? ""}/></label>)}<label className={labelClass}>Data da prescrição *<Input name="data" type="date" required defaultValue={original?.data_prescricao || new Date().toISOString().slice(0,10)}/></label><label className={labelClass}>Status<select name="status" className={inputClass} defaultValue={original?.status || "Ativa"}><option>Ativa</option><option>Concluída</option><option>Suspensa</option></select></label><label className={`${labelClass} sm:col-span-2`}>Orientações<textarea className={inputClass} name="orientacoes" rows={3} defaultValue={original?.orientacoes ?? ""}/></label>{original && <label className={`${labelClass} sm:col-span-2`}>Motivo da retificação *<Input name="motivo" required/></label>}<div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Salvando…" : original ? "Registrar retificação" : "Salvar receita"}</Button></div></form>;
}
