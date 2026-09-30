import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { listUsers, setUserRole } from "@/lib/users.functions";
import { useRole, type Role } from "@/lib/use-role";
import { dateBR } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e acessos — Entrelaços" },
      { name: "description", content: "Defina quem pode visualizar ou lançar valores." },
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
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  async function change(userId: string, role: Role) {
    try {
      await saveRole({ data: { userId, role } });
      toast.success("Acesso atualizado");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppLayout
      title="Usuários e acessos"
      description="Escolha o que cada pessoa pode fazer. Novos cadastros entram como somente visualização."
    >
      {loading ? null : !isAdmin ? (
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem acessar esta página.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">E-mail</th>
                  <th className="px-4 py-2">Cadastro</th>
                  <th className="px-4 py-2">Último acesso</th>
                  <th className="px-4 py-2">Permissão</th>
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
                      <select
                        className="h-9 rounded-md border bg-background px-2"
                        value={u.role}
                        onChange={(e) => change(u.id, e.target.value as Role)}
                      >
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
                    <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
