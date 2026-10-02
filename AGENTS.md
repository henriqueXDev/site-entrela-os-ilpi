<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Finance app structure
- Shared finance types, formatters and Supabase fetchers live in `src/lib/finance.ts` — one source of truth so every page computes totals the same way.
- All signed-in pages live under `src/routes/_authenticated/` and share `src/components/app-layout.tsx`; `/` and `/auth` are the only public routes.
- Access roles: `user_roles` (admin/editor/viewer); no row = unauthorized. RLS write policies use `can_edit()`; UI gating via `src/lib/use-role.ts`; admin user management via `src/lib/users.functions.ts`.
- Clinical records live in separate patient-linked tables with append-only evolutions/prescriptions and trigger audit; clinical_assignments plus configurable clinical_permissions enforce a distinct clinical privilege boundary so finance roles alone cannot expose health data.
