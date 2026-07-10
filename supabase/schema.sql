-- ============================================================
-- CJ INOVA — schema Supabase
-- Rode este script inteiro no SQL Editor do projeto Supabase
-- (Project > SQL Editor > New query > colar tudo > Run)
-- ============================================================

-- ---------- PERFIS (papel: membro | editor | admin) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'membro' check (papel in ('membro','editor','admin')),
  criado_em timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, papel)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), 'membro');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel = 'admin');
$$;

create or replace function public.is_editor_or_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and papel in ('editor','admin'));
$$;

alter table public.profiles enable row level security;
create policy "profiles: authenticated can read" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles: admin can update any" on public.profiles for update using (public.is_admin());

-- ---------- DORES ----------
create table public.dores (
  id text primary key,
  titulo text not null,
  area text not null,
  intensidade int not null check (intensidade between 1 and 5),
  frequencia int not null check (frequencia between 1 and 5),
  alcance text not null,
  status text not null default 'Registrada',
  criado_em timestamptz not null default now()
);
alter table public.dores enable row level security;
create policy "dores: authenticated can read" on public.dores for select using (auth.role() = 'authenticated');
create policy "dores: authenticated can insert" on public.dores for insert with check (auth.role() = 'authenticated');
create policy "dores: editor/admin can update" on public.dores for update using (public.is_editor_or_admin());
create policy "dores: editor/admin can delete" on public.dores for delete using (public.is_editor_or_admin());

-- ---------- IDEIAS ----------
create table public.ideias (
  id text primary key,
  dor_id text references public.dores(id) on delete set null,
  nucleo text not null,
  titulo text not null,
  autores text not null,
  prioridade text not null,
  notas text not null default '',
  criado_em timestamptz not null default now()
);
alter table public.ideias enable row level security;
create policy "ideias: authenticated can read" on public.ideias for select using (auth.role() = 'authenticated');
create policy "ideias: editor/admin can insert" on public.ideias for insert with check (public.is_editor_or_admin());
create policy "ideias: editor/admin can update" on public.ideias for update using (public.is_editor_or_admin());
create policy "ideias: editor/admin can delete" on public.ideias for delete using (public.is_editor_or_admin());

-- ---------- PROJETOS ----------
create table public.projetos (
  id text primary key,
  dor_id text references public.dores(id) on delete set null,
  nucleo text not null,
  titulo text not null,
  equipe text not null,
  prioridade text not null,
  previsao text not null,
  fase text not null,
  criado_em timestamptz not null default now()
);
alter table public.projetos enable row level security;
create policy "projetos: authenticated can read" on public.projetos for select using (auth.role() = 'authenticated');
create policy "projetos: editor/admin can insert" on public.projetos for insert with check (public.is_editor_or_admin());
create policy "projetos: editor/admin can update" on public.projetos for update using (public.is_editor_or_admin());
create policy "projetos: editor/admin can delete" on public.projetos for delete using (public.is_editor_or_admin());

-- ---------- AGENTES (GPTs & Skills) ----------
create table public.agentes (
  id int primary key,
  nome text not null,
  nucleo text not null,
  objetivo text not null,
  criado_por text not null,
  equipe text not null,
  link text not null default ''
);
alter table public.agentes enable row level security;
create policy "agentes: authenticated can read" on public.agentes for select using (auth.role() = 'authenticated');
create policy "agentes: editor/admin can update" on public.agentes for update using (public.is_editor_or_admin());

-- ---------- COMUNIDADE ----------
create table public.posts (
  id bigint generated always as identity primary key,
  autor_id uuid not null references public.profiles(id) on delete cascade,
  texto text not null,
  likes_count int not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "posts: authenticated can read" on public.posts for select using (auth.role() = 'authenticated');
create policy "posts: authenticated can insert own" on public.posts for insert with check (auth.uid() = autor_id);
create policy "posts: author or admin can delete" on public.posts for delete using (auth.uid() = autor_id or public.is_admin());

create table public.curtidas (
  post_id bigint not null references public.posts(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  primary key (post_id, usuario_id)
);
alter table public.curtidas enable row level security;
create policy "curtidas: authenticated can read" on public.curtidas for select using (auth.role() = 'authenticated');
create policy "curtidas: users manage own" on public.curtidas for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

create or replace function public.atualizar_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger curtidas_after_insert
  after insert on public.curtidas
  for each row execute procedure public.atualizar_likes_count();

create trigger curtidas_after_delete
  after delete on public.curtidas
  for each row execute procedure public.atualizar_likes_count();

-- ---------- DADOS INICIAIS (dores, ideias, projetos e agentes reais da planilha) ----------
insert into public.dores (id, titulo, area, intensidade, frequencia, alcance, status) values
('DOR-014','Triagem manual de publicações trabalhistas consome 3h/dia','Publicações',5,5,'Toda a equipe','Em exploração'),
('DOR-021','Prazos calculados em planilha sem alerta automático','Protocolo',5,4,'4 analistas','Priorizada'),
('DOR-008','POPs espalhados em pastas, ninguém acha o mais recente','Geral',3,5,'Toda a equipe','Em exploração'),
('DOR-030','Sínteses de audiência refeitas do zero a cada caso','Publicações',4,4,'6 pessoas','Priorizada'),
('DOR-035','Sem visão consolidada de volumetria por cliente','Relatório',3,2,'Coordenação','Registrada');

insert into public.ideias (id, dor_id, nucleo, titulo, autores, prioridade, notas) values
('IDE-041', null, 'Geral', 'Análise Preditiva de Processos', 'Bruna e Isa', 'Alta', 'Requer dados históricos robustos'),
('IDE-042', null, 'Protocolo', 'Checklist de Documentos de Protocolo', 'Jackeline, Lilian, Rebeca e Júlia', 'Alta', ''),
('IDE-043', null, 'Apoio', 'Acompanhamento de Pauta de Audiências', 'Bruna, Isa e Clara', 'Alta', 'Integração com portais dos tribunais'),
('IDE-044', null, 'Protocolo', 'Robô de Protocolo', 'Jackeline e Isabella', 'Média', 'Alta complexidade — múltiplos sistemas'),
('IDE-045', 'DOR-014', 'Publicações', 'Robô de Captura de Publicações e Intimações', 'Isa e Clara', 'Alta', ''),
('IDE-046', null, 'Publicações', 'Agente de Acompanhamento de E-mail de Intimações', 'Clara', 'Média', 'Integração com e-mail corporativo'),
('IDE-047', null, 'Protocolo', 'Agente de Captura de Prints', 'Clara', 'Baixa', 'Suporte a automações de protocolo'),
('IDE-048', null, 'Apoio', 'Agente para Elaboração de Formulário de RPV', 'Rebeca', 'Média', 'Integração com sistema de RPV'),
('IDE-049', null, 'Protocolo', 'Agente de Captura de Certidões', 'Clara', 'Média', 'Consulta a portais de certidões'),
('IDE-050', null, 'Publicações', 'Agente para Comparação de Publicações Complementares', 'Beatris', 'Média', ''),
('IDE-051', null, 'Apoio', 'Agente para Elaboração de Guias', 'Clara', 'Média', ''),
('IDE-052', 'DOR-021', 'Publicações', 'Agente de Cobrança Diária de Prazos Fatais e Antigos', 'Isa', 'Alta', 'Ideia da Isa; rascunhos de e-mail por núcleo'),
('IDE-053', null, 'Protocolo', 'Conferência Pré-Protocolo por Horário e Fatalidade', 'Isa', 'Alta', 'Ideia da Isa; valida horário, fatalidade e campos obrigatórios'),
('IDE-054', null, 'Protocolo', 'Agente de Conferência de Recibos de Protocolo', 'Isa', 'Média', 'Ideia da Isa; conferência de recibos e inconsistências'),
('IDE-055', null, 'Cadastro', 'Agente de Intake de Cadastro de Processos', 'Isa', 'Alta', 'Ideia da Isa; ficha de abertura/atualização de pasta');

insert into public.projetos (id, dor_id, nucleo, titulo, equipe, prioridade, previsao, fase) values
('PRJ-010', null, 'Cadastro', 'Conferência de Cadastros x Publicações', 'Isabella', 'Alta', 'jun/2026', 'Em Teste'),
('PRJ-011', null, 'Cadastro', 'Conferência de Abertura de Pasta', 'Isabella', 'Média', 'jun/2026', 'Em Teste'),
('PRJ-012', null, 'Geral', 'Assistente de Dúvidas da Controladoria Jurídica', 'Bruna, Clara e Eve', 'Média', 'jul/2026', 'Em Teste'),
('PRJ-013', null, 'Publicações', 'Agente Comparativo Complementares AASP x Principais', 'Beatris', 'Média', 'a definir', 'Em Teste'),
('PRJ-014', null, 'Relatório', 'Conferência de Relatórios Excel x ESPAIDER', 'Clara e Eve', 'Alta', 'jul/2026', 'Em Desenvolvimento'),
('PRJ-015', null, 'Relatório', 'Conferência de Relatórios Auditoria x Mensal', 'Clara e Eve', 'Alta', 'jul/2026', 'Em Desenvolvimento'),
('PRJ-016', null, 'Apoio', 'Conferências Termos Kurier', 'Bruna e Isa', 'Média', 'jul/2026', 'Em Desenvolvimento'),
('PRJ-017', null, 'Apoio', 'Monitoramento Suplementação OAB', 'Beatris, Jackeline e Isa', 'Alta', 'jul/2026', 'Em Desenvolvimento'),
('PRJ-018', null, 'Geral', 'Elaboração de Peça para Habilitação', 'Clara', 'Média', 'jul/2026', 'Em Desenvolvimento'),
('PRJ-019', null, 'Protocolo', 'Agente Auditor de PDF Jurídico', 'Rebeca e Júlia', 'Alta', 'jun/2026', 'Em Desenvolvimento'),
('PRJ-020', 'DOR-035', 'Geral', 'Dashboard de Cobrança de Requisições Pendentes', 'Beatris', 'Média', 'a definir', 'Em Desenvolvimento'),
('PRJ-021', null, 'Relatório', 'Dashboard de Relatórios', 'Eve e Isa', 'Média', 'a definir', 'Em Desenvolvimento'),
('PRJ-022', null, 'Relatório', 'Volumetria Diária de Relatórios', 'Eve e Isa', 'Média', 'a definir', 'Em Desenvolvimento'),
('PRJ-023', null, 'Apoio', 'Atualização de Procurações e Substabelecimentos', 'Jackeline e Isabella', 'Média', 'a definir', 'Em Desenvolvimento'),
('PRJ-024', null, 'Publicações', 'Conferência de Publicações sem Vínculo', 'Bruna e Isa', 'Média', 'a definir', 'Em Desenvolvimento'),
('PRJ-025', null, 'Apoio', 'Contratação de Correspondentes', 'Bruna e Isa', 'Média', 'a definir', 'Em Desenvolvimento');

insert into public.agentes (id, nome, nucleo, objetivo, criado_por, equipe, link) values
(1, 'Atas de Audiência – CJ FIUS', 'Publicações', 'Análise completa de atas de audiência trabalhistas', 'Isabella', 'Isabella, Aline', ''),
(2, 'Sínteses Padronizadas', 'Publicações', 'Síntese das publicações', 'Isabella', 'Isabella', ''),
(3, 'Publicações Trabalhistas – CJ FIUS', 'Publicações', 'Classificação e síntese das publicações', 'Isabella', 'Isabella, Aline', ''),
(4, 'Publicações Penais', 'Publicações', 'Classificação e síntese das publicações', 'Isabella', 'Isabella, Bruna, Beatris, Clara, Aline, Raíssa', ''),
(5, 'Publicações Cíveis', 'Publicações', 'Classificação e síntese das publicações', 'Isabella', 'Isabella, Bruna, Beatris, Clara, Aline, Raíssa', ''),
(6, 'Publicações RJ e Bancário', 'Publicações', 'Classificação e síntese das publicações', 'Isabella', 'Isabella, Bruna, Beatris, Clara, Aline, Raíssa', ''),
(7, 'Publicações Tributárias', 'Publicações', 'Classificação e síntese das publicações', 'Isabella', 'Isabella, Bruna, Beatris, Clara, Aline, Raíssa', ''),
(8, 'Núcleo de Cadastros – CJ FIUS', 'Cadastro', 'Gestão e controle do núcleo de cadastros', 'Jackeline, Isa', 'Isabella', ''),
(9, 'Cálculo RO e RR – Depósito Recursal', 'Apoio', 'Cálculo automatizado de depósitos recursais RO e RR', 'Lilian', 'Lilian e Júlia', ''),
(10, 'Conferência de Guia', 'Apoio', 'Conferência e validação de guias de pagamento', 'Júlia', 'Jackeline, Rebeca, Clara, Bruna', ''),
(11, 'Verificação de Compatibilidade Documental', 'Protocolo', 'Verificação de compatibilidade entre documentos', 'Rebeca', 'Rebeca e Júlia', ''),
(12, 'Dashboard Cobrança de Publicações Pendentes do Dia', 'Publicações', 'Volumetria diária das publicações pendentes com o Jurídico', 'Beatris', 'Beatris', ''),
(13, 'Dashboard Report Semanal – Requisições Pendentes', 'Geral', 'Volumetria semanal com visão macro das requisições pendentes com as áreas', 'Beatris', 'Beatris', '');

-- ---------- Primeira administradora ----------
-- Depois de criar sua conta pela tela de cadastro do Hub, rode isto trocando
-- o e-mail para o seu, para virar Administradora (todo o resto começa como Membro):
-- update public.profiles set papel = 'admin' where id = (select id from auth.users where email = 'SEU-EMAIL-AQUI');
