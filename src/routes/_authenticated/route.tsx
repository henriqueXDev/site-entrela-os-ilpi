import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-role";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedGate,
});

function AuthenticatedGate() {
  const { authorized, loading } = useRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Verificando seu acesso…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Acesso não autorizado</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sua conta foi criada, mas ainda não foi liberada. Peça ao
            administrador do site para autorizar seu acesso e definir seu nível
            de permissão.
          </p>
          <button
            onClick={() => void supabase.auth.signOut()}
            className="mt-6 h-9 rounded-md border px-4 text-sm hover:bg-muted"
          >
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
