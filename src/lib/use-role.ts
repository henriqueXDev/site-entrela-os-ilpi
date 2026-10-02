import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "editor" | "viewer";

export function useRole() {
  const q = useQuery({
    queryKey: ["my-role"],
    queryFn: async (): Promise<Role | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const roles = (data ?? []).map((r) => r.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("editor")) return "editor";
      if (roles.includes("viewer")) return "viewer";
      return null; // sem nível atribuído = acesso ainda não autorizado
    },
    staleTime: 60_000,
  });
  const role = q.data ?? null;
  return {
    role,
    isAdmin: role === "admin",
    canEdit: role === "admin" || role === "editor",
    authorized: role !== null,
    loading: q.isLoading,
  };
}
