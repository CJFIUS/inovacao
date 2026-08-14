-- ============================================================
-- Migração: senha única de equipe (sem contas individuais)
-- Rode isto no SQL Editor do Supabase DEPOIS de já ter rodado schema.sql
-- ============================================================

-- 1) Simplifica as políticas: qualquer pessoa autenticada (ou seja, quem
--    tiver a senha da equipe) pode criar e editar tudo — não há mais
--    distinção de papel por pessoa.
drop policy if exists "dores: editor/admin can update" on public.dores;
drop policy if exists "dores: editor/admin can delete" on public.dores;
create policy "dores: authenticated can update" on public.dores for update using (auth.role() = 'authenticated');
create policy "dores: authenticated can delete" on public.dores for delete using (auth.role() = 'authenticated');

drop policy if exists "ideias: editor/admin can insert" on public.ideias;
drop policy if exists "ideias: editor/admin can update" on public.ideias;
drop policy if exists "ideias: editor/admin can delete" on public.ideias;
create policy "ideias: authenticated can insert" on public.ideias for insert with check (auth.role() = 'authenticated');
create policy "ideias: authenticated can update" on public.ideias for update using (auth.role() = 'authenticated');
create policy "ideias: authenticated can delete" on public.ideias for delete using (auth.role() = 'authenticated');

drop policy if exists "projetos: editor/admin can insert" on public.projetos;
drop policy if exists "projetos: editor/admin can update" on public.projetos;
drop policy if exists "projetos: editor/admin can delete" on public.projetos;
create policy "projetos: authenticated can insert" on public.projetos for insert with check (auth.role() = 'authenticated');
create policy "projetos: authenticated can update" on public.projetos for update using (auth.role() = 'authenticated');
create policy "projetos: authenticated can delete" on public.projetos for delete using (auth.role() = 'authenticated');

drop policy if exists "agentes: editor/admin can update" on public.agentes;
create policy "agentes: authenticated can update" on public.agentes for update using (auth.role() = 'authenticated');

-- 2) Posts da Comunidade agora carregam o nome digitado por quem publica
--    (não existe mais um login por pessoa para puxar o nome automaticamente).
alter table public.posts add column if not exists autor_nome text not null default 'Alguém da equipe';

-- 3) Cada dor registrada agora guarda o nome de quem entrou no Hub e a
--    registrou — é uma identificação informal (escolhida na tela de login),
--    não um login individual de verdade.
alter table public.dores add column if not exists registrado_por text;
