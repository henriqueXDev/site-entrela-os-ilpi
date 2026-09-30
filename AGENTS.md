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
