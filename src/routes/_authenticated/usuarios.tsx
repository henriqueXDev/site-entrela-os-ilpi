import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { listUsers, setUserRole, setClinicalProfile } from "@/lib/users.functions";
import { ACTIONS, ACTION_LABELS, PROFILES, PROFILE_LABELS } from "@/lib/clinical";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useRole, type Role } from "@/lib/use-role";
import { dateBR } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e acessos — Entrelaços" },
      { name: "description", content: "Defina quem pode visualizar ou lançar valores." },
      { property: "og:title", content: "Usuários e acessos — Entrelaços" },
      { property: "og:description", content: "Defina permissões financeiras e clínicas por usuário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsuariosPage,
});

const LABEL: Record<Role, string> = {
  viewer: "Somente visualização",
  editor: "Pode lançar e editar",
  admin: "Administrador",
};

function UsuariosPage() {
  const { isAdmin, loading } = useRole();
  const fetchUsers = useServerFn(listUsers);
  const saveRole = useServerFn(setUserRole);
  const saveProfile = useServerFn(setClinicalProfile);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });
  const permissions = useQuery({ queryKey: ["clinical-permissions-admin"], queryFn: async () => {
    const { data, error } = await supabase.from("clinical_permissions").select("profile, action, allowed");
    if (error) throw error;
    return data;
  }, enabled: isAdmin });

  async function change(userId: string, role: Role) {
    try {
      await saveRole({ data: { userId, role } });
      toast.success("Acesso atualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function changeProfile(userId: string, profile: string) {
    try {
      await saveProfile({ data: { userId, profile: profile as "medico" | "enfermagem" | "recepcao" | "financeiro" | "leitura" | "" } });
      toast.success("Perfil clínico atualizado");
      void qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  async function toggle(profile: string, action: string, allowed: boolean) {
    const { error } = await supabase.from("clinical_permissions").upsert({ profile, action, allowed });
    if (error) toast.error("Não foi possível atualizar: " + error.message);
    else { toast.success("Permissão atualizada"); void qc.invalidateQueries({ queryKey: ["clinical-permissions-admin"] }); }
  }

  return (
    <AppLayout
      title="Usuários e acessos"
      description="Autorize pessoas e configure o acesso financeiro e clínico."
    >
      {loading ? null : !isAdmin ? (
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem acessar esta página.
        </p>
      ) : (
        <div className="space-y-8">
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">E-mail</th>
                  <th className="px-4 py-2">Cadastro</th>
                  <th className="px-4 py-2">Último acesso</th>
                  <th className="px-4 py-2">Permissão</th>
                  <th className="px-4 py-2">Perfil clínico</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(q.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 font-medium">{u.email}</td>
                    <td className="px-4 py-2">{dateBR(u.created_at?.slice(0, 10))}</td>
                    <td className="px-4 py-2">
                      {u.last_sign_in_at ? dateBR(u.last_sign_in_at.slice(0, 10)) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <select aria-label={`Perfil clínico de ${u.email}`} className="h-9 rounded-md border bg-background px-2" value={u.clinicalProfile} onChange={(e) => void changeProfile(u.id, e.target.value)}>
                        <option value="">Sem acesso clínico</option>
                        {PROFILES.map(p => <option key={p} value={p}>{PROFILE_LABELS[p]}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="h-9 rounded-md border bg-background px-2"
                        value={u.role}
                        onChange={(e) => change(u.id, e.target.value as Role)}
                      >
                        <option value="" disabled>Aguardando autorização</option>
                        {(Object.keys(LABEL) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {q.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <section><h2 className="mb-1 text-xl font-semibold">Permissões do prontuário</h2><p className="mb-4 text-sm text-muted-foreground">Administradores têm acesso total. Os demais seguem as permissões do perfil atribuído acima.</p>
          {permissions.isError && <p className="text-sm text-destructive">Não foi possível carregar as permissões.</p>}
          <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full min-w-[750px] text-sm"><thead className="bg-muted/60"><tr><th className="px-3 py-3 text-left">Perfil</th>{ACTIONS.map(action => <th key={action} className="px-2 py-3 text-center">{ACTION_LABELS[action]}</th>)}</tr></thead><tbody className="divide-y">{PROFILES.map(profile => <tr key={profile}><th className="px-3 py-3 text-left font-medium">{PROFILE_LABELS[profile]}</th>{ACTIONS.map(action => <td key={action} className="px-2 py-3 text-center"><input type="checkbox" aria-label={`${PROFILE_LABELS[profile]}: ${ACTION_LABELS[action]}`} checked={permissions.data?.some(p => p.profile === profile && p.action === action && p.allowed) ?? false} disabled={!permissions.data} onChange={e => void toggle(profile, action, e.target.checked)}/></td>)}</tr>)}</tbody></table></div>
        </section>
        </div>
      )}
    </AppLayout>
  );
}
