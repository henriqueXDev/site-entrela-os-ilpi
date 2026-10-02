import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Patient = Database["public"]["Tables"]["pacientes"]["Row"];
export type Evolution = Database["public"]["Tables"]["evolucoes"]["Row"];
export type Prescription = Database["public"]["Tables"]["prescricoes"]["Row"];
export type ClinicalDocument = Database["public"]["Tables"]["clinical_documents"]["Row"];
export type ClinicalAction = "view" | "create" | "edit" | "upload" | "download" | "print" | "request_delete";
export const PROFILES = ["medico", "enfermagem", "recepcao", "financeiro", "leitura"] as const;
export const PROFILE_LABELS: Record<string, string> = { medico: "Profissional de saúde", enfermagem: "Enfermagem", recepcao: "Recepção", financeiro: "Financeiro", leitura: "Somente leitura" };
export const ACTION_LABELS: Record<ClinicalAction, string> = { view: "Visualizar", create: "Criar", edit: "Retificar", upload: "Enviar arquivos", download: "Baixar", print: "Imprimir", request_delete: "Solicitar exclusão" };
export const ACTIONS = Object.keys(ACTION_LABELS) as ClinicalAction[];

export function useClinicalPermissions() {
  const query = useQuery({
    queryKey: ["clinical-permissions-me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { profile: null, permissions: [] as ClinicalAction[] };
      const [{ data: roles, error: roleError }, { data: assignments, error: assignmentError }, { data: permissions, error: permissionError }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
        supabase.from("clinical_assignments").select("profile").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("clinical_permissions").select("profile, action, allowed"),
      ]);
      if (roleError || assignmentError || permissionError) throw roleError ?? assignmentError ?? permissionError;
      if (roles?.some(r => r.role === "admin")) return { profile: "admin", permissions: ACTIONS };
      return { profile: assignments?.profile ?? null, permissions: (permissions ?? []).filter(p => p.allowed && p.profile === assignments?.profile).map(p => p.action as ClinicalAction) };
    },
  });
  return { ...query, allows: (action: ClinicalAction) => query.data?.permissions.includes(action) ?? false };
}

export async function getPatients() {
  const { data, error } = await supabase.from("pacientes").select("*").order("nome");
  if (error) throw error;
  return data;
}

export async function getPatientRecords(id: string) {
  const [{ data: patient, error: patientError }, { data: evolutions, error: evolutionError }, { data: prescriptions, error: prescriptionError }, { data: documents, error: documentError }] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", id).single(),
    supabase.from("evolucoes").select("*").eq("paciente_id", id).order("data_atendimento", { ascending: false }),
    supabase.from("prescricoes").select("*").eq("paciente_id", id).order("data_prescricao", { ascending: false }),
    supabase.from("clinical_documents").select("*").eq("paciente_id", id).order("created_at", { ascending: false }),
  ]);
  if (patientError || evolutionError || prescriptionError || documentError) throw patientError ?? evolutionError ?? prescriptionError ?? documentError;
  return { patient, evolutions: evolutions ?? [], prescriptions: prescriptions ?? [], documents: documents ?? [] };
}