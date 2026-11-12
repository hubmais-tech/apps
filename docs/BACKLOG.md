# Backlog do Hub+

> **Gerado.** Este arquivo e o `docs/jira/hub-backlog.csv` saem de `docs/jira/backlog.data.mjs` pelo comando `node docs/jira/build.mjs`. Para mudar o backlog, edite a fonte e gere de novo. Não edite este arquivo à mão.

Elaborado em 2026-11-12, com o papel de Scrum Master, a partir do código e dos documentos do projeto (`PLAN.md`, `DECISIONS.md`, `FLOWS.md`). As estimativas são relativas (pontos) e **ainda não foram calibradas por nenhuma sprint real**.

## 1. Resumo para o Product Owner

- Cada item tem história de usuário, checklist de critérios de aceitação e casos de teste em Dado, Quando e Então (**387 casos de teste no total**).
- O produto tem as **fases 1 a 6 e o onboarding por perfil prontos** e testados (81 testes na API). O que falta não é "mais funcionalidades": é **colocar em operação com segurança**, **fechar os modelos de receita que dependem de decisões** e **evoluir a experiência**.
- O backlog tem **15 épicos e 110 itens, somando 626 pontos**. O **go/no-go do piloto fechado** é ao fim da Sprint 5 (152 pontos em 5 sprints de 2 semanas, com a velocidade assumida de 30). O R1 completo tem 196 pontos, cerca de 7 sprints.
- **14 decisões em aberto** travam itens (seção 9). A maior parte é resolvida por spikes na própria Sprint 1 (hospedagem, e-mail, nota fiscal, menores de 18, Pix no Stripe). **Só a N5, a política de reembolso depois dos 7 dias, não tem spike que a resolva: ela precisa de decisão sua antes da Sprint 2.** As demais ganham uma recomendação na Sprint 1, que você aprova. Os spikes dependem de terceiros (contador, jurídico, provedores), então agende essas conversas antes de a sprint começar.
- Três riscos críticos de negócio antes de cobrar o primeiro real: **obrigação fiscal** (N4), **reembolso em 7 dias feito pelo aluno** (direito de arrependimento) e **CPF e chave Pix guardados sem criptografia**.

## 2. O que o levantamento encontrou no código

Cada linha foi verificada no repositório em 2026-11-12.

| Área | Situação hoje | Onde vira trabalho |
|---|---|---|
| Integração contínua | Não existe `.github/` nem pipeline. Ninguém é avisado se um PR quebra os testes. | E01 |
| Implantação | Não há Dockerfile, nem ambientes de staging e produção, nem backup. | E01 |
| Padronização | Não há ESLint, Prettier nem editorconfig em nenhum dos projetos. | E01 |
| Observabilidade | Sem Sentry, sem `requestId` nos logs, `/health` não checa o banco. | E01 |
| Testes | API: 81 testes em 6 arquivos. Front-end: **nenhum**. Sem teste de ponta a ponta. | E11 |
| Pagamentos | O webhook trata 5 eventos. **Não trata disputa (`charge.dispute.*`)**. Stripe real e Pix ainda não validados em conta de produção. | E02 |
| Reembolso | Só o admin reembolsa. O aluno não consegue pedir dentro dos 7 dias. | E02 |
| Dados sensíveis | CPF e chave Pix ficam em texto puro em `mentor_accounts`. O token de login fica no `localStorage`. | E03 |
| LGPD | Sem termos, política de privacidade, aceite versionado, exportação nem exclusão de conta. | E03, E13 |
| E-mail | Nenhum e-mail é enviado. Não existe recuperar senha, trocar senha nem confirmar e-mail. | E04 |
| Notificações | Não há sino nem aviso de devolutiva, saque pago ou convite. | E04 |
| Vídeo | Upload em um único PUT (frágil para 1 a 2 GB no celular), sem transcodificação, sem retomada, sem legenda. | E05 |
| Catálogo | Sem categoria, nível ou duração. Devolve todos os cursos de uma vez. Sem avaliações. | E06 |
| Curadoria | Todo curso publicado vai direto ao catálogo. Mentor não é verificado além dos dígitos do CPF. | E07 |
| Operação | Admin só vê pedidos, saques e carteira. Listas limitadas a 100 itens. Sem gestão de usuários nem moderação. | E10 |
| Desempenho | Pacote único de 688 kB no front-end, sem divisão por rota. | E11 |
| Site | Visitante cai direto no catálogo. Sem página inicial, SEO nem analytics. | E12 |
| Fiscal | Nenhuma emissão de nota fiscal nem informe de rendimentos do mentor. | E13 |
| Menores de idade | O cadastro de aluno não impede menores de 18 anos, e só o mentor é validado. | E13 |
| Empresas | Só convite. Sem vagas, planos (A10), mensagens nem taxa de contratação (A12). | E08 |
| Doações e bolsas | Não implementados (A8). | E09 |

## 3. Premissas e o que preciso que você confirme

Montei o plano com estas suposições. Se alguma estiver errada, muda o plano.

| # | Premissa | Efeito se estiver errada |
|---|---|---|
| 1 | Projeto Jira do tipo **Scrum** com a chave **HUB** | Só renomear a chave na importação |
| 2 | Sprints de **2 semanas** | Muda o calendário, não a ordem |
| 3 | Velocidade de **30 pontos por sprint**, para uma equipe de dois desenvolvedores full-stack com você como PO | Recalibrar depois da Sprint 1. Equipe maior ou menor muda o número de sprints do R1 |
| 4 | Sem data-alvo definida. O plano usa "Sprint N" e não datas | Com uma data fixa, corte escopo do R1 pelo critério de entrada do piloto (seção 6) |
| 5 | Decisões e conteúdos jurídico e fiscal são responsabilidade do PO e de assessorias externas | Atraso nelas atrasa E02, E03, E04 e E13 |

### Mudanças de escopo registradas

| Data | Mudança | Efeito no backlog |
|---|---|---|
| 2026-11-12 | Empresas **não se cadastram sozinhas**: o Hub+ faz o cadastro único e a empresa escolhe quem gerencia a conta (D23) | **Já entregue no código** (antigo épico E15: cadastro pelo admin, ativação por convite, lista de empresas e troca de responsável). Nada disso consta mais neste backlog. Falta só o envio do convite por e-mail, que está em E04-S02 |
| 2026-11-12 | **Relatório de impacto e selos** ficam para depois do MVP (D24) | Itens movidos para o épico E16, release Pós-MVP: relatório de impacto, selo e transparência do apoiador, coleta de dados de impacto e selos das empresas. Planos, doações e bolsas continuam no R3 |

## 4. Definições de trabalho

### Definição de Pronto para entrar na sprint (DoR)

- Título com a prioridade, no formato `[P2] Verbo no infinitivo + resultado`.
- História de usuário ("Como ..., quero ..., para ...").
- Checklist de critérios de aceitação verificáveis (de 2 a 5).
- Casos de teste em Dado, Quando e Então (de 2 a 4) que cubram cada critério, incluindo ao menos um caso negativo ou de permissão quando houver.
- Estimada por todos em pontos (1, 2, 3, 5, 8 ou 13). Item de 13 pontos deve ser quebrado se possível.
- Sem decisão em aberto que bloqueie (ou a decisão está na sprint anterior).
- Dependências identificadas e já concluídas ou na mesma sprint.

### Definição de Concluído (DoD)

- Critérios de aceitação marcados e **todos os casos de teste executados e aprovados** (automatizados sempre que possível, o restante registrado como teste manual).
- Demonstrado na revisão da sprint.
- Código revisado por outra pessoa e com o CI verde (tipos, lint, testes).
- Testes automatizados novos para o comportamento novo (API: integração; front-end: componente quando houver lógica).
- Documentação atualizada na mesma tarefa: `API.md`, `DATA-MODEL.md`, `FLOWS.md`, `DECISIONS.md`, conforme o caso.
- Funciona no celular e nos dois temas, claro e escuro, quando houver tela.
- Sem dado pessoal ou segredo em log, mensagem de erro ou repositório.
- Implantado em staging e verificado.

### Valores de exemplo nos casos de teste

Onde o negócio ainda não decidiu, os casos de teste usam **valores de exemplo** para que o caso seja verificável. Eles precisam ser confirmados ou trocados no refinamento do item, e o caso de teste ajustado junto:

- **Planos corporativos (A10):** limites como 30 perfis no Essencial e 100 no Avançado, e carência de 7 dias na falha de pagamento.
- **Taxa de contratação (A12):** percentual de 10% e a faixa do selo Bronze em doações.
- **Retenção e taxa do gateway (A14):** 20% de retenção e 3,99% + R$ 0,39 de gateway, enquanto o `.env` do Hub+ hoje usa 12,5% de retenção.
- **Metas de desempenho:** latência p95 do catálogo abaixo de 500 ms e menos de 1% de erro, e pacote inicial abaixo de 300 kB sem compressão.
- **Relatório de impacto:** bairros com menos de 5 pessoas aparecem como "Outros".
- **E-mail para o mentor (E04-S09):** assumido um resumo diário, sem aviso imediato.

### Estimativa e prioridade

- **Pontos:** esforço relativo (Fibonacci), considerando incerteza. **Spike** é pesquisa com tempo máximo e entrega uma decisão, não código de produção.
- **Prioridade:** P0 crítica (impede o piloto), P1 alta, P2 média, P3 baixa. No Jira: Highest, High, Medium, Low.

## 5. Épicos

| Épico | Release | Prioridade | Itens | Pontos | Decisões que bloqueiam |
|---|---|---|---|---|---|
| **E01** Fundação de engenharia e operação | R1 | P0 Crítica | 9 | 38 | N1 |
| **E02** Pagamentos reais e financeiro | R1 | P0 Crítica | 11 | 52 | A9, N5, A14 |
| **E03** Segurança, privacidade e LGPD | R1 | P0 Crítica | 10 | 53 | — |
| **E04** Contas e comunicação | R1 | P0 Crítica | 9 | 39 | A11 |
| **E05** Mídia e conteúdo | R1 | P1 Alta | 8 | 45 | N6 |
| **E06** Experiência de aprendizagem e catálogo | R2 | P1 Alta | 9 | 54 | — |
| **E07** Mentores e curadoria | R2 | P1 Alta | 7 | 51 | A13, N2 |
| **E08** Banco de Talentos e empresas | R3 | P2 Média | 8 | 68 | A10, A12 |
| **E09** Doações e bolsas | R3 | P2 Média | 3 | 31 | A8 |
| **E10** Administração e operação | R2 | P1 Alta | 7 | 42 | A14 |
| **E11** Qualidade e testes | R1 | P1 Alta | 8 | 54 | — |
| **E12** Site institucional e crescimento | R2 | P2 Média | 6 | 29 | A6 |
| **E13** Fiscal e jurídico | R1 | P0 Crítica | 5 | 28 | N5, N4 |
| **E16** Relatório de impacto e selos (pós-MVP) | PM | P3 Baixa | 4 | 24 | A10 |
| **E14** Melhorias e dívida técnica identificadas | R2 | P2 Média | 6 | 18 | — |

Total: **110 itens e 626 pontos**.

## 6. Releases e roteiro

| Release | Objetivo | Pontos | Sprints (a 30 pts) |
|---|---|---|---|
| **R1 · Piloto fechado** | Colocar uma turma piloto de Aracaju para usar a plataforma de verdade, com pagamento real, dados protegidos e operação sob controle. | 196 | 7 |
| **R2 · Lançamento público** | Abrir para o público com catálogo rico, comunicação, curadoria e ferramentas de suporte. | 309 | 11 |
| **R3 · Receita corporativa** | Ligar os modelos de receita que dependem de decisões de negócio: planos, doações, bolsas e taxa de contratação. | 97 | 4 |
| **Pós-MVP · Versões futuras** | Itens que o responsável do produto decidiu deixar para depois do MVP: relatório de impacto social e selos. | 24 | 1 |

### Critérios de entrada do piloto (go/no-go ao fim da Sprint 5)

O piloto só começa quando todos os itens abaixo estiverem verdadeiros:

- [ ] Compra com Stripe real testada de ponta a ponta, incluindo reembolso e disputa (E02-S01, S02, S04, S11).
- [ ] Aluno consegue pedir reembolso em até 7 dias sozinho (E02-S04).
- [ ] CPF e chave Pix criptografados e sessão sem token no `localStorage` (E03-S01, S02).
- [ ] Termos, privacidade e política de reembolso publicados, com aceite versionado (E03-S05, E13-S02).
- [ ] Parecer fiscal obtido e a forma de emitir nota definida (E13-S01).
- [ ] Recuperação de senha e e-mails essenciais funcionando (E04-S02, S03).
- [ ] R2 e e-mail em produção, com domínio e CORS corretos (E05-S01, E04-S01).
- [ ] Staging e produção com deploy automático, backup restaurável e alertas de erro (E01-S05, S07, S08).
- [ ] Revisão de segurança feita e testes de ponta a ponta nos fluxos críticos passando (E03-S09, E11-S02).
- [ ] Direitos do titular da LGPD atendidos (E03-S06).

Os itens de R1 que **não** entram nesse critério (por exemplo Pix assíncrono, confirmação de e-mail e testes do front-end) ficam na Sprint 6 e seguintes, com o piloto já no ar.

## 7. Plano das primeiras sprints

Capacidade assumida: 30 pontos. Sprints acima disso estão sinalizadas.

### Sprint 1 · 30 pontos

**Meta:** Alicerce e prova de pagamento: CI, containers, hospedagem escolhida, Stripe validado, R2 e e-mail definidos, pareceres fiscal e de menores.

| Item | Tipo | Pts | Decisão |
|---|---|---|---|
| E01-S01 Configurar CI no GitHub Actions para API e front-end | Task | 5 | — |
| E01-S03 Criar Dockerfiles da API e do front-end | Task | 5 | — |
| E01-S04 Escolher a hospedagem de produção | Spike | 3 | resolve N1 |
| E02-S01 Validar o Stripe ponta a ponta em modo de teste | Task | 5 | resolve A9 |
| E02-S11 Ativar a conta do Stripe em produção | Task | 2 | — |
| E04-S01 Escolher o provedor de e-mail transacional | Spike | 2 | resolve A11 |
| E05-S01 Configurar o R2 de produção e testar envio real | Task | 3 | — |
| E13-S01 Levantar obrigações fiscais com a contabilidade | Spike | 3 | resolve N4 |
| E13-S05 Definir a política para menores de 18 anos | Spike | 2 | resolve N3 |

### Sprint 2 · 32 pontos ⚠ acima da capacidade

**Meta:** Dinheiro e comunicação: disputas, reembolso pelo aluno, serviço de e-mail, textos jurídicos e gestão de segredos.

| Item | Tipo | Pts | Decisão |
|---|---|---|---|
| E01-S06 Gerenciar segredos e variáveis por ambiente | Task | 3 | — |
| E02-S02 Tratar disputas e chargebacks | Story | 8 | — |
| E02-S04 Reembolso pelo próprio aluno dentro de 7 dias | Story | 8 | depende de N5 |
| E04-S02 Serviço de e-mail com fila e modelos em português | Task | 8 | depende de A11 |
| E13-S02 Redigir termos, privacidade, mentoria e reembolso com assessoria jurídica | Task | 5 | depende de N5 |

### Sprint 3 · 29 pontos

**Meta:** Proteção de dados: criptografia, sessão segura, cabeçalhos, termos com aceite e recuperação de senha.

| Item | Tipo | Pts | Decisão |
|---|---|---|---|
| E03-S01 Criptografar CPF e chave Pix em repouso | Task | 8 | — |
| E03-S02 Sessão segura: token curto, refresh em cookie httpOnly e logout real | Task | 8 | — |
| E03-S03 Cabeçalhos de segurança, CSP e limites de corpo | Task | 3 | — |
| E03-S05 Termos de uso e Política de privacidade com aceite versionado | Story | 5 | — |
| E04-S03 Recuperar senha pelo e-mail | Story | 5 | — |

### Sprint 4 · 32 pontos ⚠ acima da capacidade

**Meta:** Pronto para operar: deploy automático, observabilidade, backup, rate limit, auditoria de CPF, saques em lote e seed de demonstração.

| Item | Tipo | Pts | Decisão |
|---|---|---|---|
| E01-S05 Publicar staging e produção com deploy automático | Task | 8 | depende de N1 |
| E01-S07 Observabilidade: logs com requestId, Sentry e health com banco | Task | 5 | — |
| E01-S08 Backup do Postgres e restauração testada | Task | 3 | — |
| E01-S09 Criar seed de demonstração (`pnpm db:seed:demo`) | Task | 3 | — |
| E02-S06 Pagar saques em lote com exportação CSV e comprovante | Story | 5 | — |
| E03-S04 Rate limit compartilhado e proteção contra força bruta | Task | 5 | — |
| E03-S10 Auditar o acesso ao CPF completo | Task | 3 | — |

### Sprint 5 · 29 pontos

**Meta:** Prova de fogo: direitos da LGPD, revisão de segurança e testes de ponta a ponta. Fim da sprint: go/no-go do piloto.

| Item | Tipo | Pts | Decisão |
|---|---|---|---|
| E01-S02 Padronizar lint e formatação nos dois projetos | Task | 3 | — |
| E03-S06 Direitos do titular: exportar meus dados e excluir minha conta | Story | 8 | — |
| E03-S09 Revisão de segurança (OWASP ASVS nível 1) e auditoria de dependências | Task | 5 | — |
| E11-S02 Testes de ponta a ponta com Playwright nos fluxos críticos | Task | 13 | — |

### Sprint 6 · 16 pontos

**Meta:** Piloto no ar, primeiros ajustes: Pix assíncrono e e-mail do convite.

| Item | Tipo | Pts | Decisão |
|---|---|---|---|
| E02-S03 Pagamento assíncrono (Pix e boleto) com pedido pendente na tela | Story | 5 | depende de A9 |
| E04-S04 Trocar senha e e-mail dentro da conta | Story | 3 | — |
| E04-S06 Enviar o convite de representante por e-mail | Task | 2 | — |
| E12-S04 Central de ajuda e canal de suporte | Story | 3 | — |
| E14-S03 Validar que o arquivo existe no R2 ao criar a aula ou a entrega | Task | 3 | — |

### Sprint 7 · 18 pontos

**Meta:** Qualidade: paginação do admin, testes do front-end e taxa real do Stripe.

| Item | Tipo | Pts | Decisão |
|---|---|---|---|
| E02-S05 Gravar a taxa real do Stripe em cada pedido | Task | 5 | depende de A14 |
| E10-S02 Paginação e filtros em pedidos, saques, correções e convites | Task | 5 | — |
| E11-S01 Testes de componentes e hooks no front-end | Task | 8 | — |

### R1 ainda sem sprint · 10 pontos

Entram na Sprint 8, depois de recalibrar a velocidade com os dados reais das sprints anteriores.

- E04-S05 Confirmar o e-mail no cadastro (5 pts)
- E11-S03 Ampliar testes da API: webhook, erros do R2 e concorrência (5 pts)

## 8. Backlog detalhado

### E01 · Fundação de engenharia e operação

**Release:** R1 · Piloto fechado · **Prioridade:** P0 Crítica · **9 itens, 38 pontos**

**Objetivo:** Qualquer mudança passa por CI, sobe em ambientes previsíveis e pode ser observada e recuperada.

**Por que importa:** Sem isso não existe piloto: não há como publicar, medir nem se recuperar de um erro.

#### [P0] Configurar CI no GitHub Actions para API e front-end

**Código:** E01-S01 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como pessoa que desenvolve o Hub+, quero que cada pull request rode checagem de tipos, testes da API e build do front-end automaticamente, para descobrir regressões antes de elas chegarem na main.

**Checklist de critérios de aceitação**

- [ ] O workflow roda em todo PR e na main e bloqueia o merge quando falha.
- [ ] Os testes da API rodam contra um Postgres criado no próprio job, com gateway fake.
- [ ] Cache do pnpm ativo e tempo total abaixo de 6 minutos.
- [ ] Selo de status no README.

**Casos de teste**

*CT-01 — Pull request com teste quebrado é bloqueado*

- **Dado que** um pull request em que um teste da API falha
- **Quando** o workflow de CI terminar
- **Então** o status do pull request fica vermelho e a proteção da main impede o merge.

*CT-02 — Testes rodam em banco próprio e sem Stripe real*

- **Dado que** um pull request com qualquer alteração
- **Quando** o job de testes da API for executado
- **Então** ele sobe um Postgres de serviço vazio, aplica as migrações, roda os testes com PAYMENT_GATEWAY=fake sem chamar o Stripe e termina verde.

*CT-03 — Cache e tempo de execução*

- **Dado que** uma segunda execução do workflow sem mudança de dependências
- **Quando** o workflow terminar
- **Então** o cache do pnpm é restaurado e a duração total fica abaixo de 6 minutos.

*CT-04 — Selo de status no README*

- **Dado que** o último workflow da main terminou com sucesso
- **Quando** alguém abrir o README no GitHub
- **Então** o selo mostra "passing" e passa a mostrar "failing" quando o último workflow da main falhar.


#### [P1] Padronizar lint e formatação nos dois projetos

**Código:** E01-S02 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 5

**História de usuário**

Como pessoa que desenvolve o Hub+, quero lint e formatação padronizados nos dois projetos, verificados no CI e antes do commit, para manter o código consistente sem discutir estilo em revisão.

**Checklist de critérios de aceitação**

- [ ] `pnpm lint` e `pnpm format:check` existem nos dois projetos e rodam no CI.
- [ ] Hook de pré-commit formata e lint nos arquivos alterados.
- [ ] O código atual passa sem erros (ou com exceções documentadas).

**Casos de teste**

*CT-01 — Código atual passa no lint e no formato*

- **Dado que** o código da main sem alterações
- **Quando** forem executados pnpm lint e pnpm format:check na api e no web
- **Então** os quatro comandos terminam com código 0, ou as exceções estão documentadas na configuração com a justificativa.

*CT-02 — Hook de pré-commit age só nos arquivos alterados*

- **Dado que** um arquivo .ts alterado com formatação fora do padrão e outro com uma variável não usada
- **Quando** a pessoa executar git commit
- **Então** o hook formata o primeiro arquivo e bloqueia o commit apontando o arquivo e a linha do erro de lint do segundo.

*CT-03 — CI falha com erro de lint*

- **Dado que** um pull request com um erro de lint
- **Quando** o CI rodar
- **Então** o job de lint fica vermelho e o merge fica bloqueado.


**Depende de:** E01-S01 (Configurar CI no GitHub Actions para API e front-end)

#### [P0] Criar Dockerfiles da API e do front-end

**Código:** E01-S03 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como time do Hub+, quero imagens Docker reproduzíveis da API e do front-end, para publicar o mesmo artefato em qualquer ambiente.

**Checklist de critérios de aceitação**

- [ ] Dockerfile da API com build em múltiplos estágios e `HEALTHCHECK`.
- [ ] Front-end servido como estático com fallback para `index.html` (rotas do React Router).
- [ ] `docker compose` de produção-like sobe API, banco e web localmente.
- [ ] Imagens sem segredos embutidos.

**Casos de teste**

*CT-01 — Imagem da API roda sem root e com healthcheck*

- **Dado que** a imagem da API construída pelo Dockerfile
- **Quando** o contêiner for iniciado com as variáveis obrigatórias
- **Então** o processo roda com usuário não root e o HEALTHCHECK passa para "healthy" em até 60 segundos.

*CT-02 — Rotas do React Router funcionam no estático*

- **Dado que** o contêiner do front-end em execução
- **Quando** alguém acessar direto /courses/qualquer-slug
- **Então** o servidor devolve index.html com status 200 e o front-end abre a página do curso.

*CT-03 — Compose de produção sobe o conjunto*

- **Dado que** o docker compose de produção-like
- **Quando** ele for iniciado do zero
- **Então** API, banco e front-end ficam saudáveis, a migração é aplicada e o login de uma conta de teste funciona.

*CT-04 — Imagens sem segredos embutidos*

- **Dado que** as imagens da API e do front-end construídas
- **Quando** forem inspecionadas com docker history e docker inspect
- **Então** nenhuma camada ou variável contém JWT_SECRET, chave do Stripe ou chave do R2.


#### [P0] Escolher a hospedagem de produção

**Código:** E01-S04 · **Tipo:** Spike · **Pontos:** 3 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como time do Hub+, quero comparar as opções de hospedagem e receber uma recomendação, para escolher onde rodar o piloto com custo e risco conhecidos.

**Checklist de critérios de aceitação**

- [ ] Comparativo de pelo menos 3 opções, com custo mensal estimado para o piloto.
- [ ] Recomendação registrada em `docs/DECISIONS.md` como nova decisão.
- [ ] Plano de migração de dados e de domínio descrito.

**Casos de teste**

*CT-01 — Comparativo completo*

- **Dado que** o spike foi concluído
- **Quando** o documento de comparação for revisado
- **Então** ele traz pelo menos 3 opções, cada uma com custo mensal estimado para o piloto, região no Brasil, política de backup e capacidade de crescer.

*CT-02 — Recomendação registrada como decisão*

- **Dado que** a opção recomendada foi aprovada pelo PO
- **Quando** alguém abrir docs/DECISIONS.md
- **Então** existe uma decisão nova com data, opção escolhida, alternativas descartadas e motivo, e a pendência de hospedagem deixa de aparecer como aberta.

*CT-03 — Plano de migração de banco e domínio*

- **Dado que** a recomendação registrada
- **Quando** o plano de migração for lido por outra pessoa do time
- **Então** ele descreve os passos para mover banco e domínio, o tempo de indisponibilidade estimado e quem executa cada passo.


**Entrega a decisão:** N1: Hospedagem de produção (API, banco e front-end)

#### [P0] Publicar staging e produção com deploy automático

**Código:** E01-S05 · **Tipo:** Task · **Pontos:** 8 · **Release:** R1 · **Sprint:** 4

**História de usuário**

Como time do Hub+, quero que cada mudança seja publicada automaticamente em staging e em produção só com aprovação, para entregar rápido sem arriscar o ambiente real.

**Checklist de critérios de aceitação**

- [ ] Staging atualizado automaticamente a cada merge na main.
- [ ] Produção só com aprovação manual no pipeline.
- [ ] Migração roda antes da nova versão e falha o deploy se der erro.
- [ ] Procedimento de rollback documentado e testado uma vez.

**Casos de teste**

*CT-01 — Merge na main atualiza o staging*

- **Dado que** um pull request aprovado
- **Quando** ele for mesclado na main
- **Então** o pipeline publica em staging e o endpoint de saúde passa a informar o commit do merge.

*CT-02 — Produção só com aprovação manual*

- **Dado que** uma versão publicada em staging
- **Quando** o pipeline chegar na etapa de produção
- **Então** ele fica aguardando aprovação manual e só publica depois de uma pessoa autorizada aprovar.

*CT-03 — Migração com erro impede o deploy*

- **Dado que** uma migração que falha ao ser aplicada
- **Quando** o deploy rodar
- **Então** o pipeline falha antes de subir a nova versão e a versão anterior continua atendendo as requisições.

*CT-04 — Rollback documentado e testado*

- **Dado que** uma versão com defeito publicada em staging
- **Quando** a equipe seguir o procedimento de rollback documentado
- **Então** a versão anterior volta a atender, o tempo gasto é medido e registrado, e o procedimento é anotado como testado uma vez.


**Depende de:** E01-S03 (Criar Dockerfiles da API e do front-end); E01-S04 (Escolher a hospedagem de produção)

**Bloqueada pela decisão:** N1: Hospedagem de produção (API, banco e front-end)

#### [P0] Gerenciar segredos e variáveis por ambiente

**Código:** E01-S06 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 2

**História de usuário**

Como time do Hub+, quero segredos guardados por ambiente e com rotação definida, para que um vazamento ou uma troca de chave não exija mexer no código.

**Checklist de critérios de aceitação**

- [ ] Segredos fora do repositório e fora das imagens, por ambiente.
- [ ] A API recusa subir com variável obrigatória ausente (já existe) e com chave de teste em produção.
- [ ] Procedimento de rotação do JWT_SECRET e das chaves do Stripe e do R2 documentado.

**Casos de teste**

*CT-01 — Segredos fora do repositório e das imagens*

- **Dado que** o repositório completo e as imagens publicadas
- **Quando** uma ferramenta de detecção de segredos for executada
- **Então** não há nenhum achado de chave do Stripe, do R2 ou JWT_SECRET.

*CT-02 — API recusa subir com configuração perigosa*

- **Dado que** o ambiente de produção sem JWT_SECRET, ou com chave sk_test do Stripe, ou com PAYMENT_GATEWAY=fake
- **Quando** a API for iniciada
- **Então** ela encerra com uma mensagem que nomeia a variável e o motivo, sem aceitar tráfego.

*CT-03 — Rotação do JWT_SECRET*

- **Dado que** o procedimento de rotação documentado
- **Quando** ele for executado em staging
- **Então** novos logins funcionam, as sessões antigas são recusadas como o documento descreve, e o mesmo documento cobre a rotação das chaves do Stripe e do R2.


**Depende de:** E01-S04 (Escolher a hospedagem de produção)

#### [P0] Observabilidade: logs com requestId, Sentry e health com banco

**Código:** E01-S07 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 4

**História de usuário**

Como time do Hub+, quero logs rastreáveis, captura de erros e alertas, para descobrir e corrigir problemas antes de os usuários reclamarem.

**Checklist de critérios de aceitação**

- [ ] Todo log da API tem `requestId` e o mesmo id vai no cabeçalho da resposta.
- [ ] Sentry captura erros da API e do front-end, sem dados pessoais (CPF, Pix, senha) nos eventos.
- [ ] `/health` checa o banco e devolve 503 se ele cair.
- [ ] Alerta de erro 5xx acima do normal chega ao canal do time.

**Casos de teste**

*CT-01 — requestId em toda requisição*

- **Dado que** uma requisição qualquer à API
- **Quando** a resposta for devolvida
- **Então** o cabeçalho de resposta traz o requestId e todas as linhas de log daquela requisição têm o mesmo id.

*CT-02 — Sentry sem dados pessoais*

- **Dado que** um erro forçado em uma rota cujo corpo contém CPF, chave Pix e senha
- **Quando** o evento chegar ao Sentry, vindo da API ou do front-end
- **Então** esses campos aparecem removidos ou mascarados no evento.

*CT-03 — Health depende do banco*

- **Dado que** o banco parado
- **Quando** GET /health for chamado
- **Então** a API responde 503, e com o banco no ar responde 200.

*CT-04 — Alerta de erros 5xx*

- **Dado que** uma taxa de respostas 5xx acima do limite configurado
- **Quando** o limite for ultrapassado por 5 minutos seguidos
- **Então** um alerta chega ao canal do time.


#### [P0] Backup do Postgres e restauração testada

**Código:** E01-S08 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 4

**História de usuário**

Como time do Hub+, quero backups automáticos do Postgres com restauração comprovada, para não perder dados de alunos, vendas e carteiras em caso de falha.

**Checklist de critérios de aceitação**

- [ ] Backup diário com retenção definida e cópia fora do provedor principal.
- [ ] Restauração testada em ambiente isolado, com o tempo medido.
- [ ] Procedimento escrito em `docs/`.

**Casos de teste**

*CT-01 — Backup diário com cópia externa*

- **Dado que** o ambiente de produção em operação
- **Quando** passar um dia
- **Então** existe um backup novo com a data do dia, mantido pelo período de retenção definido e com cópia em outro provedor.

*CT-02 — Restauração em ambiente isolado*

- **Dado que** o backup mais recente
- **Quando** ele for restaurado em um ambiente isolado
- **Então** a contagem de linhas de users, orders e ledger_entries é igual à da origem e o tempo de restauração fica registrado.

*CT-03 — Procedimento reproduzível por outra pessoa*

- **Dado que** o procedimento escrito em docs/
- **Quando** alguém que não o escreveu o seguir só pelo texto
- **Então** a restauração termina sem ajuda e o texto é corrigido onde houver dúvida.


**Depende de:** E01-S04 (Escolher a hospedagem de produção)

#### [P2] Criar seed de demonstração (`pnpm db:seed:demo`)

**Código:** E01-S09 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 4

**História de usuário**

Como pessoa que desenvolve ou testa o Hub+, quero um comando que crie dados de demonstração, para fazer demos, QA e capturas de tela sem usar o banco poluído pelos testes.

**Checklist de critérios de aceitação**

- [ ] O comando é idempotente e só roda fora de produção.
- [ ] Cria contas com e-mail e senha fixos documentados.
- [ ] Substitui o uso do banco poluído por testes automáticos para demonstrações.

**Casos de teste**

*CT-01 — Comando é idempotente*

- **Dado que** um banco que já recebeu o seed de demonstração
- **Quando** pnpm db:seed:demo for executado de novo
- **Então** nenhuma conta, curso ou pedido é duplicado.

*CT-02 — Recusa rodar em produção*

- **Dado que** NODE_ENV=production
- **Quando** pnpm db:seed:demo for executado
- **Então** o comando encerra com uma mensagem de recusa e não altera o banco.

*CT-03 — Contas de demonstração prontas para uso*

- **Dado que** o seed executado em um banco de desenvolvimento
- **Quando** alguém entrar com os e-mails e senhas documentados de mentor, aluno e empresa
- **Então** os três logins funcionam, o mentor tem a carteira aberta e um curso com desafio, e a empresa tem um convite enviado a um talento.


### E02 · Pagamentos reais e financeiro

**Release:** R1 · Piloto fechado · **Prioridade:** P0 Crítica · **11 itens, 52 pontos**

**Objetivo:** Dinheiro entra, é dividido e sai com segurança, rastreabilidade e cobertura legal.

**Por que importa:** A receita do Hub+ e o repasse ao mentor dependem disso. Erro aqui é perda financeira e risco jurídico.

#### [P0] Validar o Stripe ponta a ponta em modo de teste

**Código:** E02-S01 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como time financeiro do Hub+, quero validar o Stripe de ponta a ponta com as chaves de teste, para ter certeza de que compra, falha e reembolso se refletem certo no pedido, na matrícula e no ledger.

**Checklist de critérios de aceitação**

- [ ] A compra com cartão de teste cria o pedido pago, a matrícula e os lançamentos de venda e de retenção pendentes por 7 dias.
- [ ] Um webhook com assinatura inválida é recusado e um evento repetido não duplica lançamentos.
- [ ] Cartão recusado e sessão expirada deixam o pedido sem matrícula e no estado correto.
- [ ] O reembolso estorna o ledger e revoga a matrícula, e o roteiro com os resultados dos quatro cenários está registrado em docs/.

**Casos de teste**

*CT-01 — Compra com cartão de teste*

- **Dado que** PAYMENT_GATEWAY=stripe com chaves de teste e um curso publicado de R$ 199,00
- **Quando** o aluno pagar com o cartão de teste 4242 4242 4242 4242
- **Então** o pedido fica "paid", a matrícula é criada e o ledger recebe os lançamentos "sale" (mentor) e "platform_fee" (Hub+), ambos pendentes por 7 dias.

*CT-02 — Webhook seguro e idempotente*

- **Dado que** o Stripe CLI encaminhando eventos para /webhooks/stripe
- **Quando** um evento com assinatura inválida chegar e depois o mesmo evento válido for entregue duas vezes
- **Então** o primeiro recebe 400 sem alterar nada e o segundo gera um único conjunto de lançamentos no ledger.

*CT-03 — Pagamento recusado e sessão expirada*

- **Dado que** um checkout aberto com o cartão de teste 4000 0000 0000 0002 e outro checkout deixado expirar
- **Quando** os eventos de falha e de expiração forem processados
- **Então** os dois pedidos ficam "failed", nenhum cria matrícula e nenhum lançamento entra no ledger.

*CT-04 — Reembolso estorna e documenta o roteiro*

- **Dado que** um pedido pago e um admin autenticado
- **Quando** o reembolso for feito e o evento charge.refunded chegar
- **Então** os lançamentos do mentor e do Hub+ são estornados, a matrícula some e o roteiro em docs/ lista os quatro cenários com data e resultado.


**Entrega a decisão:** A9: Pix no Stripe Brasil e Stripe Connect para saque automático

#### [P0] Ativar a conta do Stripe em produção

**Código:** E02-S11 · **Tipo:** Task · **Pontos:** 2 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como time financeiro do Hub+, quero a conta do Stripe ativa para cobrar em produção, para poder receber o primeiro pagamento real do piloto.

**Checklist de critérios de aceitação**

- [ ] Conta ativada para cobrar em reais, com a conta bancária do Hub+ cadastrada.
- [ ] Chaves de produção e segredo do webhook guardados no gerenciador de segredos (E01-S06).
- [ ] Métodos de pagamento habilitados conferidos (cartão e, se disponível, Pix).

**Casos de teste**

*CT-01 — Cobrança real de baixo valor*

- **Dado que** a conta ativada, a conta bancária do Hub+ cadastrada e as chaves de produção no ambiente
- **Quando** o time fizer uma compra de teste de R$ 5,00 com um cartão próprio e a reembolsar em seguida
- **Então** o pagamento é aprovado em reais, aparece no painel do Stripe e o estorno é concluído.

*CT-02 — Chaves só no gerenciador de segredos*

- **Dado que** as chaves de produção e o segredo do webhook
- **Quando** o repositório, as imagens e a configuração forem conferidos
- **Então** as chaves não aparecem em nenhum deles e existem apenas no gerenciador de segredos do ambiente de produção.

*CT-03 — Métodos de pagamento conferidos*

- **Dado que** o painel de produção do Stripe
- **Quando** os métodos habilitados forem conferidos
- **Então** o cartão está habilitado e o Pix está habilitado, ou fica registrado em docs/ que ele não está disponível na conta.


#### [P0] Tratar disputas e chargebacks

**Código:** E02-S02 · **Tipo:** Story · **Pontos:** 8 · **Release:** R1 · **Sprint:** 2

**História de usuário**

Como admin do Hub+, quero que uma disputa de cartão bloqueie o saldo relacionado e me avise, para não pagar um repasse que ainda pode ser estornado.

**Checklist de critérios de aceitação**

- [ ] `charge.dispute.created` marca o pedido como em disputa e congela o valor correspondente no saldo do mentor.
- [ ] `charge.dispute.closed` ganha: libera o saldo. Perdida: estorna o ledger do mentor e do Hub+.
- [ ] O admin vê as disputas com prazo de resposta e link para o Stripe.
- [ ] Testes cobrem os dois desfechos.

**Casos de teste**

*CT-01 — Disputa aberta congela o valor*

- **Dado que** um pedido pago de R$ 199,00 cujo saldo do mentor ainda não foi sacado
- **Quando** o evento charge.dispute.created chegar
- **Então** o pedido passa a "em disputa", o valor correspondente sai do saldo do mentor e um pedido de saque desse valor é recusado.

*CT-02 — Disputa ganha libera o saldo*

- **Dado que** um pedido em disputa com o valor congelado
- **Quando** o evento charge.dispute.closed chegar com resultado favorável ao Hub+
- **Então** o valor volta ao saldo do mentor e o pedido volta a "paid".

*CT-03 — Disputa perdida estorna o ledger*

- **Dado que** um pedido em disputa com o valor congelado
- **Quando** o evento charge.dispute.closed chegar com resultado desfavorável
- **Então** os lançamentos do mentor e do Hub+ são estornados em transação única, a matrícula é revogada e o evento repetido não estorna duas vezes.

*CT-04 — Admin vê as disputas com prazo*

- **Dado que** duas disputas abertas, uma com 3 dias para resposta e outra com 10
- **Quando** o admin abrir a tela de disputas
- **Então** ele vê as duas ordenadas pelo prazo mais curto, cada uma com o link para a disputa no painel do Stripe.


**Depende de:** E02-S01 (Validar o Stripe ponta a ponta em modo de teste)

#### [P1] Pagamento assíncrono (Pix e boleto) com pedido pendente na tela

**Código:** E02-S03 · **Tipo:** Story · **Pontos:** 5 · **Release:** R1 · **Sprint:** 6

**História de usuário**

Como aluno, quero acompanhar um pagamento que ainda não foi confirmado e retomá-lo, para não pagar duas vezes pelo mesmo curso.

**Checklist de critérios de aceitação**

- [ ] Página do pedido mostra "aguardando pagamento" com instruções e prazo.
- [ ] Pagamento confirmado depois libera o curso e avisa o aluno.
- [ ] Pedido vencido some da lista de pendentes e permite nova compra.
- [ ] O aluno não consegue abrir dois checkouts do mesmo curso ao mesmo tempo.

**Casos de teste**

*CT-01 — Pedido pendente mostra instruções e prazo*

- **Dado que** um aluno que iniciou um pagamento por Pix e ainda não pagou
- **Quando** ele abrir a página do pedido
- **Então** a página mostra "aguardando pagamento", as instruções para pagar e o prazo de validade.

*CT-02 — Confirmação libera o curso*

- **Dado que** um pedido pendente por Pix
- **Quando** o evento checkout.session.async_payment_succeeded chegar
- **Então** a matrícula é criada, o curso aparece em Meus estudos e o aluno é avisado da confirmação.

*CT-03 — Pedido vencido permite nova compra*

- **Dado que** um Pix cujo prazo venceu
- **Quando** o evento checkout.session.expired chegar e o aluno abrir a página do curso
- **Então** o pedido sai da lista de pendentes e o botão "Comprar curso" volta a funcionar.

*CT-04 — Sem dois checkouts do mesmo curso*

- **Dado que** um pedido pendente do aluno para o curso
- **Quando** ele tentar comprar o mesmo curso de novo
- **Então** a API devolve o checkout já aberto ou responde 409, e nunca cria um segundo pedido pendente.


**Depende de:** E02-S01 (Validar o Stripe ponta a ponta em modo de teste); E04-S02 (Serviço de e-mail com fila e modelos em português)

**Bloqueada pela decisão:** A9: Pix no Stripe Brasil e Stripe Connect para saque automático

#### [P0] Reembolso pelo próprio aluno dentro de 7 dias

**Código:** E02-S04 · **Tipo:** Story · **Pontos:** 8 · **Release:** R1 · **Sprint:** 2

**História de usuário**

Como aluno, quero pedir reembolso sozinho durante a janela de garantia, para exercer o direito de arrependimento sem depender de um admin.

**Checklist de critérios de aceitação**

- [ ] Botão "Pedir reembolso" em Meus estudos enquanto estiver dentro dos 7 dias.
- [ ] O reembolso é feito no Stripe, estorna o ledger e revoga a matrícula automaticamente.
- [ ] O certificado emitido para aquela matrícula é invalidado e a página pública mostra isso.
- [ ] Admin e mentor são avisados; o motivo (opcional) fica registrado.

**Casos de teste**

*CT-01 — Reembolso dentro dos 7 dias*

- **Dado que** uma compra paga há 3 dias com saldo ainda pendente para o mentor
- **Quando** o aluno clicar em "Pedir reembolso" em Meus estudos e confirmar
- **Então** o reembolso é feito no Stripe, os lançamentos de venda e de retenção são estornados, a matrícula é revogada e o curso some de Meus estudos.

*CT-02 — Fora da janela de 7 dias*

- **Dado que** uma compra paga há 8 dias
- **Quando** o aluno abrir Meus estudos ou chamar a API de reembolso
- **Então** o botão não aparece e a API responde 400 explicando que a janela de 7 dias terminou.

*CT-03 — Certificado do reembolso é invalidado*

- **Dado que** um aluno que já recebeu certificado do curso comprado
- **Quando** o reembolso for concluído
- **Então** a página pública /certificado/:code passa a mostrar que o certificado foi invalidado.

*CT-04 — Avisos, motivo e permissão*

- **Dado que** um reembolso concluído com motivo informado e um pedido de outro aluno
- **Quando** os avisos forem enviados e o aluno tentar reembolsar o pedido alheio
- **Então** admin e mentor são avisados, o motivo fica registrado no pedido e o pedido de outro aluno recebe 404.


**Depende de:** E02-S01 (Validar o Stripe ponta a ponta em modo de teste); E04-S02 (Serviço de e-mail com fila e modelos em português)

**Bloqueada pela decisão:** N5: Reembolso depois da janela de 7 dias: política e quem arca

#### [P1] Gravar a taxa real do Stripe em cada pedido

**Código:** E02-S05 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 7

**História de usuário**

Como time financeiro do Hub+, quero gravar a taxa real cobrada pelo Stripe em cada pedido, para comparar com a estimativa descontada do mentor e entender a diferença.

**Checklist de critérios de aceitação**

- [ ] O pedido guarda a taxa real depois da confirmação.
- [ ] Relatório mostra a diferença entre estimado e real por período.
- [ ] Decisão sobre quem cobre a diferença aplicada no ledger (conforme A14).

**Casos de teste**

*CT-01 — Taxa real gravada no pedido*

- **Dado que** um pedido de R$ 199,00 com taxa estimada de R$ 8,33 e taxa real informada pelo Stripe de R$ 8,10
- **Quando** o pagamento for confirmado e a taxa real lida da transação de saldo
- **Então** o pedido guarda a taxa real de R$ 8,10 ao lado da estimada.

*CT-02 — Relatório de diferença por período*

- **Dado que** pedidos pagos em dois meses, com taxas estimada e real diferentes
- **Quando** o admin abrir o relatório de novembro de 2026
- **Então** ele vê a soma estimada, a soma real e a diferença apenas dos pedidos daquele mês.

*CT-03 — Diferença tratada conforme a decisão sobre a taxa*

- **Dado que** a decisão registrada sobre quem cobre a diferença entre estimada e real
- **Quando** um pedido tiver taxa real maior que a estimada
- **Então** o ledger aplica a regra decidida e o valor já creditado ao mentor não muda sem essa regra.


**Depende de:** E02-S01 (Validar o Stripe ponta a ponta em modo de teste)

**Bloqueada pela decisão:** A14: Quem arca com a taxa do Stripe e valores reais da taxa

#### [P1] Pagar saques em lote com exportação CSV e comprovante

**Código:** E02-S06 · **Tipo:** Story · **Pontos:** 5 · **Release:** R1 · **Sprint:** 4

**História de usuário**

Como admin do Hub+, quero exportar os saques pendentes e marcá-los como pagos em lote, para fechar o repasse sem digitar um por um.

**Checklist de critérios de aceitação**

- [ ] Exporta CSV com nome completo, CPF, chave Pix, valor e id do saque.
- [ ] Marcar vários saques como pagos de uma vez, cada um com a data e um comprovante anexado (opcional).
- [ ] Acesso ao CPF completo fica registrado na auditoria.
- [ ] O mentor vê o comprovante no extrato.

**Casos de teste**

*CT-01 — Exportação CSV dos pendentes*

- **Dado que** três saques "requested" e um já "paid"
- **Quando** o admin exportar o CSV
- **Então** o arquivo traz apenas os três pendentes, com nome completo, CPF, chave Pix, valor e id do saque.

*CT-02 — Marcar vários como pagos com comprovante*

- **Dado que** três saques pendentes selecionados e um comprovante anexado a um deles
- **Quando** o admin confirmar "marcar como pagos"
- **Então** os três ficam "paid" com data de pagamento e o mentor vê o comprovante no extrato do saque correspondente.

*CT-03 — Acesso ao CPF auditado*

- **Dado que** a exportação de três saques de mentores diferentes
- **Quando** o CSV for gerado
- **Então** a auditoria registra o acesso ao CPF completo de cada um dos três mentores, com o admin responsável.

*CT-04 — Perfil sem permissão*

- **Dado que** um mentor autenticado
- **Quando** ele chamar a exportação ou o pagamento em lote
- **Então** a API responde 403 e nenhum saque é alterado.


**Depende de:** E03-S10 (Auditar o acesso ao CPF completo)

#### [P1] Trilha de auditoria financeira

**Código:** E02-S07 · **Tipo:** Task · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como time financeiro do Hub+, quero uma trilha de auditoria imutável das ações financeiras do admin, para saber quem pagou, recusou ou reembolsou e por qual valor.

**Checklist de critérios de aceitação**

- [ ] Tabela de auditoria imutável com ator, ação, alvo e dados antes e depois.
- [ ] Toda ação financeira do admin grava um registro dentro da mesma transação.
- [ ] Tela do admin lista e filtra os registros.

**Casos de teste**

*CT-01 — Ação financeira grava auditoria na mesma transação*

- **Dado que** um admin pagando um saque de R$ 150,00
- **Quando** a ação for concluída, e em outra tentativa for desfeita por erro
- **Então** na concluída existe um registro com ator, ação, alvo e dados antes e depois, e na desfeita não sobra nenhum registro.

*CT-02 — Registro não pode ser alterado*

- **Dado que** um registro de auditoria existente
- **Quando** alguém tentar editá-lo ou apagá-lo pela API ou direto com a conta da aplicação no banco
- **Então** a operação é recusada e o registro permanece igual.

*CT-03 — Tela lista e filtra*

- **Dado que** 20 registros de auditoria, 5 deles de reembolso
- **Quando** o admin filtrar por ação "reembolso" e pelo período do mês
- **Então** a tela lista somente os 5 reembolsos do período, e um mentor que abrir a mesma rota recebe 403.


#### [P2] Avaliar repasse automático (Stripe Connect ou alternativa)

**Código:** E02-S08 · **Tipo:** Spike · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como time do Hub+, quero avaliar se o repasse automático vale a pena, para decidir se trocamos o Pix manual por uma solução como o Stripe Connect.

**Checklist de critérios de aceitação**

- [ ] Relatório com disponibilidade, taxas e requisitos de cadastro do mentor.
- [ ] Recomendação registrada em `docs/DECISIONS.md` e história de implementação, se aprovada.

**Casos de teste**

*CT-01 — Relatório de viabilidade completo*

- **Dado que** o spike foi concluído
- **Quando** o relatório for lido
- **Então** ele informa disponibilidade no Brasil, taxas e requisitos de cadastro do mentor para cada alternativa avaliada.

*CT-02 — Recomendação registrada*

- **Dado que** a recomendação aprovada pelo PO
- **Quando** alguém abrir docs/DECISIONS.md
- **Então** há uma decisão com a opção escolhida e o motivo, e, se a troca foi aprovada, uma história de implementação foi criada no backlog.


#### [P1] Recibo de compra por e-mail e na conta do aluno

**Código:** E02-S09 · **Tipo:** Story · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como aluno, quero um comprovante da minha compra por e-mail e na minha conta, para guardar e apresentar quando precisar.

**Checklist de critérios de aceitação**

- [ ] E-mail de confirmação com valor, curso, data e forma de pagamento.
- [ ] Histórico de compras em Meus estudos com download do comprovante.

**Casos de teste**

*CT-01 — E-mail de confirmação da compra*

- **Dado que** uma compra de R$ 199,00 paga com cartão
- **Quando** o pagamento for confirmado
- **Então** o aluno recebe um e-mail com valor, nome do curso, data e forma de pagamento.

*CT-02 — Histórico e download do comprovante*

- **Dado que** um aluno com duas compras pagas
- **Quando** ele abrir o histórico de compras em Meus estudos e baixar o comprovante da segunda
- **Então** a lista mostra as duas compras e o arquivo baixado traz os dados da segunda.

*CT-03 — Comprovante de outro aluno*

- **Dado que** o comprovante de uma compra de outro aluno
- **Quando** um aluno pedir esse comprovante pelo id
- **Então** a API responde 404 e nada é baixado.


**Depende de:** E04-S02 (Serviço de e-mail com fila e modelos em português)

#### [P2] Extrato da carteira com paginação, período e exportação

**Código:** E02-S10 · **Tipo:** Story · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como mentor, quero filtrar e exportar o meu extrato, para conferir as vendas e declarar a renda.

**Checklist de critérios de aceitação**

- [ ] Paginação por cursor e filtro por período e por tipo de lançamento.
- [ ] Exportação em CSV com os mesmos filtros.

**Casos de teste**

*CT-01 — Paginação por cursor*

- **Dado que** um mentor com 120 lançamentos no extrato
- **Quando** ele abrir a primeira página e pedir as seguintes
- **Então** cada página traz lançamentos sem repetir nem pular nenhum e a última página não devolve cursor.

*CT-02 — Filtros de período e tipo*

- **Dado que** lançamentos de vários meses e tipos
- **Quando** o mentor filtrar por novembro de 2026 e tipo "saque"
- **Então** aparecem somente os saques de novembro de 2026.

*CT-03 — Exportação com os mesmos filtros*

- **Dado que** o extrato filtrado por novembro de 2026 e tipo "venda"
- **Quando** o mentor exportar em CSV
- **Então** o arquivo tem exatamente as mesmas linhas e os mesmos valores exibidos na tela.


### E03 · Segurança, privacidade e LGPD

**Release:** R1 · Piloto fechado · **Prioridade:** P0 Crítica · **10 itens, 53 pontos**

**Objetivo:** Dados pessoais e financeiros protegidos e direitos do titular atendidos.

**Por que importa:** Guardamos CPF, chave Pix e dados de jovens. Vazamento ou descumprimento da LGPD ameaça o projeto.

#### [P0] Criptografar CPF e chave Pix em repouso

**Código:** E03-S01 · **Tipo:** Task · **Pontos:** 8 · **Release:** R1 · **Sprint:** 3

**História de usuário**

Como titular dos dados, quero que meu CPF e minha chave Pix fiquem cifrados no banco, para que um vazamento do banco não exponha dados que dão acesso ao meu dinheiro.

**Checklist de critérios de aceitação**

- [ ] CPF e chave Pix gravados com criptografia autenticada (AES-GCM) e chave por ambiente.
- [ ] A unicidade do CPF passa a usar um hash determinístico com segredo próprio.
- [ ] Migração cifra os dados existentes sem perder o vínculo com saques já feitos.
- [ ] Dump do banco não revela CPF nem chave Pix.

**Casos de teste**

*CT-01 — Banco não revela CPF nem Pix*

- **Dado que** um mentor com CPF 123.456.789-09 e chave Pix de e-mail cadastrados
- **Quando** a tabela mentor_accounts for consultada direto no banco, inclusive em um dump
- **Então** CPF e chave Pix aparecem cifrados e nenhum valor em texto puro é encontrado.

*CT-02 — Unicidade do CPF continua valendo*

- **Dado que** um CPF já cadastrado por um mentor
- **Quando** outro mentor tentar abrir a carteira com o mesmo CPF digitado com outra pontuação
- **Então** a API responde 409 "Este CPF já está cadastrado em outra carteira".

*CT-03 — Migração dos dados existentes*

- **Dado que** mentores com carteira aberta e saques anteriores
- **Quando** a migração de cifragem for executada
- **Então** todos os CPFs e chaves ficam cifrados, os saques antigos mantêm o vínculo e o admin continua vendo o CPF completo ao pagar.

*CT-04 — Respostas da API continuam mascaradas*

- **Dado que** um mentor com a carteira aberta
- **Quando** ele chamar GET /me/mentor-account
- **Então** a resposta traz cpfMasked no formato ***.456.789-** e a chave Pix mascarada, sem o valor completo.


**Depende de:** E01-S06 (Gerenciar segredos e variáveis por ambiente)

#### [P0] Sessão segura: token curto, refresh em cookie httpOnly e logout real

**Código:** E03-S02 · **Tipo:** Task · **Pontos:** 8 · **Release:** R1 · **Sprint:** 3

**História de usuário**

Como pessoa que usa o Hub+, quero uma sessão que não fique exposta no navegador e que eu possa encerrar de verdade, para que o roubo de um token ou de um aparelho tenha efeito limitado.

**Checklist de critérios de aceitação**

- [ ] O token de acesso tem curta duração e o refresh token vai em cookie httpOnly, Secure e SameSite.
- [ ] O logout invalida o refresh token no servidor.
- [ ] A troca de senha encerra as outras sessões abertas.
- [ ] O front-end não guarda nenhum token em localStorage.

**Casos de teste**

*CT-01 — Cookie seguro e nada no localStorage*

- **Dado que** um login bem-sucedido
- **Quando** a resposta e o navegador forem inspecionados
- **Então** o refresh token está em cookie httpOnly, Secure e SameSite e o localStorage não contém token algum.

*CT-02 — Token de acesso expirado é renovado*

- **Dado que** um token de acesso expirado e um refresh token válido
- **Quando** o front-end fizer uma requisição autenticada
- **Então** a sessão é renovada sem pedir novo login e a requisição conclui com sucesso.

*CT-03 — Logout invalida o refresh token*

- **Dado que** uma pessoa que fez logout
- **Quando** o refresh token antigo for usado
- **Então** a API responde 401 e nenhum novo token de acesso é emitido.

*CT-04 — Troca de senha derruba as outras sessões*

- **Dado que** a mesma conta logada em dois navegadores
- **Quando** a senha for trocada em um deles
- **Então** o outro navegador recebe 401 na próxima renovação e é levado ao login.


#### [P0] Cabeçalhos de segurança, CSP e limites de corpo

**Código:** E03-S03 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 3

**História de usuário**

Como time do Hub+, quero cabeçalhos de segurança, CSP e CORS restritivo, para reduzir a superfície de ataques comuns de navegador.

**Checklist de critérios de aceitação**

- [ ] Helmet na API e cabeçalhos equivalentes no servidor do front-end.
- [ ] CSP restritiva compatível com Stripe e R2.
- [ ] CORS apenas para as origens do Hub+ e limite de tamanho de corpo por rota.

**Casos de teste**

*CT-01 — Cabeçalhos de segurança presentes*

- **Dado que** uma requisição GET a uma rota da API e à página inicial do front-end
- **Quando** os cabeçalhos da resposta forem lidos
- **Então** constam X-Content-Type-Options nosniff, Strict-Transport-Security e proteção contra enquadramento, e não consta X-Powered-By.

*CT-02 — CSP compatível com Stripe e R2*

- **Dado que** a CSP ativa em staging
- **Quando** uma pessoa fizer um checkout de teste e enviar uma capa para o R2
- **Então** os dois fluxos concluem e o console do navegador não registra violação de CSP.

*CT-03 — CORS só para origens do Hub+*

- **Dado que** uma requisição vinda da origem http://site-malicioso.example
- **Quando** a API a receber
- **Então** a resposta não traz Access-Control-Allow-Origin para essa origem, enquanto a origem oficial do front-end é aceita.

*CT-04 — Limite de tamanho do corpo*

- **Dado que** um corpo JSON de 2 MB enviado a POST /auth/login
- **Quando** a API processar a requisição
- **Então** ela responde 413 sem tentar validar o conteúdo.


#### [P1] Rate limit compartilhado e proteção contra força bruta

**Código:** E03-S04 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 4

**História de usuário**

Como time do Hub+, quero limites de requisição compartilhados entre instâncias e bloqueio contra força bruta, para que as proteções valham mesmo com a API escalada.

**Checklist de critérios de aceitação**

- [ ] Contadores em armazenamento compartilhado (Redis ou Postgres).
- [ ] Login e recuperação de senha com bloqueio progressivo por conta e por IP.
- [ ] Mensagens iguais para conta existente e inexistente.

**Casos de teste**

*CT-01 — Contador compartilhado entre instâncias*

- **Dado que** duas instâncias da API atrás do mesmo balanceador e o limite de 10 logins por minuto
- **Quando** forem feitas 11 tentativas de login em 1 minuto, alternando entre as instâncias
- **Então** a 11ª recebe 429 em qualquer uma das duas.

*CT-02 — Bloqueio progressivo por conta*

- **Dado que** uma conta com 5 tentativas seguidas de senha errada
- **Quando** a 6ª tentativa acontecer, até com a senha certa
- **Então** a API responde 429 com Retry-After e o tempo de espera aumenta a cada nova falha.

*CT-03 — Mensagem igual para conta existente e inexistente*

- **Dado que** um e-mail cadastrado e outro inexistente
- **Quando** o login for tentado com senha errada nos dois
- **Então** a resposta tem o mesmo status 401 e o mesmo texto nos dois casos.


#### [P0] Termos de uso e Política de privacidade com aceite versionado

**Código:** E03-S05 · **Tipo:** Story · **Pontos:** 5 · **Release:** R1 · **Sprint:** 3

**História de usuário**

Como pessoa que se cadastra, quero ler e aceitar os termos e a política de privacidade, para saber como meus dados são usados antes de usar a plataforma.

**Checklist de critérios de aceitação**

- [ ] Páginas públicas de Termos e de Privacidade.
- [ ] Cadastro exige aceite e a API guarda a versão e a data do aceite.
- [ ] Mudança de versão pede novo aceite no próximo acesso.
- [ ] Mentor aceita também os termos de mentoria e repasse (já existe um aceite genérico).

**Casos de teste**

*CT-01 — Páginas públicas de termos e privacidade*

- **Dado que** uma visitante sem login
- **Quando** ela abrir /termos e /privacidade
- **Então** os dois textos aparecem completos, com a versão e a data de vigência.

*CT-02 — Cadastro exige aceite e grava a versão*

- **Dado que** o formulário de cadastro
- **Quando** ele for enviado sem marcar o aceite e depois com o aceite marcado
- **Então** o primeiro envio é bloqueado e o segundo grava a versão e a data do aceite no usuário criado.

*CT-03 — Nova versão pede novo aceite*

- **Dado que** um usuário que aceitou a versão 1
- **Quando** a versão 2 for publicada e ele entrar
- **Então** uma tela de aceite aparece antes de qualquer outra e, ao aceitar, a versão 2 é gravada.

*CT-04 — Mentor aceita os termos de mentoria e repasse*

- **Dado que** um mentor abrindo a carteira
- **Quando** ele enviar o formulário sem aceitar os termos de mentoria e repasse
- **Então** a API responde 400 pedindo o aceite e a carteira não é aberta.


**Depende de:** E13-S02 (Redigir termos, privacidade, mentoria e reembolso com assessoria jurídica)

#### [P1] Direitos do titular: exportar meus dados e excluir minha conta

**Código:** E03-S06 · **Tipo:** Story · **Pontos:** 8 · **Release:** R1 · **Sprint:** 5

**História de usuário**

Como titular dos dados, quero baixar tudo o que o Hub+ guarda sobre mim e pedir a exclusão da minha conta, para exercer os direitos que a LGPD garante.

**Checklist de critérios de aceitação**

- [ ] Exportação em JSON/CSV com perfil, matrículas, entregas, certificados e portfólio.
- [ ] Exclusão anonimiza os dados pessoais e mantém o que a lei exige guardar (ledger, certificados com nome anonimizado).
- [ ] Mentor com saldo ou saque pendente é orientado a resolver antes.
- [ ] Confirmação por senha e registro do pedido.

**Casos de teste**

*CT-01 — Exportação completa e só dos próprios dados*

- **Dado que** um aluno com matrícula, entrega, certificado e item de portfólio
- **Quando** ele pedir a exportação dos seus dados
- **Então** o arquivo contém perfil, matrículas, entregas, certificados e portfólio dele e nenhum dado de outra pessoa.

*CT-02 — Exclusão anonimiza e preserva o que a lei exige*

- **Dado que** um aluno com pedido pago e certificado emitido
- **Quando** ele confirmar a exclusão com a senha
- **Então** nome, e-mail e telefone ficam anonimizados, o login deixa de funcionar, os pedidos e o ledger permanecem sem dado pessoal e o certificado continua válido com o nome anonimizado.

*CT-03 — Mentor com saldo ou saque pendente*

- **Dado que** um mentor com R$ 150,00 disponíveis ou um saque "requested"
- **Quando** ele pedir a exclusão da conta
- **Então** o pedido é bloqueado com a orientação de sacar ou aguardar o pagamento antes.

*CT-04 — Confirmação por senha e registro do pedido*

- **Dado que** um pedido de exclusão com senha errada e outro com a senha certa
- **Quando** os dois forem enviados
- **Então** o primeiro é recusado sem alterar a conta e o segundo fica registrado com data e hora.


#### [P1] Registrar o consentimento do Banco de Talentos

**Código:** E03-S07 · **Tipo:** Story · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como aluno, quero que meu consentimento para aparecer às empresas fique registrado e seja fácil de retirar, para controlar quem vê meu perfil.

**Checklist de critérios de aceitação**

- [ ] Ao ligar a visibilidade, a API grava data e versão do texto aceito.
- [ ] Desligar tem efeito imediato e fica registrado.
- [ ] Convites abertos continuam visíveis para o aluno depois de desligar.

**Casos de teste**

*CT-01 — Consentimento registrado ao ligar*

- **Dado que** um aluno com pelo menos um projeto validado
- **Quando** ele ligar "aparecer para empresas"
- **Então** a API grava a data e a versão do texto de consentimento aceito.

*CT-02 — Revogação com efeito imediato*

- **Dado que** um aluno que aparece na busca de uma empresa
- **Quando** ele desligar a opção
- **Então** ele some imediatamente de GET /talents, GET /talents/:id passa a responder 404 e a revogação fica registrada com data e hora.

*CT-03 — Convites abertos continuam visíveis para o aluno*

- **Dado que** um convite "sent" de uma empresa para o aluno
- **Quando** o aluno desligar a visibilidade
- **Então** ele continua vendo e podendo responder o convite em /invitations.


#### [P2] Limpeza de arquivos órfãos e dados vencidos

**Código:** E03-S08 · **Tipo:** Task · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como time do Hub+, quero limpar arquivos órfãos e dados vencidos automaticamente, para reduzir custo de armazenamento e a quantidade de dados guardados sem necessidade.

**Checklist de critérios de aceitação**

- [ ] Job periódico remove do R2 arquivos sem referência há mais de 7 dias.
- [ ] Convites e tokens vencidos são apagados.
- [ ] Relatório do que foi removido no log.

**Casos de teste**

*CT-01 — Arquivo órfão antigo é removido*

- **Dado que** um objeto no R2 sem nenhuma referência no banco criado há 8 dias
- **Quando** o job de limpeza rodar
- **Então** o objeto é apagado do R2.

*CT-02 — Arquivo recente ou referenciado é preservado*

- **Dado que** um objeto órfão criado há 3 dias e outro, referenciado por uma aula, criado há 30 dias
- **Quando** o job de limpeza rodar
- **Então** nenhum dos dois é apagado.

*CT-03 — Vencidos apagados e relatório no log*

- **Dado que** convites de representante e tokens vencidos
- **Quando** o job de limpeza rodar
- **Então** os registros vencidos são removidos, os válidos permanecem e o log informa quantos itens de cada tipo foram removidos.


#### [P1] Revisão de segurança (OWASP ASVS nível 1) e auditoria de dependências

**Código:** E03-S09 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 5

**História de usuário**

Como time do Hub+, quero uma revisão de segurança antes do piloto e verificação contínua de dependências, para não abrir ao público com falhas conhecidas.

**Checklist de critérios de aceitação**

- [ ] Checklist ASVS nível 1 respondido e achados corrigidos ou aceitos por escrito.
- [ ] `pnpm audit` no CI falha com vulnerabilidade alta ou crítica.
- [ ] Relatório em `docs/`.

**Casos de teste**

*CT-01 — Checklist ASVS nível 1 respondido*

- **Dado que** a revisão de segurança concluída
- **Quando** o checklist for conferido
- **Então** cada item está marcado como atende, não atende ou não se aplica, e cada achado foi corrigido ou aceito por escrito com responsável.

*CT-02 — Auditoria de dependências no CI*

- **Dado que** uma dependência com vulnerabilidade alta ou crítica
- **Quando** o CI rodar pnpm audit
- **Então** o job falha e o pull request não pode ser mesclado.

*CT-03 — Relatório publicado em docs/*

- **Dado que** a revisão concluída
- **Quando** alguém abrir a pasta docs/
- **Então** o relatório está lá com a data, o escopo e a lista de achados com o estado de cada um.


**Depende de:** E01-S01 (Configurar CI no GitHub Actions para API e front-end)

#### [P1] Auditar o acesso ao CPF completo

**Código:** E03-S10 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 4

**História de usuário**

Como titular dos dados, quero que fique registrado quem viu meu CPF e minha chave Pix completos, para poder cobrar responsabilidade em caso de uso indevido.

**Checklist de critérios de aceitação**

- [ ] Cada leitura de CPF ou Pix completo grava ator, alvo e motivo.
- [ ] Tela do admin lista os acessos.

**Casos de teste**

*CT-01 — Leitura do CPF completo gera registro*

- **Dado que** um admin abrindo um saque de um mentor
- **Quando** a API devolver o CPF completo
- **Então** fica registrado quem acessou, de qual mentor, o motivo, e a data e hora.

*CT-02 — Exportação em lote registra um acesso por mentor*

- **Dado que** uma exportação de saques de três mentores
- **Quando** o arquivo for gerado
- **Então** são criados três registros de acesso, um por mentor.

*CT-03 — Tela do admin lista os acessos*

- **Dado que** 5 acessos registrados em dias diferentes
- **Quando** o admin abrir a tela de acessos a dados sensíveis
- **Então** os 5 aparecem do mais recente para o mais antigo, com ator, alvo, motivo e horário.

*CT-04 — Perfil sem permissão não consulta a auditoria*

- **Dado que** um mentor autenticado
- **Quando** ele abrir a rota de auditoria de acessos
- **Então** a API responde 403.


**Depende de:** E03-S01 (Criptografar CPF e chave Pix em repouso)

### E04 · Contas e comunicação

**Release:** R1 · Piloto fechado · **Prioridade:** P0 Crítica · **9 itens, 39 pontos**

**Objetivo:** Recuperar acesso, confirmar e-mail e avisar as pessoas no momento certo.

**Por que importa:** Hoje não há recuperação de senha nem aviso por e-mail. Qualquer piloto gera esses pedidos no primeiro dia.

#### [P0] Escolher o provedor de e-mail transacional

**Código:** E04-S01 · **Tipo:** Spike · **Pontos:** 2 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como time do Hub+, quero comparar provedores de e-mail transacional e escolher um, para que convites, recibos e avisos cheguem na caixa de entrada das pessoas.

**Checklist de critérios de aceitação**

- [ ] Comparativo e recomendação registrada em `docs/DECISIONS.md` (fecha A11).
- [ ] Domínio de envio configurado com SPF, DKIM e DMARC em teste.

**Casos de teste**

*CT-01 — Comparativo completo*

- **Dado que** três provedores avaliados com o mesmo volume de 5.000 e-mails por mês
- **Quando** o comparativo for entregue
- **Então** ele traz custo mensal, entregabilidade no Brasil, limites do plano gratuito e a recomendação de um provedor.

*CT-02 — Decisão registrada*

- **Dado que** a recomendação aprovada pelo responsável do produto
- **Quando** o registro em docs/DECISIONS.md for feito
- **Então** a pendência A11 sai da lista de decisões abertas e aparece como decisão tomada, com data e motivo.

*CT-03 — Domínio autenticado*

- **Dado que** o domínio de envio configurado no provedor escolhido
- **Quando** um e-mail de teste for enviado para uma caixa do Gmail e outra do Outlook
- **Então** o cabeçalho mostra SPF, DKIM e DMARC aprovados e a mensagem chega na caixa de entrada, não no spam.


**Entrega a decisão:** A11: Provedor de e-mail transacional

#### [P0] Serviço de e-mail com fila e modelos em português

**Código:** E04-S02 · **Tipo:** Task · **Pontos:** 8 · **Release:** R1 · **Sprint:** 2

**História de usuário**

Como time do Hub+, quero um serviço único de envio de e-mail com fila e modelos em português, para que nenhum aviso se perca quando o provedor falhar.

**Checklist de critérios de aceitação**

- [ ] Envio assíncrono com fila e nova tentativa com espera crescente.
- [ ] Modelos: boas-vindas, convite de representante, recuperação de senha, recibo, devolutiva, saque pago.
- [ ] Ambiente de desenvolvimento mostra os e-mails sem enviar de verdade.
- [ ] Descadastro onde a lei exigir.

**Casos de teste**

*CT-01 — Envio sem travar a resposta*

- **Dado que** uma pessoa concluindo o cadastro
- **Quando** a API criar a conta
- **Então** a resposta volta sem esperar o provedor e o e-mail de boas-vindas entra na fila de envio.

*CT-02 — Nova tentativa com espera crescente*

- **Dado que** o provedor de e-mail fora do ar
- **Quando** o envio falhar
- **Então** o sistema tenta de novo com intervalos cada vez maiores, o cadastro continua concluído e a falha fica registrada no log.

*CT-03 — Desenvolvimento não envia de verdade*

- **Dado que** o ambiente de desenvolvimento
- **Quando** a empresa gerar um convite de representante
- **Então** o e-mail aparece na caixa de testes local e nenhuma mensagem sai para a internet.

*CT-04 — Modelos e descadastro*

- **Dado que** os seis modelos (boas-vindas, convite de representante, recuperação de senha, recibo, devolutiva e saque pago)
- **Quando** cada um for gerado com dados de exemplo
- **Então** todos saem em português, sem campo em branco, os avisos opcionais trazem o link de descadastro e os de segurança e financeiros não trazem.


**Depende de:** E04-S01 (Escolher o provedor de e-mail transacional)

**Bloqueada pela decisão:** A11: Provedor de e-mail transacional

#### [P0] Recuperar senha pelo e-mail

**Código:** E04-S03 · **Tipo:** Story · **Pontos:** 5 · **Release:** R1 · **Sprint:** 3

**História de usuário**

Como pessoa que esqueceu a senha, quero redefini-la pelo e-mail, para voltar a acessar a plataforma sem pedir ajuda.

**Checklist de critérios de aceitação**

- [ ] "Esqueci minha senha" no login envia um link de uso único que vale por 1 hora.
- [ ] Resposta igual para e-mail existente e inexistente.
- [ ] Nova senha encerra as sessões abertas.
- [ ] Limite de pedidos por e-mail e por IP.

**Casos de teste**

*CT-01 — Mesma resposta para e-mail com e sem conta*

- **Dado que** dois pedidos de "Esqueci minha senha", um com e-mail cadastrado e outro com e-mail sem conta
- **Quando** ambos forem enviados
- **Então** a tela mostra a mesma mensagem nos dois casos e só o e-mail cadastrado recebe o link.

*CT-02 — Link de uso único e validade de 1 hora*

- **Dado que** um link de redefinição já usado, ou emitido há mais de 1 hora
- **Quando** a pessoa abrir o link
- **Então** o sistema informa que o link não é mais válido e não altera a senha.

*CT-03 — Nova senha encerra as sessões*

- **Dado que** a mesma conta logada em dois dispositivos
- **Quando** a senha for redefinida pelo link
- **Então** as duas sessões deixam de funcionar e a pessoa precisa entrar de novo com a senha nova.

*CT-04 — Limite de pedidos*

- **Dado que** um mesmo e-mail
- **Quando** forem feitos 6 pedidos seguidos em 1 minuto
- **Então** a partir do limite a API responde 429 e nenhum e-mail novo é enviado.


**Depende de:** E04-S02 (Serviço de e-mail com fila e modelos em português)

#### [P1] Trocar senha e e-mail dentro da conta

**Código:** E04-S04 · **Tipo:** Story · **Pontos:** 3 · **Release:** R1 · **Sprint:** 6

**História de usuário**

Como pessoa com conta no Hub+, quero trocar minha senha e meu e-mail em Configurações, para manter a conta segura e atualizada.

**Checklist de critérios de aceitação**

- [ ] Troca de senha exige a senha atual.
- [ ] Troca de e-mail confirma pelo novo endereço antes de valer.
- [ ] Aviso de segurança enviado ao e-mail antigo.

**Casos de teste**

*CT-01 — Senha atual errada*

- **Dado que** uma pessoa logada em Configurações
- **Quando** ela tentar trocar a senha informando a senha atual errada
- **Então** a troca é recusada com mensagem clara e a senha continua a mesma.

*CT-02 — Troca de senha*

- **Dado que** a senha atual correta e uma senha nova com 8 caracteres ou mais
- **Quando** a troca for salva
- **Então** a senha muda e um novo login com a senha antiga falha.

*CT-03 — E-mail só vale depois de confirmado*

- **Dado que** um pedido para trocar o e-mail para novo@email.com
- **Quando** a pessoa ainda não tiver aberto o link de confirmação enviado ao novo endereço
- **Então** o login continua funcionando só com o e-mail antigo, e depois da confirmação passa a valer só o novo.

*CT-04 — Aviso ao e-mail antigo*

- **Dado que** uma troca de e-mail confirmada
- **Quando** a mudança for concluída
- **Então** o endereço antigo recebe um aviso de segurança informando a alteração e a data.


**Depende de:** E04-S02 (Serviço de e-mail com fila e modelos em português)

#### [P1] Confirmar o e-mail no cadastro

**Código:** E04-S05 · **Tipo:** Story · **Pontos:** 5 · **Release:** R1

**História de usuário**

Como Hub+, quero confirmar que o e-mail pertence à pessoa que se cadastrou, para evitar contas falsas e garantir a entrega dos avisos.

**Checklist de critérios de aceitação**

- [ ] Link de confirmação enviado no cadastro, com reenvio.
- [ ] Compra, saque e convite exigem e-mail confirmado.
- [ ] Contas antigas recebem um aviso para confirmar.

**Casos de teste**

*CT-01 — Confirmação e reenvio*

- **Dado que** um cadastro novo com e-mail ainda não confirmado
- **Quando** a pessoa pedir o reenvio e abrir o link recebido
- **Então** a conta passa a constar com e-mail confirmado.

*CT-02 — Ações bloqueadas sem confirmação*

- **Dado que** uma conta com e-mail não confirmado
- **Quando** a pessoa tentar comprar um curso, pedir um saque ou enviar um convite
- **Então** a API responde 403 pedindo a confirmação do e-mail e nenhum pedido, saque ou convite é criado.

*CT-03 — Contas antigas recebem aviso*

- **Dado que** uma conta criada antes de a confirmação existir
- **Quando** a pessoa abrir o painel
- **Então** aparece um aviso para confirmar o e-mail, sem impedir a navegação.


**Depende de:** E04-S02 (Serviço de e-mail com fila e modelos em português)

#### [P1] Enviar o convite de representante por e-mail

**Código:** E04-S06 · **Tipo:** Task · **Pontos:** 2 · **Release:** R1 · **Sprint:** 6

**História de usuário**

Como representante principal de uma empresa, quero que o convite chegue por e-mail ao novo representante, para não depender de copiar e enviar o link manualmente.

**Checklist de critérios de aceitação**

- [ ] Convite chega por e-mail ao representante.
- [ ] A tela continua mostrando o link para cópia e o status de entrega.
- [ ] Reenvio gera novo link e invalida o anterior (já existe).

**Casos de teste**

*CT-01 — Convite chega por e-mail*

- **Dado que** o representante principal cadastrando a representante Paula com o e-mail paula@empresa.com
- **Quando** o cadastro for salvo
- **Então** Paula recebe um e-mail com o nome da empresa, o cargo e o link de convite válido por 7 dias.

*CT-02 — Link e status continuam na tela*

- **Dado que** um convite enviado
- **Quando** a empresa abrir Configurações e a aba Equipe
- **Então** ela vê o link para copiar e o status do envio, "enviado" ou "falha no envio".

*CT-03 — Reenvio invalida o link anterior*

- **Dado que** um convite pendente
- **Quando** o representante principal reenviar o convite
- **Então** um novo e-mail chega com um novo link e o link antigo responde "convite inválido ou vencido" ao ser aberto.


**Depende de:** E04-S02 (Serviço de e-mail com fila e modelos em português)

#### [P1] Notificações dentro da plataforma (sino)

**Código:** E04-S07 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como pessoa que usa o Hub+, quero ver dentro da plataforma o que aconteceu comigo, para agir sem depender do e-mail.

**Checklist de critérios de aceitação**

- [ ] Eventos: devolutiva de desafio, entrega recebida, convite, saque pago, certificado emitido, disputa.
- [ ] Sino com contador, lista e marcar como lida.
- [ ] Aparece nos painéis e nunca repete o mesmo evento.

**Casos de teste**

*CT-01 — Evento gera notificação*

- **Dado que** um aluno com uma entrega de desafio enviada
- **Quando** o mentor aprovar a entrega
- **Então** o sino do aluno mostra o contador 1 e a notificação "Sua entrega foi aprovada" com link para o curso.

*CT-02 — Marcar como lida*

- **Dado que** uma pessoa com 3 notificações não lidas
- **Quando** ela abrir a lista e marcar uma como lida
- **Então** o contador cai para 2, a notificação deixa de ficar em destaque e, ao usar "marcar todas como lidas", o contador zera.

*CT-03 — Sem repetição do mesmo evento*

- **Dado que** a aprovação de uma entrega já notificada
- **Quando** o mesmo evento for processado de novo (por exemplo, webhook repetido)
- **Então** continua existindo uma única notificação para aquele evento.

*CT-04 — Cada evento vai para a pessoa certa*

- **Dado que** os eventos devolutiva, entrega recebida, convite, saque pago, certificado emitido e disputa
- **Quando** cada um acontecer
- **Então** a devolutiva, o convite e o certificado vão para o aluno, a entrega recebida e o saque pago para o mentor, e a disputa para o admin.


#### [P2] Preferências de notificação

**Código:** E04-S08 · **Tipo:** Story · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como pessoa que usa o Hub+, quero escolher o que recebo por e-mail e dentro da plataforma, para ser avisada só do que me interessa.

**Checklist de critérios de aceitação**

- [ ] Preferência por tipo e por canal.
- [ ] Avisos de segurança e financeiros não podem ser desligados.

**Casos de teste**

*CT-01 — Desligar e-mail de um tipo*

- **Dado que** um aluno com o e-mail de devolutiva desligado e a notificação interna ligada
- **Quando** o mentor devolver uma entrega
- **Então** a notificação aparece no sino e nenhum e-mail é enviado.

*CT-02 — Desligar a notificação interna*

- **Dado que** um aluno com a notificação interna de convites desligada e o e-mail ligado
- **Quando** uma empresa enviar um convite
- **Então** o e-mail é enviado e o sino não mostra a notificação.

*CT-03 — Avisos obrigatórios não desligam*

- **Dado que** a tela de preferências
- **Quando** a pessoa tentar desligar recuperação de senha ou saque pago
- **Então** os controles aparecem bloqueados com a explicação, e uma chamada direta à API para desligá-los é recusada com 400.


**Depende de:** E04-S07 (Notificações dentro da plataforma (sino)); E04-S02 (Serviço de e-mail com fila e modelos em português)

#### [P1] Avisar por e-mail entrega pendente e devolutiva

**Código:** E04-S09 · **Tipo:** Story · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como mentor, quero saber quando alunos entregam desafios, e como aluno, quero saber quando recebo a devolutiva, para que nenhum lado fique esperando sem saber.

**Checklist de critérios de aceitação**

- [ ] O mentor recebe no máximo um e-mail por dia, com a lista das entregas novas, o nome dos alunos e o link para a tela de correções.
- [ ] O aluno recebe um e-mail quando o mentor aprova a entrega ou pede ajustes, com o comentário do mentor e o link para o desafio.

**Casos de teste**

*CT-01 — Resumo diário ao mentor*

- **Dado que** cinco entregas recebidas ao longo de um dia nos cursos de um mentor
- **Quando** chegar o horário do resumo
- **Então** o mentor recebe um único e-mail com as cinco entregas, os nomes dos alunos e o link para a tela de correções.

*CT-02 — Dia sem entregas*

- **Dado que** um mentor sem nenhuma entrega nova no dia
- **Quando** chegar o horário do resumo
- **Então** nenhum e-mail é enviado.

*CT-03 — Aprovação avisa o aluno*

- **Dado que** uma entrega pendente de correção
- **Quando** o mentor aprovar com o comentário "Excelente trabalho!"
- **Então** o aluno recebe um e-mail com o comentário e o link para o desafio.

*CT-04 — Pedido de ajustes avisa o aluno*

- **Dado que** uma entrega pendente de correção
- **Quando** o mentor pedir ajustes com o texto "Faltou definir os horários de cada post."
- **Então** o aluno recebe um e-mail com esse texto e o link para reenviar a entrega.


**Depende de:** E04-S02 (Serviço de e-mail com fila e modelos em português)

### E05 · Mídia e conteúdo

**Release:** R1 · Piloto fechado · **Prioridade:** P1 Alta · **8 itens, 45 pontos**

**Objetivo:** Vídeos, capas e anexos enviados e entregues de forma confiável, mesmo em conexões ruins.

**Por que importa:** Vídeo é o produto. Upload que falha ou vídeo que trava derruba a avaliação do curso.

#### [P0] Configurar o R2 de produção e testar envio real

**Código:** E05-S01 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como time do Hub+, quero o bucket de produção configurado e testado de ponta a ponta, para que mentores enviem e alunos assistam sem erro no primeiro dia.

**Checklist de critérios de aceitação**

- [ ] CORS libera PUT e GET apenas para as origens do Hub+.
- [ ] Domínio próprio para arquivos públicos (capas) via CDN.
- [ ] Envio real de capa, vídeo e anexo de desafio e leitura pelo player testados.
- [ ] Resultados e configuração registrados em `docs/`.

**Casos de teste**

*CT-01 — CORS só para as origens do Hub+*

- **Dado que** o bucket de produção configurado
- **Quando** uma página de uma origem que não é do Hub+ tentar enviar um arquivo com PUT
- **Então** o navegador bloqueia a chamada, e a mesma chamada feita a partir da origem do Hub+ funciona.

*CT-02 — Capas no domínio próprio*

- **Dado que** uma capa de curso enviada
- **Quando** o catálogo for carregado
- **Então** a imagem vem do domínio próprio de arquivos, não do endereço padrão do R2, e a resposta traz cabeçalho de cache da CDN.

*CT-03 — Envio e leitura reais*

- **Dado que** um mentor no ambiente de produção
- **Quando** ele enviar uma capa, um vídeo MP4 de 200 MB e um anexo PDF de 2 MB
- **Então** os três arquivos aparecem no bucket, o aluno matriculado assiste ao vídeo pela URL assinada e uma URL assinada vencida responde 403.

*CT-04 — Registro do teste*

- **Dado que** os testes concluídos
- **Quando** a documentação for conferida
- **Então** docs/ contém a configuração de CORS e do domínio, a data do teste e o resultado de cada envio.


#### [P1] Upload em partes e com retomada para vídeos grandes

**Código:** E05-S02 · **Tipo:** Task · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como mentor, quero enviar vídeos grandes mesmo com conexão instável, para não perder horas de envio quando a internet cair.

**Checklist de critérios de aceitação**

- [ ] Upload multipart direto ao R2, em partes de tamanho fixo, com URLs assinadas por parte.
- [ ] Retomada depois de queda de conexão e fechamento da aba.
- [ ] Barra de progresso e cancelamento continuam funcionando.

**Casos de teste**

*CT-01 — Vídeo grande em partes*

- **Dado que** um vídeo de 1,5 GB
- **Quando** o mentor arrastar o arquivo para um módulo
- **Então** o envio acontece em partes de tamanho fixo, cada uma com a própria URL assinada, e a aula fica com o vídeo completo.

*CT-02 — Retomada depois de queda de conexão*

- **Dado que** um envio em 60%
- **Quando** a conexão cair por 2 minutos e voltar
- **Então** o envio continua a partir da parte seguinte e reenvia só as partes que faltam.

*CT-03 — Retomada depois de fechar a aba*

- **Dado que** um envio em 40% e a aba fechada
- **Quando** o mentor reabrir o construtor e selecionar o mesmo arquivo
- **Então** o sistema oferece continuar e envia apenas as partes que faltam.

*CT-04 — Cancelamento*

- **Dado que** um envio em andamento
- **Quando** o mentor cancelar
- **Então** o envio para, a barra de progresso some e as partes já enviadas são descartadas do bucket.


**Depende de:** E05-S01 (Configurar o R2 de produção e testar envio real)

#### [P1] Definir o pipeline de vídeo (FFmpeg próprio ou serviço gerenciado)

**Código:** E05-S03 · **Tipo:** Spike · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como time do Hub+, quero comparar processar vídeo no próprio servidor com usar um serviço gerenciado, para decidir com números antes de construir.

**Checklist de critérios de aceitação**

- [ ] Comparativo de custo para 500 horas de vídeo e 5.000 alunos.
- [ ] Recomendação registrada em `docs/DECISIONS.md` (revisa D9 se necessário).
- [ ] Estimativa da implementação.

**Casos de teste**

*CT-01 — Comparativo na mesma base*

- **Dado que** as duas opções avaliadas
- **Quando** o comparativo for feito para 500 horas de vídeo e 5.000 alunos
- **Então** ele traz o custo mensal de armazenamento, processamento e entrega de cada uma, com os mesmos pressupostos.

*CT-02 — Decisão registrada*

- **Dado que** a recomendação aprovada
- **Quando** o registro em docs/DECISIONS.md for feito
- **Então** existe uma nova decisão, a D9 aparece como revisada se a recomendação a mudar e a pendência N6 sai da lista de abertas.

*CT-03 — Estimativa da implementação*

- **Dado que** a opção escolhida
- **Quando** o spike for encerrado
- **Então** a história de processamento de vídeo está estimada em pontos, com os riscos listados.


**Entrega a decisão:** N6: Vídeo: processar no próprio servidor (FFmpeg + R2) ou usar um serviço gerenciado (por exemplo Cloudflare Stream)

#### [P1] Processar o vídeo: MP4/HLS, miniatura e duração no servidor

**Código:** E05-S04 · **Tipo:** Story · **Pontos:** 13 · **Release:** R2

**História de usuário**

Como aluno, quero que o vídeo carregue rápido e ajuste a qualidade à minha conexão, para assistir sem travar no celular.

**Checklist de critérios de aceitação**

- [ ] Todo vídeo enviado é transcodificado em múltiplas qualidades (HLS).
- [ ] Miniatura e duração gerados no servidor, sem confiar no navegador.
- [ ] Aula mostra "processando" até ficar pronta e não pode ser concluída antes.
- [ ] Player alterna qualidade automaticamente.

**Casos de teste**

*CT-01 — Várias qualidades, miniatura e duração*

- **Dado que** um MP4 em 1080p com 10 minutos enviado pelo mentor
- **Quando** o processamento terminar
- **Então** existem versões em pelo menos 3 qualidades (360p, 720p e 1080p), a miniatura foi gerada e a duração salva é de 600 segundos, medida no servidor.

*CT-02 — Aula em processamento*

- **Dado que** um vídeo recém-enviado ainda sendo processado
- **Quando** um aluno abrir a aula
- **Então** a tela mostra "processando", o botão "Concluir aula" fica desabilitado e a API recusa a conclusão dessa aula.

*CT-03 — Troca automática de qualidade*

- **Dado que** um aluno com a conexão limitada a 700 kbit/s
- **Quando** ele assistir ao vídeo
- **Então** o player usa a qualidade de 360p sem pausar por mais de 3 segundos e sobe a qualidade quando a conexão melhora.

*CT-04 — Arquivo que não processa*

- **Dado que** um arquivo de vídeo corrompido
- **Quando** o processamento falhar
- **Então** o mentor vê "falha no processamento" com a opção de reenviar e o aluno não vê a aula como disponível.


**Depende de:** E05-S03 (Definir o pipeline de vídeo (FFmpeg próprio ou serviço gerenciado))

**Bloqueada pela decisão:** N6: Vídeo: processar no próprio servidor (FFmpeg + R2) ou usar um serviço gerenciado (por exemplo Cloudflare Stream)

#### [P2] Materiais complementares por aula

**Código:** E05-S05 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como mentor, quero anexar PDFs e planilhas à aula, e como aluno matriculado, quero baixá-los, para estudar com o material de apoio.

**Checklist de critérios de aceitação**

- [ ] Dropzone de materiais no construtor (PDF, planilha, ZIP, até 25 MB).
- [ ] Download só para matriculados, por URL assinada.
- [ ] Lista de materiais na aba da aula.

**Casos de teste**

*CT-01 — Anexar e listar*

- **Dado que** um mentor no construtor de uma aula
- **Quando** ele arrastar uma planilha .xlsx de 3 MB e um PDF de 2 MB
- **Então** os dois aparecem na aba da aula com nome e tamanho, e o aluno matriculado vê os dois com o botão de baixar.

*CT-02 — Limites de tipo e tamanho*

- **Dado que** um arquivo de 26 MB e outro com extensão .exe
- **Quando** o mentor tentar enviar cada um
- **Então** ambos são recusados com mensagem clara e nada é enviado ao bucket.

*CT-03 — Download só para matriculados*

- **Dado que** um aluno matriculado e outro sem matrícula
- **Quando** cada um pedir o download do material
- **Então** o matriculado recebe uma URL assinada e baixa o arquivo, e o outro recebe 403.


#### [P2] Legendas por aula

**Código:** E05-S06 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno, quero legendas nas aulas, para assistir sem som ou com dificuldade de audição.

**Checklist de critérios de aceitação**

- [ ] Upload de .vtt por aula no construtor.
- [ ] Player mostra a opção de legenda.
- [ ] Validação do formato do arquivo.

**Casos de teste**

*CT-01 — Legenda enviada aparece no player*

- **Dado que** um mentor com um arquivo .vtt em português válido
- **Quando** ele enviar a legenda para uma aula
- **Então** o player da aula passa a mostrar a opção de legenda e, ao ativá-la, o texto aparece sincronizado com o vídeo.

*CT-02 — Arquivo inválido*

- **Dado que** um arquivo .txt e um .vtt sem a linha inicial WEBVTT
- **Quando** o mentor tentar enviar cada um
- **Então** os dois são recusados com mensagem explicando o formato aceito.

*CT-03 — Aula sem legenda*

- **Dado que** uma aula sem arquivo de legenda
- **Quando** o aluno abrir o player
- **Então** a opção de legenda não aparece.


#### [P1] Retomar a aula de onde parou

**Código:** E05-S07 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno, quero voltar ao minuto em que parei, para não precisar procurar de novo o ponto da aula.

**Checklist de critérios de aceitação**

- [ ] Posição do vídeo salva a cada 15 segundos e ao sair.
- [ ] Ao abrir a aula, o player retoma da posição salva.
- [ ] O painel "Continuar estudando" mostra o minuto.

**Casos de teste**

*CT-01 — Posição salva durante a aula*

- **Dado que** um aluno assistindo a uma aula
- **Quando** ele fechar a aba aos 47 segundos e abrir a aula de novo
- **Então** o vídeo retoma por volta dos 45 segundos, com a última posição salva a cada 15 segundos.

*CT-02 — Painel mostra o minuto*

- **Dado que** uma aula parada em 4:35
- **Quando** o aluno abrir o painel
- **Então** o cartão "Continuar estudando" mostra "Parou em 4:35" e o botão leva direto a esse ponto.

*CT-03 — Outro dispositivo*

- **Dado que** a posição 4:35 salva no celular
- **Quando** o aluno abrir a mesma aula no computador
- **Então** o vídeo começa em 4:35.


#### [P2] Excluir do R2 o arquivo substituído ou removido

**Código:** E05-S08 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como time do Hub+, quero apagar do bucket o arquivo que foi substituído ou removido, para não pagar por arquivos que ninguém usa.

**Checklist de critérios de aceitação**

- [ ] Substituição e remoção apagam o objeto anterior depois de confirmar o novo.
- [ ] Falha na exclusão não bloqueia o usuário e é reprocessada.

**Casos de teste**

*CT-01 — Substituir a capa*

- **Dado que** um curso com a capa A
- **Quando** o mentor enviar a capa B e salvar
- **Então** a capa B passa a valer e o arquivo da capa A deixa de existir no bucket.

*CT-02 — Remover aula com vídeo*

- **Dado que** uma aula com vídeo enviado
- **Quando** o mentor remover a aula
- **Então** o arquivo de vídeo é apagado do bucket.

*CT-03 — Novo envio que falha*

- **Dado que** um curso com a capa A
- **Quando** o envio da capa B falhar no meio
- **Então** a capa A continua valendo e nada é apagado.

*CT-04 — Falha ao excluir não trava o usuário*

- **Dado que** o bucket indisponível no momento da exclusão
- **Quando** o mentor substituir a capa
- **Então** a troca termina normalmente e o arquivo antigo entra numa fila e é apagado na próxima tentativa.


### E06 · Experiência de aprendizagem e catálogo

**Release:** R2 · Lançamento público · **Prioridade:** P1 Alta · **9 itens, 54 pontos**

**Objetivo:** O aluno encontra o curso certo, tira dúvidas, avalia e se mantém engajado.

**Por que importa:** Retenção e conversão. Jovens esperam busca boa, avaliações e uso confortável no celular.

#### [P1] Categoria, nível e duração nos cursos, com filtros no catálogo

**Código:** E06-S01 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como aluno, quero filtrar os cursos por área, nível, duração e preço, para encontrar o curso certo sem rolar o catálogo inteiro.

**Checklist de critérios de aceitação**

- [ ] Mentor escolhe categoria e nível no construtor; duração total é calculada pelas aulas.
- [ ] Catálogo filtra por categoria, nível, duração e preço.
- [ ] Filtros ficam na URL e funcionam no celular.

**Casos de teste**

*CT-01 — Mentor define categoria e nível*

- **Dado que** um curso em rascunho no construtor
- **Quando** o mentor escolher a categoria "Social media" e o nível "Iniciante" e salvar
- **Então** os dois aparecem na página do curso e no cartão do catálogo.

*CT-02 — Duração calculada pelas aulas*

- **Dado que** um curso com duas aulas, uma de 12:34 e outra de 17:00
- **Quando** o curso for exibido
- **Então** a duração mostrada é de 29 minutos e 34 segundos, sem campo para o mentor digitar.

*CT-03 — Filtros combinados na URL*

- **Dado que** um catálogo com 10 cursos de áreas, níveis e preços diferentes
- **Quando** o aluno filtrar por "Design", "Iniciante" e "Até R$ 100"
- **Então** só aparecem os cursos que atendem aos três filtros e a URL traz os parâmetros, de modo que abrir o link em outra aba mostra o mesmo resultado.

*CT-04 — Filtros no celular*

- **Dado que** uma tela de 390 px de largura
- **Quando** o aluno abrir os filtros e aplicar um
- **Então** os filtros abrem num painel recolhível, o resultado é atualizado e a página não rola para os lados.


#### [P1] Avaliações e notas dos cursos

**Código:** E06-S02 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como aluno, quero avaliar o curso que fiz e ver a nota de quem já fez, para decidir o que comprar com mais segurança.

**Checklist de critérios de aceitação**

- [ ] Só quem concluiu pelo menos metade do curso pode avaliar, uma vez.
- [ ] Nota média e quantidade no catálogo e na página do curso.
- [ ] Mentor responde publicamente; admin pode ocultar avaliação abusiva.

**Casos de teste**

*CT-01 — Só avalia quem concluiu metade, uma vez*

- **Dado que** um aluno com 40% do curso concluído
- **Quando** ele tentar avaliar
- **Então** a avaliação é bloqueada com a mensagem de que é preciso concluir metade do curso, e com 50% concluídos ela é liberada, mas uma segunda avaliação do mesmo curso é recusada com 409.

*CT-02 — Nota média no catálogo*

- **Dado que** um curso com avaliações de nota 5, 4 e 3
- **Quando** o catálogo e a página do curso forem abertos
- **Então** ambos mostram a média 4,0 e a quantidade de 3 avaliações.

*CT-03 — Resposta do mentor*

- **Dado que** uma avaliação publicada num curso
- **Quando** o mentor dono responder
- **Então** a resposta aparece abaixo da avaliação e outro mentor que tentar responder recebe 403.

*CT-04 — Admin oculta avaliação abusiva*

- **Dado que** uma avaliação com ofensa
- **Quando** o admin ocultá-la
- **Então** ela some da página e a média e a quantidade são recalculadas sem ela.


#### [P1] Dúvidas por aula com resposta do mentor

**Código:** E06-S03 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como aluno, quero perguntar durante a aula e receber a resposta do mentor, para não travar quando tiver uma dúvida.

**Checklist de critérios de aceitação**

- [ ] Aba "Dúvidas" na aula, com threads e respostas.
- [ ] Mentor é notificado e vê as dúvidas sem resposta de todos os cursos.
- [ ] Moderação básica e denúncia de comentário.

**Casos de teste**

*CT-01 — Aluno pergunta e o mentor é avisado*

- **Dado que** um aluno matriculado numa aula
- **Quando** ele postar uma dúvida na aba "Dúvidas"
- **Então** a dúvida aparece na lista da aula e o mentor recebe uma notificação.

*CT-02 — Fila de dúvidas sem resposta*

- **Dado que** três dúvidas sem resposta em dois cursos do mesmo mentor
- **Quando** ele abrir "Dúvidas sem resposta"
- **Então** as três aparecem juntas e, ao responder uma, ela sai da fila.

*CT-03 — Quem não é matriculado não pergunta*

- **Dado que** uma pessoa sem matrícula no curso
- **Quando** ela tentar postar uma dúvida
- **Então** a API responde 403 e nada é publicado.

*CT-04 — Denúncia e moderação*

- **Dado que** um comentário ofensivo numa aula
- **Quando** outro aluno o denunciar e o admin o ocultar
- **Então** a denúncia entra na fila do admin e, depois de ocultado, o comentário deixa de aparecer para os alunos.


**Depende de:** E04-S07 (Notificações dentro da plataforma (sino))

#### [P2] Anotações pessoais por aula

**Código:** E06-S04 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno, quero anotar durante a aula marcando o minuto, para voltar depois exatamente ao trecho que importa.

**Checklist de critérios de aceitação**

- [ ] Anotações privadas por aula, com marcação de tempo que leva ao ponto do vídeo.
- [ ] Lista de todas as minhas anotações por curso.

**Casos de teste**

*CT-01 — Anotação guarda o minuto*

- **Dado que** o vídeo parado em 4:35
- **Quando** o aluno salvar a anotação "revisar calendário"
- **Então** a anotação fica gravada com a marcação 4:35.

*CT-02 — Clicar no tempo leva ao trecho*

- **Dado que** uma anotação marcada em 4:35
- **Quando** o aluno clicar na marcação
- **Então** o player vai para 4:35 daquela aula.

*CT-03 — Anotação é privada*

- **Dado que** uma anotação do aluno A
- **Quando** o aluno B ou o mentor tentarem abri-la
- **Então** a API não devolve a anotação e responde 404.

*CT-04 — Lista por curso*

- **Dado que** cinco anotações em três aulas de um curso
- **Quando** o aluno abrir "Minhas anotações" do curso
- **Então** as cinco aparecem ordenadas por aula e por tempo.


#### [P2] Certificado em PDF e compartilhamento

**Código:** E06-S05 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno, quero baixar o certificado em PDF e compartilhar no LinkedIn, para mostrar minha formação a quem me contrata.

**Checklist de critérios de aceitação**

- [ ] PDF gerado no servidor com os mesmos dados da página pública e QR code de validação.
- [ ] Botão "Adicionar ao LinkedIn" com os dados preenchidos.
- [ ] Certificado invalidado por reembolso mostra o aviso na página pública.

**Casos de teste**

*CT-01 — PDF com os dados e o QR code*

- **Dado que** um certificado com o código HUB-AB12-CD34
- **Quando** o aluno baixar o PDF
- **Então** o arquivo é A4 paisagem com nome do aluno, curso, mentor, carga horária, data e código, e o QR code abre a página pública de validação desse código.

*CT-02 — Compartilhar no LinkedIn*

- **Dado que** um certificado emitido
- **Quando** o aluno clicar em "Adicionar ao LinkedIn"
- **Então** abre o formulário de certificação do LinkedIn já com o nome do curso, a organização Hub+, a data, o código e o link de validação preenchidos.

*CT-03 — Certificado invalidado por reembolso*

- **Dado que** um certificado cuja compra foi reembolsada dentro dos 7 dias
- **Quando** a página pública do código for aberta e o PDF for pedido de novo
- **Então** a página mostra o aviso de que o certificado foi invalidado por reembolso e o PDF não é gerado.


**Depende de:** E02-S04 (Reembolso pelo próprio aluno dentro de 7 dias)

#### [P1] Busca de cursos no servidor com tolerância a erro de digitação

**Código:** E06-S06 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno, quero que a busca ache o curso mesmo se eu errar a digitação ou esquecer o acento, para não achar que o curso não existe.

**Checklist de critérios de aceitação**

- [ ] Busca no servidor com paginação, por título, descrição e mentor.
- [ ] Tolerância a acento e pequenos erros.
- [ ] O catálogo deixa de baixar todos os cursos de uma vez.

**Casos de teste**

*CT-01 — Ignora acento e maiúscula*

- **Dado que** o curso "Edição de Vídeo para Reels"
- **Quando** o aluno buscar "edicao de video"
- **Então** o curso aparece no resultado.

*CT-02 — Tolera erro de digitação*

- **Dado que** o curso "Fotografia com Celular"
- **Quando** o aluno buscar "fotografa"
- **Então** o curso aparece no resultado.

*CT-03 — Busca por mentor e descrição*

- **Dado que** cursos da mentora Ana Souza e um curso cuja descrição tem a palavra "calendário"
- **Quando** o aluno buscar "Ana Souza" e depois "calendário"
- **Então** a primeira busca traz os cursos dela e a segunda traz o curso com a palavra na descrição.

*CT-04 — Paginação no servidor*

- **Dado que** um catálogo com 60 cursos
- **Quando** o aluno abrir o catálogo
- **Então** a primeira resposta da API traz só 12 cursos, há a opção de carregar mais e a rede não baixa os 60 de uma vez.


#### [P2] App instalável (PWA) e ajustes de celular

**Código:** E06-S07 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno que usa o celular, quero instalar o Hub+ na tela inicial e usá-lo com conforto, para estudar sem abrir o navegador toda vez.

**Checklist de critérios de aceitação**

- [ ] Manifesto, ícones e service worker para instalar na tela inicial.
- [ ] Alvos de toque de pelo menos 44 px e teclado virtual sem cobrir campos.
- [ ] Player funciona em retrato e paisagem.

**Casos de teste**

*CT-01 — Instalação na tela inicial*

- **Dado que** o Hub+ aberto no Chrome do Android
- **Quando** a pessoa escolher instalar
- **Então** o ícone aparece na tela inicial, o app abre em tela cheia sem a barra do navegador e a verificação de instalabilidade do Lighthouse passa.

*CT-02 — Alvos de toque de 44 px*

- **Dado que** as telas de login, catálogo e player numa largura de 390 px
- **Quando** os botões e links forem medidos
- **Então** todos têm pelo menos 44 por 44 px.

*CT-03 — Teclado virtual não cobre o campo*

- **Dado que** o formulário de entrega de desafio num iPhone e num Android
- **Quando** a pessoa tocar no campo de texto
- **Então** o campo e o botão de enviar continuam visíveis acima do teclado.

*CT-04 — Player em retrato e paisagem*

- **Dado que** um vídeo em reprodução no celular
- **Quando** a pessoa girar o aparelho
- **Então** o player ocupa a tela sem cortar o vídeo e os controles continuam alcançáveis nas duas orientações.


#### [P2] Recomendar cursos pelos interesses e histórico

**Código:** E06-S08 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno, quero sugestões de cursos que combinem comigo, para saber o que estudar depois sem procurar no catálogo todo.

**Checklist de critérios de aceitação**

- [ ] "Cursos para você" usa interesses do onboarding e cursos concluídos.
- [ ] Cursos já comprados nunca aparecem na sugestão.

**Casos de teste**

*CT-01 — Sugestões seguem os interesses*

- **Dado que** um aluno com os interesses "Social media" e "Design gráfico" e nenhuma compra
- **Quando** ele abrir o painel
- **Então** os primeiros cursos de "Cursos para você" são dessas duas áreas.

*CT-02 — Histórico influencia*

- **Dado que** um aluno que concluiu um curso de "Social media" nível Iniciante
- **Quando** ele abrir o painel
- **Então** as sugestões incluem cursos da mesma área em nível mais avançado.

*CT-03 — Curso comprado nunca aparece*

- **Dado que** um aluno matriculado em dois cursos
- **Quando** ele abrir o painel
- **Então** nenhum dos dois cursos aparece em "Cursos para você".

*CT-04 — Sem dados, mostra os mais recentes*

- **Dado que** um aluno novo sem interesses e sem histórico
- **Quando** ele abrir o painel
- **Então** a seção mostra os cursos publicados mais recentemente.


**Depende de:** E06-S01 (Categoria, nível e duração nos cursos, com filtros no catálogo)

#### [P2] Página pública do mentor

**Código:** E06-S09 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno, quero conhecer o mentor antes de comprar o curso, para confiar em quem vai me ensinar.

**Checklist de critérios de aceitação**

- [ ] Página com bio, áreas, cursos publicados e notas.
- [ ] O mentor controla o que aparece.
- [ ] Link da página no detalhe do curso.

**Casos de teste**

*CT-01 — Conteúdo da página*

- **Dado que** a mentora Ana Souza com 2 cursos publicados e 1 em rascunho
- **Quando** um visitante abrir a página pública dela
- **Então** aparecem a bio, as áreas, os 2 cursos publicados e a nota média, e o rascunho não aparece.

*CT-02 — O mentor controla o que aparece*

- **Dado que** a mentora com a exibição das áreas de atuação desligada
- **Quando** um visitante abrir a página dela
- **Então** as áreas não aparecem, e CPF, chave Pix e telefone nunca aparecem em nenhuma hipótese.

*CT-03 — Link no detalhe do curso*

- **Dado que** a página de um curso da Ana Souza
- **Quando** o aluno clicar no nome da mentora
- **Então** abre a página pública dela.


**Depende de:** E06-S02 (Avaliações e notas dos cursos)

### E07 · Mentores e curadoria

**Release:** R2 · Lançamento público · **Prioridade:** P1 Alta · **7 itens, 51 pontos**

**Objetivo:** Mentores confiáveis, cursos com qualidade e ferramentas para o mentor crescer.

**Por que importa:** A qualidade do catálogo e a confiança nos repasses dependem de verificar e apoiar quem ensina.

#### [P1] Verificação de identidade do mentor

**Código:** E07-S01 · **Tipo:** Story · **Pontos:** 13 · **Release:** R2

**História de usuário**

Como Hub+, quero verificar a identidade de quem recebe repasses, para reduzir fraude e proteger alunos e mentores.

**Checklist de critérios de aceitação**

- [ ] Fluxo de envio de documento e selfie (ou checagem do CPF), com estados "em análise", "verificado" e "recusado".
- [ ] Fila de revisão do admin com motivo da recusa.
- [ ] Saque liberado só para mentor verificado.
- [ ] Documentos guardados cifrados e com prazo de retenção.

**Casos de teste**

*CT-01 — Envio dos documentos*

- **Dado que** um mentor com a carteira aberta e sem verificação
- **Quando** ele enviar a foto do documento e a selfie
- **Então** o estado passa a "em análise" e o pedido aparece na fila de revisão do admin.

*CT-02 — Aprovar e recusar com motivo*

- **Dado que** um pedido na fila de revisão
- **Quando** o admin recusar com o motivo "Foto do documento ilegível" e, depois de um reenvio, aprovar
- **Então** o mentor vê "recusado" com o motivo e pode reenviar, e depois da aprovação o estado vira "verificado".

*CT-03 — Saque só para mentor verificado*

- **Dado que** um mentor com R$ 100,00 disponíveis
- **Quando** ele pedir saque antes e depois da verificação
- **Então** antes, a API responde 403 explicando que a verificação é necessária, e depois, o saque é criado com 201.

*CT-04 — Documentos protegidos*

- **Dado que** documentos de verificação guardados
- **Quando** o armazenamento for inspecionado e o prazo de retenção definido na política vencer
- **Então** os arquivos estão cifrados, só o admin revisor consegue abri-los e, vencido o prazo, são apagados.


**Depende de:** E03-S01 (Criptografar CPF e chave Pix em repouso)

**Bloqueada pela decisão:** A13: Verificação de identidade do mentor e antifraude de saque

#### [P1] Aprovação de curso pelo admin antes de publicar

**Código:** E07-S02 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como Hub+, quero revisar o curso antes de ele ir ao catálogo, para manter a qualidade do que é vendido.

**Checklist de critérios de aceitação**

- [ ] Mentor envia o curso para revisão e acompanha o estado.
- [ ] Admin aprova ou recusa com motivo, e o mentor é avisado.
- [ ] Curso já publicado continua no ar enquanto a edição passa por revisão.

**Casos de teste**

*CT-01 — Envio para revisão*

- **Dado que** um curso em rascunho com todos os itens obrigatórios do checklist
- **Quando** o mentor enviar para revisão
- **Então** o estado vira "em revisão", o mentor acompanha o andamento e o curso não aparece no catálogo.

*CT-02 — Aprovação e recusa*

- **Dado que** um curso em revisão na fila do admin
- **Quando** o admin recusar com um motivo e, depois do ajuste, aprovar
- **Então** o mentor é avisado nas duas decisões, vê o motivo da recusa e, após a aprovação, o curso aparece no catálogo.

*CT-03 — Curso no ar continua no ar durante a revisão*

- **Dado que** um curso publicado e vendável
- **Quando** o mentor editar o título e enviar a edição para revisão
- **Então** a versão antiga continua no catálogo e à venda até a aprovação.


**Bloqueada pela decisão:** N2: Curso passa por aprovação do admin antes de publicar, ou é publicado direto e revisado depois?

#### [P2] Cupons de desconto criados pelo mentor

**Código:** E07-S03 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como mentor, quero criar cupons de desconto para o meu curso, para promover uma turma sem perder a clareza do que vou receber.

**Checklist de critérios de aceitação**

- [ ] Cupom por percentual ou valor, com validade, limite de usos e curso alvo.
- [ ] A divisão do valor (retenção, gateway, mentor) é calculada sobre o preço com desconto.
- [ ] Prévia de ganhos mostra o efeito do cupom.
- [ ] Relatório de uso por cupom.

**Casos de teste**

*CT-01 — Cupom aplicado no checkout*

- **Dado que** um cupom de 20% para um curso de R$ 199,00, válido por 7 dias
- **Quando** um aluno aplicar o cupom no checkout
- **Então** o total passa a ser R$ 159,20 e o pedido grava o desconto aplicado.

*CT-02 — Divisão sobre o preço com desconto*

- **Dado que** um pedido de R$ 159,20 com retenção de 20% e taxa estimada de gateway de 3,99% mais R$ 0,39
- **Quando** o pagamento for confirmado
- **Então** o ledger lança R$ 31,84 para o Hub+ e R$ 120,62 para o mentor, e a taxa estimada de R$ 6,74 fica registrada no pedido.

*CT-03 — Limites do cupom*

- **Dado que** um cupom com limite de 2 usos, outro vencido e outro de um curso diferente
- **Quando** um aluno tentar usar cada um
- **Então** o primeiro é recusado depois do segundo uso por estar esgotado, o vencido e o de outro curso são recusados com a razão, e o preço original continua.

*CT-04 — Prévia de ganhos e relatório*

- **Dado que** o mentor criando o cupom
- **Quando** ele definir o desconto e depois abrir o relatório do cupom
- **Então** a prévia mostra quanto ele recebe por venda com o desconto e o relatório lista quantos usos, quanto vendeu e quanto recebeu.


#### [P2] Desempenho por curso no painel do mentor

**Código:** E07-S04 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como mentor, quero ver onde os alunos abandonam meu curso, para melhorar as aulas que mais perdem gente.

**Checklist de critérios de aceitação**

- [ ] Por curso: vendas, conclusão, nota, tempo médio e aula em que mais abandonam.
- [ ] Gráficos em escala correta e filtro por período.

**Casos de teste**

*CT-01 — Taxa de conclusão*

- **Dado que** um curso com 10 matrículas e 4 alunos que concluíram
- **Quando** o mentor abrir o desempenho do curso
- **Então** a taxa de conclusão mostrada é de 40%, ao lado das vendas, da nota e do tempo médio.

*CT-02 — Aula com mais abandono*

- **Dado que** 10 alunos, dos quais 8 concluíram a aula 1, 5 a aula 2 e 2 a aula 3
- **Quando** o mentor abrir o desempenho
- **Então** a aula 3 é apontada como a de maior queda, de 5 para 2 alunos.

*CT-03 — Filtro por período*

- **Dado que** vendas em outubro e em novembro
- **Quando** o mentor filtrar por novembro
- **Então** vendas, conclusão e gráficos passam a considerar só novembro.

*CT-04 — Gráfico em escala correta*

- **Dado que** um gráfico de barras com os valores 2, 4 e 8
- **Quando** ele for exibido
- **Então** a barra de 8 tem o dobro da altura da de 4 e o quádruplo da de 2, e um valor 0 aparece como uma barra mínima visível.


#### [P1] Editar curso com alunos matriculados sem quebrar o progresso

**Código:** E07-S05 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como mentor, quero adicionar aulas a um curso que já vendi sem prejudicar quem já estuda, para manter o curso atualizado.

**Checklist de critérios de aceitação**

- [ ] Aulas novas entram para quem já está matriculado e o progresso é recalculado.
- [ ] Alunos que já concluíram são avisados e o certificado emitido continua válido.
- [ ] Remover aula com progresso pede confirmação e preserva o histórico.

**Casos de teste**

*CT-01 — Aula nova entra para quem já está matriculado*

- **Dado que** um aluno com as 3 aulas do curso concluídas e um certificado emitido
- **Quando** o mentor adicionar a aula 4
- **Então** o progresso do aluno passa a 75% (3 de 4), o curso volta a "em andamento" no painel dele e o certificado já emitido continua válido.

*CT-02 — Aviso a quem já concluiu*

- **Dado que** alunos que concluíram o curso
- **Quando** o mentor publicar a aula nova
- **Então** cada um deles recebe o aviso de que há uma aula nova.

*CT-03 — Remover aula com progresso*

- **Dado que** uma aula já concluída por 12 alunos
- **Quando** o mentor tentar removê-la
- **Então** o sistema pede confirmação informando os 12 alunos afetados e, confirmada a remoção, o histórico de conclusão é preservado e o progresso é recalculado sem a aula.


#### [P2] Arquivar e excluir curso respeitando matrículas e vendas

**Código:** E07-S06 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como mentor, quero tirar um curso do catálogo sem prejudicar quem comprou, para encerrar vendas e continuar atendendo meus alunos.

**Checklist de critérios de aceitação**

- [ ] Arquivar esconde do catálogo e mantém o acesso de quem comprou.
- [ ] Excluir só é permitido sem vendas.
- [ ] Curso arquivado pode ser restaurado.

**Casos de teste**

*CT-01 — Arquivar mantém o acesso*

- **Dado que** um curso com 5 alunos matriculados
- **Quando** o mentor arquivar o curso
- **Então** ele some do catálogo e da busca e os 5 alunos continuam assistindo normalmente.

*CT-02 — Excluir só sem vendas*

- **Dado que** um curso com 1 venda e outro sem nenhuma
- **Quando** o mentor tentar excluir os dois
- **Então** o curso com venda responde 409 sugerindo arquivar e o curso sem venda é excluído.

*CT-03 — Restaurar curso arquivado*

- **Dado que** um curso arquivado
- **Quando** o mentor restaurar
- **Então** o curso volta ao catálogo com os mesmos dados, preço e endereço.


#### [P3] Co-autoria e divisão de receita entre mentores

**Código:** E07-S07 · **Tipo:** Spike · **Pontos:** 3 · **Release:** R3

**História de usuário**

Como time do Hub+, quero entender como um curso com mais de um mentor funcionaria, para decidir se vale construir antes de mexer na carteira e no certificado.

**Checklist de critérios de aceitação**

- [ ] Proposta de modelo de dados e de divisão no ledger.
- [ ] Impacto em carteira, certificado e correções.

**Casos de teste**

*CT-01 — Modelo de dados e ledger*

- **Dado que** um curso com dois mentores, divididos em 60% e 40% do valor do mentor
- **Quando** a proposta for descrita
- **Então** o documento traz as tabelas e campos novos e mostra que uma venda de R$ 199,00 gera lançamentos separados para cada mentor e para o Hub+, somando exatamente R$ 199,00.

*CT-02 — Impacto nas outras áreas*

- **Dado que** a proposta de co-autoria
- **Quando** o documento for revisado
- **Então** ele explica o que muda na carteira, em qual nome o certificado é assinado e quem corrige as entregas, com os riscos de cada ponto.

*CT-03 — Decisão registrada*

- **Dado que** a recomendação do spike
- **Quando** ela for aprovada ou recusada
- **Então** o resultado fica registrado em docs/DECISIONS.md e, se aprovada, existe uma história de implementação estimada.


### E08 · Banco de Talentos e empresas

**Release:** R3 · Receita corporativa · **Prioridade:** P2 Média · **8 itens, 68 pontos**

**Objetivo:** Do convite à contratação, com planos, vagas, mensagens e a taxa de intermediação.

**Por que importa:** É o segundo modelo de receita e o resultado que o público jovem busca (emprego).

#### [P2] Vagas: empresa publica, talento se candidata

**Código:** E08-S01 · **Tipo:** Story · **Pontos:** 13 · **Release:** R3

**História de usuário**

Como empresa com cadastro completo, quero publicar uma vaga e receber candidaturas dos talentos, para escolher entre quem se interessou e não depender só de convites que eu envio.

**Checklist de critérios de aceitação**

- [ ] Empresa cria e encerra vagas com requisitos, local e modalidade.
- [ ] Aluno vê vagas compatíveis e se candidata com o portfólio.
- [ ] Empresa acompanha as candidaturas por etapa.

**Casos de teste**

*CT-01 — Empresa publica uma vaga*

- **Dado que** uma empresa com cadastro completo na tela de vagas
- **Quando** ela preencher título "Estágio em social media", requisitos, local "Aracaju/SE" e modalidade "híbrido" e publicar
- **Então** a vaga aparece em "Minhas vagas" como aberta, com os dados informados, e é gravada para a empresa dona.

*CT-02 — Empresa encerra uma vaga*

- **Dado que** uma vaga aberta com 2 candidaturas recebidas
- **Quando** a empresa encerrar a vaga
- **Então** a vaga passa a "encerrada", deixa de aparecer para os alunos e as 2 candidaturas continuam visíveis para a empresa.

*CT-03 — Aluno vê só vagas compatíveis e se candidata*

- **Dado que** um aluno com interesse em "Social media" e um projeto validado, e duas vagas abertas, uma de social media e uma de programação
- **Quando** ele abrir a lista de vagas e se candidatar à de social media
- **Então** a lista mostra só a vaga de social media, a candidatura é criada anexando o portfólio validado e uma segunda candidatura à mesma vaga é recusada com status 409.

*CT-04 — Empresa acompanha candidaturas por etapa*

- **Dado que** uma vaga aberta com uma candidatura na etapa "recebida"
- **Quando** a empresa mover a candidatura para "entrevista" e depois para "contratado"
- **Então** cada mudança de etapa fica registrada com data e hora, e a candidatura aparece na coluna da etapa nova do quadro da vaga.


#### [P2] Modelar os planos e limites das empresas

**Código:** E08-S02 · **Tipo:** Story · **Pontos:** 5 · **Release:** R3

**História de usuário**

Como Hub+, quero aplicar planos com limite de perfis para cada empresa, para organizar o acesso ao Banco de Talentos e ter uma receita previsível.

**Checklist de critérios de aceitação**

- [ ] Planos e limites de perfis por mês definidos (fecha A10), sem selos, que ficam para o pós-MVP.
- [ ] A API aplica o limite e a tela mostra o uso.
- [ ] Empresa sem plano mantém o acesso do período de experiência definido.

**Casos de teste**

*CT-01 — Planos e limites registrados*

- **Dado que** a decisão A10 respondida pelo responsável do produto
- **Quando** o item for entregue
- **Então** docs/DECISIONS.md registra os planos Essencial, Avançado e Premium e o limite mensal de perfis de cada um, e o item A10 sai da lista de pendências. Os selos não fazem parte desta entrega.

*CT-02 — API aplica o limite do plano*

- **Dado que** uma empresa no plano Essencial com limite de 30 perfis abertos por mês (valor de exemplo até a decisão A10) que já abriu 30 perfis
- **Quando** ela abrir o perfil de um 31º talento
- **Então** a API devolve status 403 com a mensagem de limite atingido, e o contador do mês continua em 30.

*CT-03 — Tela mostra o uso do plano*

- **Dado que** a mesma empresa com 12 perfis abertos no mês
- **Quando** ela abrir o Banco de Talentos
- **Então** a faixa do plano mostra "12 de 30" perfis e a data em que o contador zera.

*CT-04 — Empresa sem plano no período de experiência*

- **Dado que** uma empresa recém-cadastrada sem plano contratado e dentro do período de experiência definido
- **Quando** ela buscar talentos, e depois o período terminar
- **Então** durante o período a busca funciona normalmente, e depois dele a API devolve 403 com orientação para escolher um plano.


**Bloqueada pela decisão:** A10: Planos corporativos: limites de perfis e preços (os selos ficam para o pós-MVP)

#### [P2] Cobrança recorrente dos planos

**Código:** E08-S03 · **Tipo:** Story · **Pontos:** 13 · **Release:** R3

**História de usuário**

Como empresa, quero assinar e pagar o plano do Banco de Talentos de forma recorrente, para manter o acesso sem precisar renovar à mão todo mês.

**Checklist de critérios de aceitação**

- [ ] Assinatura com Stripe Billing, troca e cancelamento de plano.
- [ ] Falha de pagamento rebaixa o acesso depois de um prazo e avisa.
- [ ] Notas e recibos da assinatura.

**Casos de teste**

*CT-01 — Assinatura de um plano*

- **Dado que** uma empresa sem plano na página de planos
- **Quando** ela assinar o plano Avançado com um cartão de teste do Stripe
- **Então** a assinatura fica ativa, o limite de perfis do Avançado passa a valer e a data da próxima cobrança aparece nas configurações.

*CT-02 — Troca e cancelamento de plano*

- **Dado que** uma empresa com assinatura ativa do plano Avançado
- **Quando** ela trocar para o Premium e depois cancelar
- **Então** o limite do Premium vale logo após a troca, e o cancelamento mantém o acesso até o fim do período já pago e não gera nova cobrança.

*CT-03 — Falha de pagamento rebaixa depois do prazo*

- **Dado que** uma assinatura ativa cujo cartão foi recusado na renovação
- **Quando** o Stripe enviar a falha de pagamento e passarem 7 dias sem regularização (prazo de exemplo)
- **Então** a empresa recebe um aviso no dia da falha e outro antes do rebaixamento, e depois do prazo o acesso volta ao nível sem plano.

*CT-04 — Recibo de cada cobrança*

- **Dado que** uma cobrança de assinatura paga com sucesso
- **Quando** a empresa abrir o histórico de cobranças
- **Então** o recibo da cobrança está disponível para baixar com valor, período e dados do CNPJ.


**Depende de:** E08-S02 (Modelar os planos e limites das empresas)

**Bloqueada pela decisão:** A10: Planos corporativos: limites de perfis e preços (os selos ficam para o pós-MVP)

#### [P2] Taxa de intermediação sobre a contratação

**Código:** E08-S04 · **Tipo:** Story · **Pontos:** 13 · **Release:** R3

**História de usuário**

Como Hub+, quero registrar a contratação feita pela plataforma e cobrar a taxa combinada, para que o trabalho de intermediação gere receita de forma transparente para as duas partes.

**Checklist de critérios de aceitação**

- [ ] Registro da contratação com valor e data, validado pelas duas partes.
- [ ] Cálculo e cobrança da taxa conforme A12.
- [ ] Relatório de contratações e receita de intermediação.

**Casos de teste**

*CT-01 — Empresa registra a contratação*

- **Dado que** um convite aceito pelo talento
- **Quando** a empresa registrar a contratação com salário de R$ 2.000,00 e data de início 01/12/2026
- **Então** a contratação fica "aguardando confirmação do talento" e nenhuma taxa é cobrada ainda.

*CT-02 — Talento confirma e a taxa é calculada*

- **Dado que** uma contratação aguardando confirmação e o percentual definido em A12 (exemplo de 10%)
- **Quando** o talento confirmar o valor e a data
- **Então** a contratação passa a "validada", a taxa de R$ 200,00 é calculada sobre o salário informado e a cobrança é emitida para a empresa.

*CT-03 — Talento contesta o valor*

- **Dado que** uma contratação registrada pela empresa com salário diferente do real
- **Quando** o talento recusar o valor informado
- **Então** a contratação vai para "em análise", nenhuma taxa é cobrada e o admin recebe o caso para decidir.

*CT-04 — Relatório só conta contratações validadas*

- **Dado que** no mês, 3 contratações validadas, 1 aguardando confirmação e 1 em análise
- **Quando** o admin abrir o relatório de contratações e receita de intermediação
- **Então** o relatório lista as 3 validadas, soma a taxa delas e deixa as outras duas fora do total, em uma seção separada.


**Bloqueada pela decisão:** A12: Taxa de intermediação sobre contratação

#### [P2] Mensagens entre empresa e talento depois do aceite

**Código:** E08-S05 · **Tipo:** Story · **Pontos:** 8 · **Release:** R3

**História de usuário**

Como talento ou empresa com um convite aceito, quero trocar mensagens dentro da plataforma, para combinar os próximos passos sem expor meu contato antes da hora.

**Checklist de critérios de aceitação**

- [ ] Conversa por convite aceito, com notificação.
- [ ] Bloqueio e denúncia de mensagem abusiva.
- [ ] Contato externo continua só depois do aceite.

**Casos de teste**

*CT-01 — Conversa abre depois do aceite*

- **Dado que** um convite aceito pelo talento
- **Quando** a empresa enviar a mensagem "Podemos conversar na quinta às 14h?"
- **Então** a conversa é criada, o talento recebe a mensagem e uma notificação no sino, e a mensagem aparece na conversa dos dois.

*CT-02 — Sem aceite não há conversa nem contato*

- **Dado que** um convite com status "enviado" e outro "recusado"
- **Quando** a empresa tentar abrir conversa ou ver e-mail e WhatsApp do talento
- **Então** a API devolve 403 para a conversa e o contato externo continua oculto nos dois casos.

*CT-03 — Bloqueio e denúncia de mensagem*

- **Dado que** uma conversa ativa em que a empresa enviou uma mensagem abusiva
- **Quando** o talento denunciar a mensagem e bloquear a empresa
- **Então** a denúncia entra na fila do admin com o texto da mensagem, e novas mensagens da empresa não chegam ao talento.


**Depende de:** E04-S07 (Notificações dentro da plataforma (sino))

#### [P2] Filtros avançados, favoritos e alertas de novos talentos

**Código:** E08-S06 · **Tipo:** Story · **Pontos:** 8 · **Release:** R3

**História de usuário**

Como empresa, quero filtrar melhor os talentos e salvar buscas e favoritos, para acompanhar os perfis que mais me interessam e saber quando surgirem novos.

**Checklist de critérios de aceitação**

- [ ] Filtros por área, cursos concluídos e disponibilidade.
- [ ] Favoritos e buscas salvas com alerta de novos talentos.

**Casos de teste**

*CT-01 — Filtros por curso concluído e disponibilidade*

- **Dado que** três talentos visíveis, e apenas um com o curso "Social Media na Prática" concluído e disponibilidade "estágio"
- **Quando** a empresa filtrar por esse curso e por disponibilidade "estágio"
- **Então** a lista mostra só esse talento e o total exibido é 1.

*CT-02 — Favoritos*

- **Dado que** um talento na lista de resultados
- **Quando** a empresa o marcar como favorito e depois remover a marcação
- **Então** o talento aparece em "Favoritos" enquanto marcado e some de lá quando a marcação é removida.

*CT-03 — Busca salva com alerta*

- **Dado que** uma empresa com a busca salva "Social media em Atalaia" com alerta ligado
- **Quando** um novo aluno que atende aos filtros ligar a visibilidade no Banco de Talentos
- **Então** a empresa recebe um alerta com o link da busca e o novo talento aparece nos resultados.


#### [P1] Faixa etária e controle do aluno sobre o que aparece

**Código:** E08-S07 · **Tipo:** Story · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como aluno, quero escolher quais dados a empresa pode ver e mostrar só a faixa da minha idade, para proteger minha privacidade sem perder a chance de ser encontrado.

**Checklist de critérios de aceitação**

- [ ] A empresa vê faixa etária em vez da idade exata.
- [ ] O aluno liga e desliga bairro, cidade e título individualmente.
- [ ] Prévia de como a empresa me vê.

**Casos de teste**

*CT-01 — Faixa etária no lugar da idade exata*

- **Dado que** um aluno de 22 anos visível no Banco de Talentos
- **Quando** a empresa abrir a busca e o perfil dele
- **Então** a tela mostra a faixa "20 a 24 anos", e a resposta da API não traz idade exata nem data de nascimento.

*CT-02 — Campo desligado some para a empresa*

- **Dado que** um aluno que desligou a opção de mostrar o bairro
- **Quando** a empresa buscar por bairro "Atalaia" e abrir o perfil dele
- **Então** o bairro não aparece no perfil nem nos cartões, e o filtro por bairro não encontra esse aluno.

*CT-03 — Prévia igual ao que a empresa vê*

- **Dado que** um aluno com cidade e título ligados e bairro desligado
- **Quando** ele abrir a prévia "como a empresa me vê"
- **Então** a prévia mostra exatamente os campos que a API entrega à empresa: título, cidade e faixa etária, sem bairro.


#### [P1] Denunciar empresa e bloquear convites abusivos

**Código:** E08-S08 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como talento, quero denunciar um convite suspeito e bloquear a empresa, para me proteger de golpes e de abordagens abusivas.

**Checklist de critérios de aceitação**

- [ ] Botão "Denunciar" no convite, com motivo.
- [ ] Bloqueio impede novos convites daquela empresa.
- [ ] Admin vê as denúncias e pode suspender a empresa.

**Casos de teste**

*CT-01 — Talento denuncia um convite*

- **Dado que** um convite recebido que pede pagamento para participar do processo
- **Quando** o talento clicar em "Denunciar" e escolher o motivo "cobrança indevida"
- **Então** a denúncia é registrada como "aberta", com convite, empresa e motivo, e o talento vê a confirmação de envio.

*CT-02 — Bloqueio impede novos convites*

- **Dado que** um talento que bloqueou a empresa Studio Atalaia
- **Quando** um representante dessa empresa tentar enviar novo convite a ele
- **Então** a API devolve status 403 e nenhum convite é criado.

*CT-03 — Admin analisa e suspende a empresa*

- **Dado que** uma denúncia aberta contra a empresa na fila do admin
- **Quando** o admin suspender a empresa
- **Então** os representantes perdem o acesso ao Banco de Talentos (403), os convites em andamento são retirados e a denúncia passa a "resolvida".


**Depende de:** E10-S04 (Denunciar conteúdo e fila de moderação)

### E09 · Doações e bolsas

**Release:** R3 · Receita corporativa · **Prioridade:** P2 Média · **3 itens, 31 pontos**

**Objetivo:** Doações de empresas e apoiadores viram bolsas para jovens.

**Por que importa:** É o terceiro modelo de receita e o caminho para quem não pode pagar o curso.

#### [P2] Doação de empresas e apoiadores

**Código:** E09-S01 · **Tipo:** Story · **Pontos:** 13 · **Release:** R3

**História de usuário**

Como empresa apoiadora, quero doar ao Hub+ sem criar login e receber recibo, para apoiar a formação dos jovens e ter o comprovante da doação.

**Checklist de critérios de aceitação**

- [ ] Página pública de doação com Pix e cartão (conforme A8).
- [ ] Registro da doação e recibo com os dados do doador e o valor.
- [ ] A carteira do Hub+ separa doação de retenção.

**Casos de teste**

*CT-01 — Doação por cartão sem login*

- **Dado que** um visitante sem conta na página pública de doação
- **Quando** ele doar R$ 500,00 com um cartão de teste informando nome da empresa e e-mail
- **Então** a doação é registrada como "paga", o recibo é enviado ao e-mail informado e nenhuma conta de usuário é criada.

*CT-02 — Recibo com os dados da doação*

- **Dado que** uma doação paga de R$ 500,00 feita por uma empresa com CNPJ informado
- **Quando** o recibo for gerado
- **Então** o recibo traz nome da empresa, CNPJ, valor, data e forma de pagamento, e pode ser baixado a partir do e-mail.

*CT-03 — Doação separada da retenção na carteira do Hub+*

- **Dado que** uma doação paga de R$ 500,00 e uma venda de curso com retenção do Hub+
- **Quando** o admin abrir a carteira do Hub+
- **Então** a doação aparece em um lançamento do tipo "doação", separado do lançamento de retenção, e o total de retenções não muda por causa dela.

*CT-04 — Pix pendente não conta como paga*

- **Dado que** uma doação por Pix gerada e ainda não paga
- **Quando** o prazo do Pix passar sem pagamento
- **Então** a doação fica "expirada", não gera recibo nem selo e não entra na carteira.


**Bloqueada pela decisão:** A8: Como a doação de empresas é recebida

#### [P2] Bolsas: vagas gratuitas financiadas por doação

**Código:** E09-S02 · **Tipo:** Story · **Pontos:** 13 · **Release:** R3

**História de usuário**

Como jovem sem condições de pagar o curso, quero concorrer a uma bolsa financiada por doações, para estudar mesmo sem ter dinheiro.

**Checklist de critérios de aceitação**

- [ ] Admin cria bolsas por curso com critérios e quantidade.
- [ ] Aluno se candidata e acompanha o resultado.
- [ ] A matrícula por bolsa não gera cobrança e debita o fundo de bolsas.

**Casos de teste**

*CT-01 — Admin cria bolsas para um curso*

- **Dado que** o admin na tela de bolsas e um curso publicado
- **Quando** ele criar 10 bolsas para o curso com o critério de renda familiar de até 2 salários mínimos
- **Então** o curso mostra "10 bolsas abertas" com o critério visível para os alunos.

*CT-02 — Aluno se candidata e acompanha*

- **Dado que** um aluno que atende ao critério
- **Quando** ele se candidatar à bolsa e o admin aprovar a candidatura
- **Então** o aluno vê o estado mudar de "em análise" para "aprovada" e recebe o aviso do resultado.

*CT-03 — Matrícula por bolsa não cobra e debita o fundo*

- **Dado que** uma candidatura aprovada e um fundo de bolsas com saldo
- **Quando** a matrícula for criada
- **Então** a matrícula existe sem pedido de pagamento nem cobrança, o aluno acessa o curso e o fundo de bolsas é debitado em uma vaga e no valor do curso.

*CT-04 — Bolsas esgotadas*

- **Dado que** um curso com as 10 bolsas já concedidas
- **Quando** um novo aluno tentar se candidatar
- **Então** a candidatura é bloqueada com a mensagem "bolsas esgotadas" e nenhuma candidatura é criada.


**Depende de:** E09-S01 (Doação de empresas e apoiadores)

**Bloqueada pela decisão:** A8: Como a doação de empresas é recebida

#### [P2] Painel e conciliação de doações no admin

**Código:** E09-S06 · **Tipo:** Story · **Pontos:** 5 · **Release:** R3

**História de usuário**

Como time financeiro do Hub+, quero acompanhar as doações e conciliar com o extrato do banco, para ter certeza de que todo valor recebido está registrado.

**Checklist de critérios de aceitação**

- [ ] Lista de doações, estado e comprovante.
- [ ] Conciliação com o extrato e exportação.

**Casos de teste**

*CT-01 — Lista com estado e comprovante*

- **Dado que** doações pagas, pendentes e estornadas no sistema
- **Quando** o admin abrir o painel de doações
- **Então** a lista mostra cada doação com doador, valor, estado e o comprovante para baixar nas pagas.

*CT-02 — Conciliação com o extrato*

- **Dado que** um extrato em CSV com 3 créditos, sendo 2 de valor e data iguais aos de doações e 1 sem doação correspondente
- **Quando** o admin importar o extrato na conciliação
- **Então** as 2 doações ficam "conciliadas" e o crédito sem correspondência é destacado como divergência.

*CT-03 — Exportação com filtros*

- **Dado que** o painel filtrado pelo estado "paga" no mês de novembro
- **Quando** o admin exportar
- **Então** o CSV contém só as doações pagas de novembro e o total do arquivo é igual ao total mostrado na tela.


**Depende de:** E09-S01 (Doação de empresas e apoiadores)

### E10 · Administração e operação

**Release:** R2 · Lançamento público · **Prioridade:** P1 Alta · **7 itens, 42 pontos**

**Objetivo:** O time do Hub+ opera a plataforma sem mexer no banco.

**Por que importa:** Suporte, moderação e finanças precisam de ferramentas. Hoje o admin só vê pedidos, saques e carteira.

#### [P1] Gestão de usuários: buscar, ver, suspender e reativar

**Código:** E10-S01 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como pessoa do time de suporte, quero encontrar uma conta e suspendê-la ou reativá-la, para agir sobre fraude ou abuso sem precisar mexer no banco de dados.

**Checklist de critérios de aceitação**

- [ ] Busca por nome, e-mail e perfil, com detalhe da conta.
- [ ] Suspender impede login e vendas, e reativar desfaz.
- [ ] Toda ação fica na trilha de auditoria.

**Casos de teste**

*CT-01 — Busca e detalhe da conta*

- **Dado que** contas de aluno, mentor e empresa cadastradas
- **Quando** o admin buscar por "marina" e filtrar pelo perfil mentor, e depois abrir uma conta
- **Então** a lista traz só mentores cujo nome ou e-mail contém "marina" e o detalhe mostra perfil, data de cadastro e estado da conta.

*CT-02 — Suspender bloqueia login e vendas*

- **Dado que** um mentor com um curso publicado e uma conta ativa
- **Quando** o admin suspender a conta informando o motivo
- **Então** o login do mentor é recusado com a mensagem de conta suspensa, o curso deixa de aceitar compras e a suspensão fica na trilha de auditoria com ator, alvo, motivo e data e hora.

*CT-03 — Reativar desfaz a suspensão*

- **Dado que** a conta do mentor suspensa
- **Quando** o admin reativar a conta
- **Então** o mentor volta a entrar, o curso volta a aceitar compras e a reativação fica na trilha de auditoria.

*CT-04 — Perfil sem permissão*

- **Dado que** um mentor logado
- **Quando** ele chamar a rota de busca de usuários da administração
- **Então** a API devolve status 403 e nenhum dado de outra conta é retornado.


**Depende de:** E02-S07 (Trilha de auditoria financeira)

#### [P1] Paginação e filtros em pedidos, saques, correções e convites

**Código:** E10-S02 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 7

**História de usuário**

Como admin, quero navegar por páginas e filtrar as listas de pedidos, saques, correções e convites, para encontrar um registro específico mesmo quando houver milhares deles.

**Checklist de critérios de aceitação**

- [ ] Paginação por cursor nas quatro listas.
- [ ] Filtros por estado, período e busca por pessoa.
- [ ] Mantém o comportamento atual para quem tem poucos itens.

**Casos de teste**

*CT-01 — Paginação por cursor*

- **Dado que** 250 pedidos cadastrados
- **Quando** o admin abrir a lista e seguir o cursor da resposta até o fim
- **Então** a primeira página traz 50 itens com um cursor, cada página seguinte traz os próximos 50 sem repetir nenhum, e a última página vem sem cursor com os 50 restantes; o mesmo vale para saques, correções e convites.

*CT-02 — Filtros combinados*

- **Dado que** pedidos pagos e reembolsados entre outubro e novembro
- **Quando** o admin filtrar por estado "reembolsado", período de 01/11 a 07/11 e buscar pelo e-mail do aluno
- **Então** a lista traz só os pedidos reembolsados naquele período e daquele aluno.

*CT-03 — Poucos itens mantêm o comportamento atual*

- **Dado que** apenas 3 saques cadastrados
- **Quando** o admin abrir a lista de saques
- **Então** os 3 aparecem na ordem de hoje, do mais recente ao mais antigo, e não há botão de próxima página.


#### [P1] Painel de suporte com a jornada da pessoa

**Código:** E10-S03 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como pessoa do time de suporte, quero ver a jornada de uma aluna ou de um mentor em uma única linha do tempo, para responder rápido a quem me procurou sem pedir prints.

**Checklist de critérios de aceitação**

- [ ] Linha do tempo com compras, matrículas, progresso, entregas e saques.
- [ ] Ações de suporte registradas na auditoria.
- [ ] Dados sensíveis mascarados por padrão.

**Casos de teste**

*CT-01 — Linha do tempo da jornada*

- **Dado que** uma aluna com uma compra, uma matrícula, 3 aulas concluídas, uma entrega aprovada e um certificado
- **Quando** o suporte abrir a jornada dela
- **Então** a linha do tempo mostra esses eventos em ordem cronológica, cada um com data e hora, e a jornada de um mentor mostra também vendas e saques.

*CT-02 — Dados sensíveis mascarados*

- **Dado que** a jornada de um mentor com CPF e chave Pix cadastrados
- **Quando** o suporte abrir a tela
- **Então** o CPF aparece no formato ***.456.789-** e a chave Pix mascarada, e revelar o valor completo exige informar um motivo e fica registrado na auditoria.

*CT-03 — Ação de suporte auditada*

- **Dado que** a jornada de uma aluna com e-mail não confirmado
- **Quando** o suporte reenviar o e-mail de confirmação
- **Então** o e-mail é reenviado e a ação fica na auditoria com o ator, a conta atendida e a data e hora.


**Depende de:** E10-S01 (Gestão de usuários: buscar, ver, suspender e reativar)

#### [P1] Denunciar conteúdo e fila de moderação

**Código:** E10-S04 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como pessoa que usa o Hub+, quero denunciar um conteúdo inadequado, para que o time retire o que prejudica a comunidade.

**Checklist de critérios de aceitação**

- [ ] Botão "Denunciar" com motivo nos conteúdos públicos.
- [ ] Fila do admin com ocultar, manter e suspender autor.
- [ ] Autor é avisado da decisão.

**Casos de teste**

*CT-01 — Denúncia entra na fila*

- **Dado que** uma avaliação de curso com linguagem ofensiva
- **Quando** um aluno clicar em "Denunciar" e escolher o motivo "ofensa"
- **Então** a denúncia aparece na fila do admin como "aberta" com o conteúdo, o motivo e o denunciante, e uma segunda denúncia do mesmo aluno sobre o mesmo conteúdo não cria outro item.

*CT-02 — Ocultar o conteúdo*

- **Dado que** uma denúncia aberta na fila
- **Quando** o admin escolher "ocultar"
- **Então** o conteúdo deixa de aparecer para o público, o autor recebe um aviso com o motivo da decisão e a denúncia passa a "resolvida".

*CT-03 — Manter o conteúdo*

- **Dado que** uma denúncia aberta sobre um conteúdo que respeita as regras
- **Quando** o admin escolher "manter"
- **Então** o conteúdo continua visível, a denúncia é encerrada e o autor não recebe aviso.

*CT-04 — Suspender o autor*

- **Dado que** uma denúncia sobre um autor reincidente
- **Quando** o admin escolher "suspender autor"
- **Então** a conta do autor fica suspensa, o conteúdo dele é ocultado e o autor é avisado da decisão.


#### [P2] Exportações CSV para o admin

**Código:** E10-S05 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como time financeiro do Hub+, quero exportar pedidos, usuários e certificados em CSV, para entregar os dados à contabilidade sem montar planilhas à mão.

**Checklist de critérios de aceitação**

- [ ] Exportação com os filtros da tela.
- [ ] Colunas documentadas e sem dados sensíveis desnecessários.

**Casos de teste**

*CT-01 — Exportação respeita os filtros da tela*

- **Dado que** a lista de pedidos filtrada pelo estado "pago" em novembro, com 40 resultados
- **Quando** o admin exportar
- **Então** o CSV tem 40 linhas, todas de pedidos pagos em novembro, e o total do arquivo é igual ao total da tela.

*CT-02 — Colunas documentadas*

- **Dado que** a documentação das exportações em docs/API.md
- **Quando** o admin exportar pedidos, usuários e certificados
- **Então** o cabeçalho de cada CSV tem exatamente as colunas documentadas, na mesma ordem.

*CT-03 — Sem dados sensíveis desnecessários*

- **Dado que** usuários com CPF, chave Pix e senha cadastrados
- **Quando** o admin exportar a lista de usuários
- **Então** o CSV não contém CPF, chave Pix nem hash de senha, e um mentor que tente chamar a exportação recebe status 403.


**Depende de:** E10-S02 (Paginação e filtros em pedidos, saques, correções e convites)

#### [P1] Configurar retenção, taxa e prazos pelo admin, com histórico

**Código:** E10-S06 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como admin, quero ajustar a retenção do Hub+, a taxa estimada do gateway, a janela de garantia e o saque mínimo pela tela, para mudar as regras sem depender de alterar o .env e reiniciar a API.

**Checklist de critérios de aceitação**

- [ ] Tela com retenção, taxa estimada do gateway, janela de garantia e saque mínimo.
- [ ] Cada mudança guarda quem alterou, quando e o valor anterior.
- [ ] Vale só para novos pedidos; pedidos antigos não mudam.

**Casos de teste**

*CT-01 — Histórico da alteração*

- **Dado que** a retenção do Hub+ configurada em 20%
- **Quando** o admin alterar para 15% e salvar
- **Então** o histórico registra quem alterou, data e hora, o valor anterior (20%) e o novo (15%).

*CT-02 — Vale só para pedidos novos*

- **Dado que** um pedido de R$ 100,00 feito com retenção de 20% e a retenção alterada para 15%
- **Quando** um novo pedido de R$ 100,00 for pago
- **Então** o novo pedido retém R$ 15,00 e o pedido antigo continua com a retenção de R$ 20,00.

*CT-03 — Valores inválidos são recusados*

- **Dado que** a tela de configurações aberta
- **Quando** o admin tentar salvar retenção de 120%, taxa negativa ou saque mínimo abaixo de zero
- **Então** a API devolve status 400 com a mensagem do campo inválido e nenhuma configuração é alterada.

*CT-04 — Perfil sem permissão*

- **Dado que** um mentor logado
- **Quando** ele tentar alterar as configurações da plataforma
- **Então** a API devolve status 403 e as regras continuam as mesmas.


**Depende de:** E02-S07 (Trilha de auditoria financeira)

**Bloqueada pela decisão:** A14: Quem arca com a taxa do Stripe e valores reais da taxa

#### [P2] Papéis internos: financeiro, curadoria e suporte

**Código:** E10-S07 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como Hub+, quero dar a cada pessoa do time só o acesso de que ela precisa, para reduzir o risco de uso indevido de dados financeiros e pessoais.

**Checklist de critérios de aceitação**

- [ ] Papéis internos no CASL com permissões separadas.
- [ ] Financeiro vê saques e CPF; suporte vê a jornada sem dados financeiros completos.
- [ ] Admin gerencia os papéis.

**Casos de teste**

*CT-01 — Admin atribui um papel*

- **Dado que** uma pessoa do time sem papel interno
- **Quando** o admin atribuir a ela o papel "suporte"
- **Então** ela passa a acessar o painel de suporte e continua sem acesso às telas de saques e de configurações financeiras.

*CT-02 — Financeiro e suporte veem coisas diferentes*

- **Dado que** uma pessoa com papel "financeiro" e outra com papel "suporte"
- **Quando** cada uma abrir a lista de saques e a jornada de um mentor
- **Então** o financeiro vê os saques com o CPF completo, e o suporte recebe status 403 nos saques e vê o CPF mascarado na jornada.

*CT-03 — Curadoria não vê dinheiro*

- **Dado que** uma pessoa com papel "curadoria"
- **Quando** ela aprovar um curso e tentar abrir os saques
- **Então** a aprovação é feita e a lista de saques devolve status 403.

*CT-04 — Só o admin gerencia papéis*

- **Dado que** uma pessoa com papel "financeiro"
- **Quando** ela tentar atribuir um papel a outra pessoa
- **Então** a API devolve status 403 e o papel não é alterado.


**Depende de:** E10-S01 (Gestão de usuários: buscar, ver, suspender e reativar)

### E11 · Qualidade e testes

**Release:** R1 · Piloto fechado · **Prioridade:** P1 Alta · **8 itens, 54 pontos**

**Objetivo:** Confiança para mudar o sistema: testes automatizados, acessibilidade e desempenho medidos.

**Por que importa:** A API tem 81 testes, mas o front-end não tem nenhum e não há teste de ponta a ponta.

#### [P1] Testes de componentes e hooks no front-end

**Código:** E11-S01 · **Tipo:** Task · **Pontos:** 8 · **Release:** R1 · **Sprint:** 7

**História de usuário**

Como pessoa que desenvolve o Hub+, quero testes automatizados no front-end, para mudar as telas sem medo de quebrar o login, o upload ou a prévia de ganhos.

**Checklist de critérios de aceitação**

- [ ] Vitest e Testing Library configurados e rodando no CI.
- [ ] Cobrem autenticação (incluindo o redirecionamento depois do login), dropzone, onboarding e a prévia de ganhos.
- [ ] Meta inicial de cobertura definida para os módulos testados.

**Casos de teste**

*CT-01 — CI roda os testes do front-end*

- **Dado que** um pull request que quebra um teste do web
- **Quando** o CI rodar `pnpm test` no web
- **Então** o job falha, o merge fica bloqueado e o relatório indica o teste que falhou.

*CT-02 — Redirecionamento depois do login*

- **Dado que** um teste de autenticação com a API simulada devolvendo token e sessão de aluno
- **Quando** o usuário preencher e-mail e senha corretos e enviar
- **Então** a navegação termina em "/" com o painel do aluno e não em "/explore".

*CT-03 — Dropzone, onboarding e prévia de ganhos*

- **Dado que** os testes de componente do dropzone, do onboarding do mentor e da prévia de ganhos
- **Quando** eles rodarem
- **Então** o dropzone rejeita um arquivo .exe e um PNG de 6 MB e aceita um PNG de 1 MB, o onboarding recusa o CPF 111.111.111-11, e a prévia mostra "Você recebe R$ 165,79" para o preço de R$ 199,00 com os percentuais simulados.

*CT-04 — Meta de cobertura*

- **Dado que** a meta inicial de 70% de linhas nos módulos testados
- **Quando** o relatório de cobertura for gerado no CI
- **Então** o job passa com 70% ou mais e falha se a cobertura cair abaixo da meta.


**Depende de:** E01-S01 (Configurar CI no GitHub Actions para API e front-end)

#### [P0] Testes de ponta a ponta com Playwright nos fluxos críticos

**Código:** E11-S02 · **Tipo:** Task · **Pontos:** 13 · **Release:** R1 · **Sprint:** 5

**História de usuário**

Como time do Hub+, quero testes de ponta a ponta nos caminhos mais importantes, para descobrir antes dos usuários qualquer quebra na jornada de cadastro, compra, estudo, entrega e contratação.

**Checklist de critérios de aceitação**

- [ ] Os testes cobrem o cadastro e o onboarding de aluno, mentor e empresa.
- [ ] Os testes cobrem a compra com gateway fake e o estudo até a emissão do certificado.
- [ ] Os testes cobrem a criação de curso com vídeo arrastado no construtor, a entrega de desafio com anexo arrastado pelo aluno e a correção pelo mentor.
- [ ] Os testes cobrem a busca de talento, o convite da empresa e o aceite do talento.

**Casos de teste**

*CT-01 — Cadastro e onboarding dos três perfis*

- **Dado que** um navegador sem sessão
- **Quando** o teste cadastrar um aluno e pular o onboarding, um mentor que abre a carteira com um CPF válido e uma empresa que cadastra um CNPJ válido
- **Então** cada perfil termina no painel dele, e o mentor sem carteira aberta é redirecionado para o onboarding ao tentar abrir "Meus cursos".

*CT-02 — Compra e estudo até o certificado*

- **Dado que** um curso publicado de R$ 99,00 sem desafios e um aluno logado
- **Quando** o aluno comprar com o gateway fake e concluir todas as aulas
- **Então** a matrícula aparece em "Meus estudos", o progresso chega a 100% e o certificado é emitido com código no formato HUB-XXXX-XXXX.

*CT-03 — Curso com vídeo arrastado, entrega e correção*

- **Dado que** um mentor com carteira aberta e um aluno matriculado em um curso com desafio
- **Quando** o mentor arrastar um vídeo para o módulo no construtor, o aluno arrastar um PDF de 1 MB na entrega e o mentor aprovar
- **Então** o vídeo vira uma aula com título e duração, o anexo é enviado com barra de progresso, a entrega fica aprovada e o projeto aparece validado no portfólio do aluno.

*CT-04 — Empresa convida e talento aceita*

- **Dado que** um talento visível no Banco de Talentos e uma empresa com cadastro completo
- **Quando** a empresa buscar pelo título do talento, abrir o perfil e enviar o convite, e o talento aceitar
- **Então** a empresa passa a ver o nome completo e o contato, e o convite aparece como "aceito" nas duas telas.


**Depende de:** E01-S01 (Configurar CI no GitHub Actions para API e front-end); E01-S09 (Criar seed de demonstração (`pnpm db:seed:demo`))

#### [P1] Ampliar testes da API: webhook, erros do R2 e concorrência

**Código:** E11-S03 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1

**História de usuário**

Como time do Hub+, quero ampliar os testes da API nos pontos de maior risco financeiro e de integração, para que um erro de pagamento ou de concorrência seja pego pelo CI.

**Checklist de critérios de aceitação**

- [ ] Webhook do Stripe: assinatura, idempotência e eventos fora de ordem.
- [ ] Falhas do R2 e do e-mail não derrubam o fluxo principal.
- [ ] Concorrência: dois saques, duas conclusões e dois convites simultâneos.
- [ ] Relatório de cobertura no CI com piso definido.

**Casos de teste**

*CT-01 — Webhook do Stripe: assinatura, repetição e ordem*

- **Dado que** um pedido pendente e eventos do Stripe simulados
- **Quando** chegar um evento com assinatura inválida, o mesmo evento "checkout.session.completed" duas vezes e um "checkout.session.expired" depois do pagamento
- **Então** o evento inválido é recusado sem alterar o pedido, a repetição gera uma só matrícula e dois lançamentos no ledger, e o evento de expiração tardio não desfaz o pedido pago.

*CT-02 — Falhas de R2 e de e-mail não derrubam o fluxo*

- **Dado que** o R2 simulado devolvendo erro ao conferir o arquivo e o provedor de e-mail simulado fora do ar
- **Quando** o mentor criar uma aula com vídeo e uma pessoa se cadastrar
- **Então** a criação da aula devolve um erro claro sem gravar a aula, e o cadastro responde 201 com a conta criada e o e-mail registrado para novo envio.

*CT-03 — Concorrência*

- **Dado que** um mentor com R$ 100,00 disponíveis, um aluno prestes a concluir a última aula e uma empresa com talento visível
- **Quando** forem disparados ao mesmo tempo dois saques de R$ 80,00, duas conclusões da última aula e dois convites ao mesmo talento
- **Então** só um saque é aceito e o outro recebe erro de saldo, só um certificado é emitido e só um convite fica em andamento.

*CT-04 — Piso de cobertura no CI*

- **Dado que** o piso de 80% de linhas da API configurado no CI
- **Quando** um pull request reduzir a cobertura para 75%
- **Então** o job do CI falha apontando a cobertura atual e o piso.


**Depende de:** E01-S01 (Configurar CI no GitHub Actions para API e front-end)

#### [P1] Acessibilidade WCAG 2.2 AA

**Código:** E11-S04 · **Tipo:** Task · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como pessoa com deficiência visual, motora ou de leitura, quero usar o Hub+ com teclado e leitor de tela e com contraste suficiente, para estudar e trabalhar com a mesma autonomia dos outros.

**Checklist de critérios de aceitação**

- [ ] Auditoria com axe nas telas principais, nos dois temas.
- [ ] Foco visível, ordem de tabulação e rótulos corretos no player, dropzone, construtor e formulários.
- [ ] Contraste mínimo AA no tema claro e no escuro.
- [ ] Relatório e correções.

**Casos de teste**

*CT-01 — Auditoria automática com axe*

- **Dado que** as telas de login, cadastro, catálogo, painel do aluno, player e construtor de cursos
- **Quando** o axe for executado em cada uma nos temas claro e escuro
- **Então** não há violações sérias nem críticas, e o relatório em docs/ lista o que foi corrigido e o que foi aceito com justificativa.

*CT-02 — Uso só com teclado*

- **Dado que** a tela de upload do construtor e o player de aula
- **Quando** a pessoa navegar apenas com Tab, Shift+Tab, Enter e Espaço
- **Então** o foco é sempre visível, a ordem de tabulação segue a ordem visual, e Enter ou Espaço no dropzone abre o seletor de arquivos.

*CT-03 — Leitor de tela*

- **Dado que** o NVDA no Windows e o VoiceOver no iPhone
- **Quando** a pessoa percorrer o dropzone, um formulário com erro e o player
- **Então** o dropzone é anunciado como "Arraste os vídeos aqui ou clique para escolher", cada campo anuncia o rótulo e a mensagem de erro, e os botões do player têm nome.

*CT-04 — Contraste mínimo AA*

- **Dado que** os tokens de cor dos temas claro e escuro
- **Quando** o contraste de texto e fundo for medido
- **Então** texto normal tem pelo menos 4,5:1 e texto grande e ícones de interface pelo menos 3:1, nos dois temas.


#### [P1] Desempenho do front-end: divisão por rota e métricas

**Código:** E11-S05 · **Tipo:** Task · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno que usa um celular simples e uma conexão limitada, quero que as telas carreguem rápido, para não desistir de estudar por causa da espera.

**Checklist de critérios de aceitação**

- [ ] Rotas carregadas sob demanda (lazy).
- [ ] Pacote inicial abaixo de 300 kB.
- [ ] Web Vitals medidos e registrados.
- [ ] Orçamento de desempenho verificado no CI.

**Casos de teste**

*CT-01 — Tamanho do pacote inicial*

- **Dado que** o build de produção do web com divisão por rota
- **Quando** o build terminar
- **Então** o JavaScript carregado na primeira visita tem menos de 300 kB sem compressão, conforme o relatório do Vite, contra os 688 kB de hoje.

*CT-02 — Rotas carregadas sob demanda*

- **Dado que** a aba Rede do navegador aberta na tela de login
- **Quando** a página carregar
- **Então** os arquivos das telas do construtor de cursos, da carteira e do painel de admin não são baixados, e só são pedidos ao abrir essas telas.

*CT-03 — Web Vitals registrados*

- **Dado que** o staging acessado em um perfil de celular intermediário com rede 4G simulada
- **Quando** a página inicial e o catálogo forem medidos
- **Então** o LCP fica abaixo de 2,5 s e o CLS abaixo de 0,1, e os valores são registrados em docs/.

*CT-04 — Orçamento verificado no CI*

- **Dado que** o orçamento de 300 kB configurado no CI
- **Quando** um pull request adicionar uma biblioteca que leve o pacote inicial a 350 kB
- **Então** o job falha informando o tamanho atual e o orçamento.


**Depende de:** E01-S01 (Configurar CI no GitHub Actions para API e front-end)

#### [P2] Testes de carga na API

**Código:** E11-S06 · **Tipo:** Task · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como time do Hub+, quero saber quantos usuários a API aguenta antes de abrir ao público, para descobrir os gargalos em um teste e não no dia do lançamento.

**Checklist de critérios de aceitação**

- [ ] Cenários: catálogo, login, checkout e webhook.
- [ ] Metas de latência e erro definidas e medidas em staging.
- [ ] Gargalos encontrados registrados como histórias.

**Casos de teste**

*CT-01 — Cenários e metas medidos em staging*

- **Dado que** o staging com dados de teste e os cenários de catálogo, login, checkout e webhook
- **Quando** cada cenário rodar com 100 usuários virtuais por 5 minutos
- **Então** os resultados mostram latência p95 e taxa de erro de cada cenário contra as metas definidas (por exemplo, p95 do catálogo abaixo de 500 ms e menos de 1% de erros) e o relatório é salvo em docs/.

*CT-02 — Webhook repetido sob carga*

- **Dado que** 50 eventos "checkout.session.completed" duplicados enviados ao mesmo tempo para o mesmo pedido
- **Quando** o teste de carga terminar
- **Então** existe uma só matrícula e dois lançamentos no ledger para o pedido, e nenhuma requisição devolve erro 500.

*CT-03 — Gargalos viram itens do backlog*

- **Dado que** um cenário que ficou acima da meta de latência
- **Quando** o relatório for fechado
- **Então** cada gargalo encontrado vira um item no Jira com o rótulo "desempenho", a causa provável e a medição de antes.


**Depende de:** E01-S05 (Publicar staging e produção com deploy automático)

#### [P1] Matriz de navegadores e dispositivos

**Código:** E11-S07 · **Tipo:** Task · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como aluno que acessa o Hub+ por um celular Android de entrada ou por um iPhone, quero que tudo funcione no meu aparelho, para estudar mesmo sem um computador.

**Checklist de critérios de aceitação**

- [ ] Matriz definida com base no público (celular).
- [ ] Fluxos críticos testados e falhas corrigidas.
- [ ] Player, upload e arrastar e soltar conferidos em cada item da matriz.

**Casos de teste**

*CT-01 — Matriz definida e justificada*

- **Dado que** os dados de acesso do público de 18 a 26 anos de Aracaju
- **Quando** a matriz for publicada em docs/
- **Então** ela lista Chrome em Android de entrada (por exemplo, 2 GB de memória), Safari nas duas versões mais recentes do iOS, Chrome, Edge e Firefox no computador, com a justificativa de cada escolha.

*CT-02 — Fluxos críticos em cada item da matriz*

- **Dado que** cada navegador e aparelho da matriz
- **Quando** forem executados cadastro, compra com gateway fake, aula no player e entrega com anexo
- **Então** nenhum fluxo tem erro que impeça concluir, e cada falha encontrada vira um bug com o aparelho e o passo a passo.

*CT-03 — Upload e arrastar e soltar*

- **Dado que** um vídeo de 200 MB, um celular Android de entrada com rede 4G simulada e um computador
- **Quando** o mentor enviar o vídeo pelo celular e arrastar o mesmo arquivo no computador
- **Então** o envio pelo celular termina com barra de progresso, o arrastar e soltar funciona no computador e a seleção por toque funciona no celular.


#### [P2] Documentar a API com OpenAPI gerada dos schemas

**Código:** E11-S08 · **Tipo:** Task · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como pessoa que desenvolve ou integra com a API do Hub+, quero uma documentação gerada do próprio código, para consultar rotas sempre atualizadas e sem depender de um arquivo mantido à mão.

**Checklist de critérios de aceitação**

- [ ] OpenAPI gerada dos schemas Zod e servida em staging.
- [ ] Um teste no CI falha quando uma rota nova não aparece na documentação.
- [ ] `docs/API.md` passa a apontar para a especificação.

**Casos de teste**

*CT-01 — Especificação servida em staging*

- **Dado que** o staging com a nova versão da API
- **Quando** alguém abrir a página de documentação da API
- **Então** ela exibe uma especificação OpenAPI válida com todas as rotas atuais, seus campos de entrada e saída e as respostas de erro.

*CT-02 — Rota nova sem documentação quebra o CI*

- **Dado que** um pull request que cria a rota GET /exemplo sem schema
- **Quando** o CI rodar o teste de documentação
- **Então** o job falha citando a rota GET /exemplo como ausente da especificação.

*CT-03 — API.md aponta para a especificação*

- **Dado que** o arquivo docs/API.md depois da mudança
- **Quando** ele for aberto
- **Então** ele traz o link para a especificação e deixa de manter a lista de rotas à mão.


### E12 · Site institucional e crescimento

**Release:** R2 · Lançamento público · **Prioridade:** P2 Média · **6 itens, 29 pontos**

**Objetivo:** Quem chega do Instagram entende a proposta, encontra cursos e se cadastra.

**Por que importa:** Hoje o visitante cai direto no catálogo. Não há página de apresentação nem SEO.

#### [P1] Página inicial pública

**Código:** E12-S01 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como visitante que chegou pelo Instagram, quero entender o que o Hub+ oferece antes de me cadastrar, para decidir se vale criar uma conta.

**Checklist de critérios de aceitação**

- [ ] A página inicial pública explica a proposta de valor e mostra cursos em destaque, um bloco para mentores e um bloco para empresas.
- [ ] Visitante sem login que abre a raiz do site vê a página inicial e não o catálogo.
- [ ] Pessoa logada que abre a raiz do site vai para o painel do seu perfil.
- [ ] A página carrega em até 3 segundos em celular com conexão 4G simulada e não tem rolagem horizontal em 360 px de largura.
- [ ] A página funciona nos temas claro e escuro, com texto legível nos dois.

**Casos de teste**

*CT-01 — Visitante vê a página inicial*

- **Dado que** um visitante sem login
- **Quando** abrir a raiz do site
- **Então** a página mostra a proposta de valor, ao menos um curso em destaque e os blocos "Para mentores" e "Para empresas", cada um com botão de cadastro.

*CT-02 — Pessoa logada vai ao painel*

- **Dado que** uma aluna logada com onboarding concluído
- **Quando** abrir a raiz do site
- **Então** ela é levada ao painel do aluno e a página inicial pública não é exibida.

*CT-03 — Celular e temas*

- **Dado que** um celular com 360 px de largura e conexão 4G simulada
- **Quando** abrir a página inicial nos temas claro e escuro
- **Então** o conteúdo carrega em até 3 segundos, não há rolagem horizontal e todo texto mantém contraste mínimo de 4,5 para 1.


#### [P1] SEO e compartilhamento das páginas públicas

**Código:** E12-S02 · **Tipo:** Story · **Pontos:** 8 · **Release:** R2

**História de usuário**

Como mentor, quero que o link do meu curso apareça com título e imagem ao ser compartilhado no WhatsApp e no Instagram, para atrair mais alunos.

**Checklist de critérios de aceitação**

- [ ] Cada página pública de curso, de mentor e de certificado tem título, descrição e imagem de compartilhamento próprios (Open Graph).
- [ ] O curso sem capa usa a imagem padrão do Hub+ no compartilhamento.
- [ ] O site publica sitemap.xml com os cursos publicados e robots.txt que bloqueia as áreas logadas.
- [ ] Curso despublicado não aparece no sitemap e a página responde com status 404.
- [ ] A decisão sobre pré-renderizar as páginas públicas fica registrada em docs/DECISIONS.md.

**Casos de teste**

*CT-01 — Prévia de curso com capa*

- **Dado que** um curso publicado "Social Media na Prática" com capa enviada
- **Quando** o link do curso for colado no validador de Open Graph
- **Então** a prévia mostra o título do curso, a descrição de até 160 caracteres e a capa como imagem.

*CT-02 — Curso sem capa*

- **Dado que** um curso publicado sem capa
- **Quando** o link for colado no validador de Open Graph
- **Então** a prévia mostra a imagem padrão do Hub+ e nenhum erro de imagem quebrada.

*CT-03 — Sitemap e robots*

- **Dado que** dois cursos publicados e um despublicado
- **Quando** a pessoa abrir /sitemap.xml e /robots.txt
- **Então** o sitemap lista só os dois publicados e o robots.txt bloqueia /mentor, /admin, /settings e /onboarding.

*CT-04 — Decisão registrada*

- **Dado que** a história concluída
- **Quando** a equipe abrir docs/DECISIONS.md
- **Então** existe uma decisão que diz se as páginas públicas são pré-renderizadas ou não e o motivo.


#### [P2] Analytics com consentimento e funil de conversão

**Código:** E12-S03 · **Tipo:** Task · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como time do Hub+, quero medir o caminho do cadastro até a conclusão do curso sem violar a LGPD, para saber onde perdemos pessoas.

**Checklist de critérios de aceitação**

- [ ] O banner de consentimento aparece na primeira visita e a ferramenta de analytics só carrega depois do aceite.
- [ ] Recusar ou ignorar o banner não envia nenhum evento de analytics.
- [ ] O funil registra visita, cadastro, compra, primeira aula e conclusão.
- [ ] Nenhum evento contém nome, e-mail, CPF, chave Pix ou id de usuário em texto aberto.
- [ ] A pessoa consegue mudar a escolha depois, em um link visível no rodapé.

**Casos de teste**

*CT-01 — Sem aceite, sem rastreamento*

- **Dado que** um visitante novo que fecha o banner sem aceitar
- **Quando** navegar da página inicial até a tela de cadastro
- **Então** o script de analytics não é carregado e nenhuma requisição é enviada ao serviço de medição.

*CT-02 — Com aceite, funil completo*

- **Dado que** uma aluna que aceitou o banner
- **Quando** ela se cadastrar, comprar um curso de R$ 99,00, concluir a primeira aula e concluir o curso
- **Então** o painel de analytics mostra os cinco eventos do funil em ordem para essa sessão.

*CT-03 — Sem dado pessoal nos eventos*

- **Dado que** eventos enviados durante o funil
- **Quando** a equipe inspecionar o conteúdo das requisições
- **Então** não há nome, e-mail, CPF, chave Pix nem id de usuário legível, só identificador anônimo.

*CT-04 — Revogar o consentimento*

- **Dado que** uma pessoa que aceitou o banner antes
- **Quando** ela escolher "Recusar" no link do rodapé
- **Então** o rastreamento para na hora e o cookie de consentimento é atualizado.


#### [P1] Central de ajuda e canal de suporte

**Código:** E12-S04 · **Tipo:** Story · **Pontos:** 3 · **Release:** R1 · **Sprint:** 6

**História de usuário**

Como aluno, mentor ou empresa, quero achar resposta para minha dúvida e ter um canal para falar com o suporte, para não ficar travado.

**Checklist de critérios de aceitação**

- [ ] A central de ajuda tem perguntas frequentes separadas por aluno, mentor e empresa.
- [ ] Existe um canal de contato (formulário ou botão de WhatsApp) que identifica o perfil de quem pede ajuda.
- [ ] Um link para a ajuda aparece em todas as telas internas, no menu lateral e na barra do celular.
- [ ] O formulário valida os campos obrigatórios e confirma o envio na tela.

**Casos de teste**

*CT-01 — FAQ por perfil*

- **Dado que** uma pessoa logada como mentor
- **Quando** abrir a central de ajuda
- **Então** as perguntas do perfil mentor vêm abertas primeiro e é possível trocar para as perguntas de aluno e de empresa.

*CT-02 — Enviar pedido de suporte*

- **Dado que** uma aluna na central de ajuda
- **Quando** preencher assunto e mensagem e enviar
- **Então** a tela confirma o envio e o time recebe a mensagem com o perfil "aluno" e o e-mail dela.

*CT-03 — Campos obrigatórios*

- **Dado que** o formulário de suporte
- **Quando** a pessoa tentar enviar com a mensagem vazia
- **Então** o envio é bloqueado e a tela indica que a mensagem é obrigatória.

*CT-04 — Link em todas as telas*

- **Dado que** um aluno no player de aula, em 360 px de largura
- **Quando** procurar o acesso à ajuda
- **Então** o link está visível sem precisar rolar a página e leva à central de ajuda.


#### [P2] Aplicar o logo em alta resolução em todo o produto

**Código:** E12-S05 · **Tipo:** Task · **Pontos:** 2 · **Release:** R2

**História de usuário**

Como Hub+, quero usar o logo em alta resolução em todo o produto, para passar uma imagem profissional em qualquer tela.

**Checklist de critérios de aceitação**

- [ ] O logo em SVG ou PNG de pelo menos 512 px substitui o JPG de 150 px na barra lateral, no login, no cadastro e no certificado.
- [ ] O favicon, o manifesto do app e a imagem de compartilhamento usam o novo logo.
- [ ] Existe uma versão do logo legível no tema claro e outra no tema escuro.
- [ ] Nenhum ponto do produto exibe o JPG antigo.

**Casos de teste**

*CT-01 — Logo nítido*

- **Dado que** uma tela com densidade 2x
- **Quando** abrir o login e a barra lateral
- **Então** o logo aparece sem serrilhado nem desfoque e usa o arquivo em alta resolução.

*CT-02 — Troca de tema*

- **Dado que** o painel aberto no tema claro
- **Quando** a pessoa trocar para o tema escuro
- **Então** o logo muda para a versão do tema escuro e continua legível.

*CT-03 — Favicon e compartilhamento*

- **Dado que** o site publicado
- **Quando** a aba for aberta no navegador e um link do site for colado no validador de Open Graph
- **Então** a aba mostra o novo favicon e a prévia usa o novo logo.

*CT-04 — Sem resquício do JPG*

- **Dado que** o código do front-end
- **Quando** a equipe buscar por "logo.jpg"
- **Então** não há nenhuma referência ao arquivo antigo.


**Bloqueada pela decisão:** A6: Logo em alta resolução ou vetorial

#### [P3] Indicação de amigos com bônus

**Código:** E12-S06 · **Tipo:** Spike · **Pontos:** 3 · **Release:** R3

**História de usuário**

Como Hub+, quero saber se um programa de indicação com bônus compensa, para crescer sem depender de anúncio pago.

**Checklist de critérios de aceitação**

- [ ] Existe um documento com a regra proposta, o custo por indicação e o limite de bônus por pessoa.
- [ ] O documento analisa o risco de fraude (contas falsas e autoindicação) e as formas de mitigar.
- [ ] A decisão (seguir, adiar ou descartar) fica registrada em docs/DECISIONS.md.

**Casos de teste**

*CT-01 — Proposta completa*

- **Dado que** o spike concluído
- **Quando** a equipe ler o documento entregue
- **Então** ele traz a regra de bônus, o custo estimado por indicação convertida e o teto de bônus por pessoa, com os números usados no cálculo.

*CT-02 — Risco de fraude analisado*

- **Dado que** o documento do spike
- **Quando** a equipe procurar a seção de riscos
- **Então** há ao menos o risco de autoindicação e de contas falsas, cada um com uma forma de mitigação.

*CT-03 — Decisão registrada*

- **Dado que** a reunião de decisão feita
- **Quando** a equipe abrir docs/DECISIONS.md
- **Então** existe uma entrada com a decisão tomada, a data e quem decidiu.


### E13 · Fiscal e jurídico

**Release:** R1 · Piloto fechado · **Prioridade:** P0 Crítica · **5 itens, 28 pontos**

**Objetivo:** Operar dentro da lei: notas fiscais, termos, privacidade e reembolso.

**Por que importa:** Cobrar e repassar dinheiro exige obrigações fiscais e contratos claros antes do primeiro pagamento real.

#### [P0] Levantar obrigações fiscais com a contabilidade

**Código:** E13-S01 · **Tipo:** Spike · **Pontos:** 3 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como time financeiro do Hub+, quero saber quais notas fiscais e impostos valem para a retenção e para o repasse, para cobrar dentro da lei desde o primeiro pagamento.

**Checklist de critérios de aceitação**

- [ ] Existe um parecer da contabilidade por tipo de mentor: pessoa física, MEI e empresa.
- [ ] O parecer diz quem emite a nota fiscal em cada etapa (venda ao aluno, retenção do Hub+ e repasse ao mentor).
- [ ] O parecer lista os impostos e as retenções que incidem em cada etapa.
- [ ] O resultado fica registrado em docs/DECISIONS.md e a pendência N4 é fechada.

**Casos de teste**

*CT-01 — Parecer por tipo de mentor*

- **Dado que** o spike concluído
- **Quando** a equipe abrir o parecer da contabilidade
- **Então** há uma seção para pessoa física, uma para MEI e uma para empresa, cada uma com as obrigações fiscais do repasse.

*CT-02 — Responsável pela nota em cada etapa*

- **Dado que** um curso vendido por R$ 199,00
- **Quando** a equipe consultar o parecer
- **Então** fica claro quem emite a nota da venda ao aluno, da retenção do Hub+ e do repasse ao mentor, com o regime e o município.

*CT-03 — Decisão registrada*

- **Dado que** o parecer aprovado pelo PO
- **Quando** a equipe abrir docs/DECISIONS.md
- **Então** existe uma decisão que resume o parecer, cita o contador responsável e marca a pendência N4 como resolvida.


**Entrega a decisão:** N4: Regime fiscal e emissão de nota fiscal (retenção do Hub+ e repasse ao mentor)

#### [P0] Redigir termos, privacidade, mentoria e reembolso com assessoria jurídica

**Código:** E13-S02 · **Tipo:** Task · **Pontos:** 5 · **Release:** R1 · **Sprint:** 2

**História de usuário**

Como Hub+, quero textos jurídicos revisados por uma assessoria, para que pessoas e a organização saibam seus direitos e deveres antes de usar a plataforma.

**Checklist de critérios de aceitação**

- [ ] Existem quatro textos aprovados pelo jurídico: termos de uso, política de privacidade, termos de mentoria e repasse e política de reembolso.
- [ ] A política de reembolso descreve a janela de 7 dias e o que acontece depois dela.
- [ ] Cada texto tem número de versão e data de vigência.
- [ ] Os textos são entregues em português claro, prontos para publicar nas páginas públicas.

**Casos de teste**

*CT-01 — Quatro textos entregues*

- **Dado que** a tarefa concluída
- **Quando** a equipe abrir a pasta de textos jurídicos
- **Então** estão presentes termos de uso, política de privacidade, termos de mentoria e repasse e política de reembolso, todos com aprovação do jurídico anexada.

*CT-02 — Reembolso cobre a janela e o pós-janela*

- **Dado que** a política de reembolso entregue
- **Quando** a equipe ler a seção de prazos
- **Então** ela diz que o aluno tem 7 dias para pedir reembolso integral e define a regra para pedidos depois desse prazo.

*CT-03 — Versão e vigência*

- **Dado que** os quatro textos
- **Quando** a equipe conferir o cabeçalho de cada um
- **Então** cada texto traz versão (por exemplo 1.0) e a data de início de vigência.


**Bloqueada pela decisão:** N5: Reembolso depois da janela de 7 dias: política e quem arca

#### [P1] Emitir nota fiscal automaticamente

**Código:** E13-S03 · **Tipo:** Story · **Pontos:** 13 · **Release:** R2

**História de usuário**

Como time financeiro do Hub+, quero que as notas fiscais obrigatórias sejam emitidas automaticamente, para não gastar tempo com emissão manual nem atrasar obrigações.

**Checklist de critérios de aceitação**

- [ ] A integração com o provedor de NFS-e segue o parecer fiscal aprovado.
- [ ] A nota é emitida no momento definido pela regra (compra ou repasse) e fica vinculada ao pedido.
- [ ] O aluno ou o mentor consegue baixar a nota emitida em sua conta.
- [ ] Falha de emissão cria uma pendência visível para o time financeiro e não bloqueia a compra.
- [ ] A nota de um pedido reembolsado é cancelada ou compensada conforme o parecer.

**Casos de teste**

*CT-01 — Nota emitida na venda*

- **Dado que** um aluno que comprou um curso de R$ 199,00
- **Quando** o pagamento for confirmado
- **Então** uma nota fiscal é emitida com o valor correto, vinculada ao pedido, e o aluno pode baixá-la em Meus estudos.

*CT-02 — Falha do provedor*

- **Dado que** o provedor de NFS-e fora do ar
- **Quando** um pagamento for confirmado
- **Então** a matrícula é criada normalmente, a emissão fica como pendente e a pendência aparece na lista do time financeiro com o motivo do erro.

*CT-03 — Reprocessar pendência*

- **Dado que** uma nota pendente por falha anterior
- **Quando** o provedor voltar e o financeiro pedir novo envio
- **Então** a nota é emitida uma única vez, sem duplicar, e a pendência some da lista.

*CT-04 — Pedido reembolsado*

- **Dado que** um pedido com nota emitida
- **Quando** o reembolso for concluído
- **Então** a nota é cancelada ou compensada conforme o parecer e o histórico do pedido registra a operação.


**Depende de:** E13-S01 (Levantar obrigações fiscais com a contabilidade)

**Bloqueada pela decisão:** N4: Regime fiscal e emissão de nota fiscal (retenção do Hub+ e repasse ao mentor)

#### [P2] Informe anual de rendimentos do mentor

**Código:** E13-S04 · **Tipo:** Story · **Pontos:** 5 · **Release:** R2

**História de usuário**

Como mentor, quero receber um informe anual com minhas vendas e repasses, para declarar minha renda no imposto de renda.

**Checklist de critérios de aceitação**

- [ ] O informe é um PDF por mentor e por ano, com vendas, retenções do Hub+, taxa do meio de pagamento e repasses pagos.
- [ ] O informe fica disponível a partir de 1º de janeiro do ano seguinte.
- [ ] Os totais batem com o extrato da carteira do mesmo período.
- [ ] O mentor só consegue baixar o próprio informe.

**Casos de teste**

*CT-01 — Totais batem com o extrato*

- **Dado que** uma mentora com 10 vendas de R$ 100,00 em 2026 e dois saques pagos que somam R$ 600,00
- **Quando** ela baixar o informe de 2026 em janeiro de 2027
- **Então** o PDF mostra o total vendido, a retenção, a taxa estimada e R$ 600,00 em repasses, iguais aos do extrato.

*CT-02 — Antes de janeiro*

- **Dado que** o ano de 2026 ainda em andamento
- **Quando** o mentor tentar baixar o informe de 2026
- **Então** o botão fica indisponível e a tela explica que o informe sai a partir de 1º de janeiro.

*CT-03 — Acesso restrito*

- **Dado que** o informe do mentor A
- **Quando** o mentor B tentar abrir a mesma rota
- **Então** a API responde com status 404 e nenhum dado do mentor A é exposto.


**Depende de:** E13-S01 (Levantar obrigações fiscais com a contabilidade)

#### [P0] Definir a política para menores de 18 anos

**Código:** E13-S05 · **Tipo:** Spike · **Pontos:** 2 · **Release:** R1 · **Sprint:** 1

**História de usuário**

Como Hub+, quero uma política clara para menores de 18 anos, para tratar os dados deles dentro da LGPD.

**Checklist de critérios de aceitação**

- [ ] Existe um parecer jurídico sobre dados de menores e consentimento.
- [ ] O parecer escolhe uma das opções: bloquear menores, pedir responsável ou permitir com salvaguardas.
- [ ] A decisão fica registrada em docs/DECISIONS.md e a pendência N3 é fechada.
- [ ] Existe uma história de implementação no backlog com a regra escolhida.

**Casos de teste**

*CT-01 — Parecer jurídico registrado*

- **Dado que** o spike concluído
- **Quando** a equipe abrir docs/DECISIONS.md
- **Então** existe uma decisão com a política escolhida, a justificativa e o texto do parecer anexado.

*CT-02 — Pendência fechada*

- **Dado que** a decisão tomada
- **Quando** a equipe consultar a lista de decisões em aberto
- **Então** a pendência N3 não aparece mais como aberta.

*CT-03 — Implementação planejada*

- **Dado que** a política definida
- **Quando** a equipe abrir o backlog
- **Então** há uma história que implementa a regra no cadastro, com critérios de aceite e estimativa.


**Entrega a decisão:** N3: Política para menores de 18 anos (o cadastro de aluno hoje não impede)

### E16 · Relatório de impacto e selos (pós-MVP)

**Release:** Pós-MVP · Versões futuras · **Prioridade:** P3 Baixa · **4 itens, 24 pontos**

**Objetivo:** Relatório de impacto social e selos de empresas e apoiadores, depois que o MVP estiver no ar.

**Por que importa:** Prestação de contas e reconhecimento. O responsável do produto decidiu que não fazem parte do MVP (decisão D24).

#### [P3] Relatório de impacto social para apoiadores

**Código:** E16-S01 · **Tipo:** Story · **Pontos:** 8 · **Release:** PM

**História de usuário**

Como apoiador do Hub+, quero ver o resultado do que financiei em um relatório simples, para prestar contas à minha organização e decidir se continuo apoiando.

**Checklist de critérios de aceitação**

- [ ] O relatório mostra, para o período escolhido, alunos formados, certificados emitidos, contratações e bairros de origem.
- [ ] O relatório pode ser exportado em PDF e em CSV com os mesmos números da tela.
- [ ] O relatório não contém nome, e-mail nem outro dado que identifique uma pessoa.
- [ ] Bairros com menos de 5 pessoas aparecem agrupados como "Outros".

**Casos de teste**

*CT-01 — Totais batem com os dados*

- **Dado que** um período com 120 certificados emitidos e 8 contratações validadas registrados no sistema
- **Quando** o relatório for gerado para esse período
- **Então** a tela mostra 120 certificados e 8 contratações, e a soma por bairro é igual ao total de alunos formados.

*CT-02 — Exportação em PDF e CSV*

- **Dado que** o relatório do mesmo período na tela
- **Quando** o usuário exportar em PDF e em CSV
- **Então** os dois arquivos trazem os mesmos números da tela e identificam o período e a data de geração.

*CT-03 — Dados anonimizados*

- **Dado que** um bairro com 3 alunos formados e outro com 40
- **Quando** o relatório for gerado
- **Então** o bairro de 3 alunos aparece dentro de "Outros", o de 40 aparece com o nome, e nenhum nome ou e-mail existe na tela, no PDF ou no CSV.


#### [P3] Selo e página de transparência do apoiador

**Código:** E16-S02 · **Tipo:** Story · **Pontos:** 8 · **Release:** PM

**História de usuário**

Como apoiador, quero uma página pública que mostre minha contribuição e o impacto dela, para divulgar meu apoio ao Hub+ com a minha marca.

**Checklist de critérios de aceitação**

- [ ] Página pública por apoiador, com selo e métricas.
- [ ] O apoiador autoriza a exibição do nome e da logo.

**Casos de teste**

*CT-01 — Página pública com autorização*

- **Dado que** um apoiador que autorizou a exibição do nome e da logo
- **Quando** qualquer pessoa abrir a página pública dele
- **Então** a página mostra nome, logo, selo e as métricas de impacto, sem exigir login.

*CT-02 — Sem autorização, sem página*

- **Dado que** um apoiador que não autorizou a exibição do nome e da logo
- **Quando** alguém abrir o endereço da página dele
- **Então** a página devolve 404 e o nome e a logo não aparecem em nenhuma lista pública.

*CT-03 — Revogar a autorização*

- **Dado que** um apoiador com página pública ativa
- **Quando** ele revogar a autorização
- **Então** a página deixa de existir imediatamente, o endereço devolve 404 e o selo some da listagem de apoiadores.


**Depende de:** E09-S01 (Doação de empresas e apoiadores)

#### [P3] Coleta opcional de dados para medir impacto

**Código:** E16-S03 · **Tipo:** Story · **Pontos:** 5 · **Release:** PM

**História de usuário**

Como Hub+, quero coletar de forma opcional dados que ajudem a medir o impacto social, para provar os resultados aos apoiadores sem expor nenhum jovem.

**Checklist de critérios de aceitação**

- [ ] Perguntas opcionais (renda familiar, primeiro emprego) com consentimento.
- [ ] Uso só agregado e anonimizado nos relatórios.

**Casos de teste**

*CT-01 — Perguntas são opcionais*

- **Dado que** um aluno diante das perguntas de renda familiar e primeiro emprego
- **Quando** ele pular todas as perguntas
- **Então** ele continua usando a plataforma normalmente e nenhum dado de impacto é gravado para ele.

*CT-02 — Sem consentimento, sem gravação*

- **Dado que** um aluno que respondeu às perguntas sem marcar o consentimento
- **Quando** ele enviar o formulário
- **Então** a API recusa o envio com status 400 e as respostas não são gravadas.

*CT-03 — Uso só agregado*

- **Dado que** respostas de 60 alunos com consentimento gravadas
- **Quando** o admin consultar o relatório de impacto e a API de administração
- **Então** os resultados aparecem só em totais e percentuais, e nenhuma rota devolve a resposta de um aluno específico.


#### [P3] Selos das empresas (Bronze, Prata e Ouro)

**Código:** E16-S04 · **Tipo:** Story · **Pontos:** 3 · **Release:** PM

**História de usuário**

Como Hub+, quero atribuir um selo a cada empresa conforme o plano, para reconhecer quem investe no Banco de Talentos.

**Checklist de critérios de aceitação**

- [ ] Os selos Bronze, Prata e Ouro e a regra de cada um ficam registrados em `docs/DECISIONS.md`.
- [ ] O selo aparece no perfil da empresa e nos convites que o aluno recebe.
- [ ] Mudar de plano muda o selo.

**Casos de teste**

*CT-01 — Regra dos selos registrada*

- **Dado que** a decisão A10 respondida pelo responsável do produto
- **Quando** o item for entregue
- **Então** docs/DECISIONS.md registra a regra de cada selo (Bronze, Prata e Ouro) e o plano ao qual corresponde.

*CT-02 — Selo aparece para empresa e para o aluno*

- **Dado que** uma empresa no plano que dá o selo Prata
- **Quando** ela abrir o perfil da empresa e enviar um convite a um aluno
- **Então** o selo Prata aparece no perfil da empresa e no convite que o aluno recebe.

*CT-03 — Mudar de plano muda o selo*

- **Dado que** uma empresa com selo Bronze
- **Quando** ela trocar para o plano que dá o selo Ouro
- **Então** o selo passa a ser Ouro no perfil e nos novos convites, e os convites já enviados mantêm o selo da época.


**Depende de:** E08-S02 (Modelar os planos e limites das empresas)

**Bloqueada pela decisão:** A10: Planos corporativos: limites de perfis e preços (os selos ficam para o pós-MVP)

### E14 · Melhorias e dívida técnica identificadas

**Release:** R2 · Lançamento público · **Prioridade:** P2 Média · **6 itens, 18 pontos**

**Objetivo:** Pagar a dívida que apareceu durante a construção.

**Por que importa:** Evita que atalhos do MVP virem bugs em produção.

#### [P1] Expor `submissionId` e `inPortfolio` no `/courses/:slug/learn`

**Código:** E14-S01 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como aluno, quero que a tela de portfólio mostre exatamente quais entregas aprovadas ainda não viraram projeto, para não ver sugestões erradas.

**Checklist de critérios de aceitação**

- [ ] A resposta de GET /courses/:slug/learn traz, em cada desafio com entrega, o id da entrega e se ela já está no portfólio.
- [ ] A tela de portfólio usa esses campos e deixa de comparar títulos.
- [ ] Entrega aprovada sem item de portfólio aparece como sugestão e entrega já adicionada não aparece.
- [ ] Dois desafios com o mesmo título em cursos diferentes não se confundem.

**Casos de teste**

*CT-01 — Entrega aprovada fora do portfólio*

- **Dado que** uma entrega aprovada que ainda não virou projeto
- **Quando** o aluno abrir a tela de portfólio
- **Então** a entrega aparece como sugestão para adicionar e o campo inPortfolio da API vem como falso.

*CT-02 — Entrega já adicionada*

- **Dado que** uma entrega aprovada que já virou projeto validado
- **Quando** o aluno abrir a tela de portfólio
- **Então** a entrega não aparece como sugestão e o campo inPortfolio da API vem como verdadeiro.

*CT-03 — Títulos iguais em cursos diferentes*

- **Dado que** dois cursos com um desafio chamado "Calendário editorial", e só um deles já está no portfólio
- **Quando** o aluno abrir a tela de portfólio
- **Então** a sugestão aparece apenas para o desafio do curso que ainda não foi adicionado.


#### [P3] Componente de seleção próprio e acessível

**Código:** E14-S02 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como pessoa que usa o Hub+, quero campos de seleção iguais ao desenho e acessíveis, para escolher opções sem depender do visual de cada navegador.

**Checklist de critérios de aceitação**

- [ ] O componente abre e fecha por clique e pelo teclado (Enter, Espaço, setas e Esc).
- [ ] O leitor de tela anuncia o rótulo, a opção atual e a quantidade de opções.
- [ ] O componente tem aparência correta nos temas claro e escuro.
- [ ] Todos os selects dos formulários (ordenação do catálogo, porte e setor da empresa, estado, tipo de chave Pix) usam o novo componente.

**Casos de teste**

*CT-01 — Uso só com teclado*

- **Dado que** o formulário de cadastro da empresa
- **Quando** a pessoa focar o campo "Porte" e usar Enter, seta para baixo e Enter
- **Então** a lista abre, a opção seguinte é marcada e o valor selecionado aparece no campo, sem usar o mouse.

*CT-02 — Leitor de tela*

- **Dado que** o campo "Tipo da chave" com um leitor de tela ativo
- **Quando** o foco chegar ao campo
- **Então** o leitor anuncia o rótulo "Tipo da chave", a opção atual e a quantidade de opções.

*CT-03 — Temas claro e escuro*

- **Dado que** o campo de ordenação do catálogo
- **Quando** a pessoa alternar entre os temas
- **Então** o campo, a lista aberta e a opção marcada mantêm contraste mínimo de 4,5 para 1 nos dois temas.

*CT-04 — Sem select nativo restante*

- **Dado que** o código do front-end
- **Quando** a equipe buscar pela tag select nos formulários
- **Então** nenhum formulário usa o select nativo.


#### [P1] Validar que o arquivo existe no R2 ao criar a aula ou a entrega

**Código:** E14-S03 · **Tipo:** Task · **Pontos:** 3 · **Release:** R1 · **Sprint:** 6

**História de usuário**

Como mentor ou aluno, quero ser avisado se o arquivo que enviei não chegou ao armazenamento, para não salvar uma aula ou entrega com arquivo inexistente.

**Checklist de critérios de aceitação**

- [ ] Antes de aceitar videoKey de aula, coverKey e anexos de entrega, a API confere no R2 que o objeto existe.
- [ ] Quando o arquivo não existe, a API responde com status 400 e uma mensagem clara de que o envio não terminou.
- [ ] Chaves que não pertencem ao curso ou ao aluno continuam sendo recusadas.
- [ ] A checagem é coberta por teste com o R2 simulado.

**Casos de teste**

*CT-01 — Aula com vídeo inexistente*

- **Dado que** um mentor que pediu a URL de envio mas não enviou o arquivo
- **Quando** ele criar a aula com o videoKey recebido
- **Então** a API responde com status 400 dizendo que o envio do vídeo não terminou e nenhuma aula é criada.

*CT-02 — Aula com vídeo enviado*

- **Dado que** um vídeo enviado de verdade ao R2
- **Quando** o mentor criar a aula com o videoKey
- **Então** a aula é criada com status 201 e aparece como "com vídeo".

*CT-03 — Anexo de entrega inexistente*

- **Dado que** uma aluna que gerou a URL de anexo mas não enviou o PDF
- **Quando** ela enviar a entrega com a chave do anexo
- **Então** a API responde com status 400 e a entrega não é gravada.

*CT-04 — Chave de outro curso*

- **Dado que** um videoKey que pertence a outro curso e existe no R2
- **Quando** o mentor tentar usá-lo na própria aula
- **Então** a API continua respondendo com status 400 por prefixo inválido.


**Depende de:** E05-S01 (Configurar o R2 de produção e testar envio real)

#### [P1] Garantir no banco que só há um convite aberto por empresa e talento

**Código:** E14-S04 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como empresa, quero que dois cliques simultâneos não criem convites duplicados para o mesmo talento, para não incomodar a pessoa nem poluir o histórico.

**Checklist de critérios de aceitação**

- [ ] O banco tem um índice único parcial que impede dois convites em andamento (enviado, aceito ou contratado) da mesma empresa para o mesmo talento.
- [ ] Duas requisições simultâneas resultam em um convite criado e uma resposta de conflito.
- [ ] A mensagem de conflito é a mesma de hoje.
- [ ] Convite recusado, retirado ou contratado e depois encerrado não impede um novo convite quando a regra atual permite.

**Casos de teste**

*CT-01 — Duas requisições simultâneas*

- **Dado que** uma empresa cadastrada e um talento visível
- **Quando** a empresa enviar dois convites ao mesmo tempo para esse talento
- **Então** exatamente um convite é criado com status 201 e o outro recebe status 409 com a mensagem "Você já tem um convite em andamento para este talento."

*CT-02 — Convite sequencial*

- **Dado que** um convite já enviado e ainda sem resposta
- **Quando** a empresa tentar enviar outro
- **Então** a API responde com status 409 e a mesma mensagem de antes.

*CT-03 — Novo convite depois de recusa*

- **Dado que** um convite recusado pelo talento
- **Quando** a empresa enviar um novo convite
- **Então** o convite é criado com status 201.

*CT-04 — Índice no banco*

- **Dado que** a migração aplicada
- **Quando** a equipe tentar inserir direto no banco dois convites em andamento iguais
- **Então** o banco recusa a segunda inserção por violação do índice único.


#### [P2] Padronizar códigos de erro da API

**Código:** E14-S05 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como pessoa que desenvolve o front-end do Hub+, quero um código de erro estável em cada resposta de erro da API, para tratar os casos sem depender do texto da mensagem.

**Checklist de critérios de aceitação**

- [ ] Todo erro da API devolve, além de message, um campo code estável em letras maiúsculas (por exemplo EMAIL_ALREADY_EXISTS).
- [ ] Mudar o texto da mensagem não muda o code.
- [ ] O front-end trata por code os fluxos críticos: login, cadastro, compra, entrega de desafio e saque.
- [ ] A lista de códigos está documentada em docs/API.md.

**Casos de teste**

*CT-01 — Código no erro de cadastro*

- **Dado que** uma conta já existente com o e-mail ana@teste.com
- **Quando** outra pessoa tentar se cadastrar com o mesmo e-mail
- **Então** a API responde com status 409 e o corpo traz message e o code correspondente a e-mail já cadastrado.

*CT-02 — Mensagem muda, código não*

- **Dado que** o texto da mensagem de e-mail duplicado alterado
- **Quando** o mesmo cadastro duplicado for repetido
- **Então** o code continua igual e o front-end exibe o aviso correto.

*CT-03 — Erro de validação*

- **Dado que** um cadastro com senha de 3 caracteres
- **Quando** a API receber a requisição
- **Então** ela responde com status 400, code de dados inválidos e a lista de campos com problema.

*CT-04 — Documentação completa*

- **Dado que** os códigos implementados
- **Quando** a equipe comparar o código com docs/API.md
- **Então** todo code usado pela API aparece na lista documentada.


#### [P2] Padronizar cache e chaves das consultas no front-end

**Código:** E14-S06 · **Tipo:** Task · **Pontos:** 3 · **Release:** R2

**História de usuário**

Como aluno, quero que os painéis reflitam o que acabei de fazer, para ver a aula concluída sem precisar recarregar a página.

**Checklist de critérios de aceitação**

- [ ] As chaves das consultas são criadas por uma fábrica central, sem strings soltas nas telas.
- [ ] Cada ação (concluir aula, entregar desafio, aprovar entrega, pedir saque) invalida as consultas afetadas.
- [ ] O painel do aluno mostra a aula concluída e a nova sequência logo ao voltar para a tela inicial.
- [ ] Existe teste do front-end que cobre a atualização do painel depois de concluir uma aula.

**Casos de teste**

*CT-01 — Painel atualiza depois de concluir aula*

- **Dado que** uma aluna no painel com 2 aulas concluídas
- **Quando** ela concluir uma aula no player e voltar ao painel
- **Então** o painel mostra 3 aulas concluídas e a atividade de hoje atualizada, sem recarregar a página.

*CT-02 — Mentor corrige e o aluno vê*

- **Dado que** uma entrega aguardando correção
- **Quando** o mentor pedir ajustes e a aluna abrir o painel
- **Então** o desafio aparece como "Ajustes pedidos" com o feedback do mentor.

*CT-03 — Chaves centralizadas*

- **Dado que** o código do front-end
- **Quando** a equipe buscar por arrays de queryKey escritos direto nas telas
- **Então** todas as chaves vêm da fábrica central.


## 9. Decisões que bloqueiam o trabalho

As decisões **A** estão em `docs/DECISIONS.md`. As **N** foram levantadas neste planejamento e devem virar decisão registrada ali quando respondidas.

| Decisão | Pergunta | Quem resolve | Itens que dependem dela | Precisa estar resolvida até |
|---|---|---|---|---|
| **A11** | Provedor de e-mail transacional | spike E04-S01 (Sprint 1) | E04-S02 | início da Sprint 2 |
| **N5** | Reembolso depois da janela de 7 dias: política e quem arca | **PO** | E02-S04, E13-S02 | início da Sprint 2 |
| **N1** | Hospedagem de produção (API, banco e front-end) | spike E01-S04 (Sprint 1) | E01-S05 | início da Sprint 4 |
| **A9** | Pix no Stripe Brasil e Stripe Connect para saque automático | spike E02-S01 (Sprint 1) | E02-S03 | início da Sprint 6 |
| **A14** | Quem arca com a taxa do Stripe e valores reais da taxa | **PO** | E02-S05, E10-S06 | início da Sprint 7 |
| **A6** | Logo em alta resolução ou vetorial | **PO** | E12-S05 | sem sprint definida |
| **A8** | Como a doação de empresas é recebida | **PO** | E09-S01, E09-S02 | sem sprint definida |
| **A10** | Planos corporativos: limites de perfis e preços (os selos ficam para o pós-MVP) | **PO** | E08-S02, E08-S03, E16-S04 | sem sprint definida |
| **A12** | Taxa de intermediação sobre contratação | **PO** | E08-S04 | sem sprint definida |
| **A13** | Verificação de identidade do mentor e antifraude de saque | **PO** | E07-S01 | sem sprint definida |
| **N2** | Curso passa por aprovação do admin antes de publicar, ou é publicado direto e revisado depois? | **PO** | E07-S02 | sem sprint definida |
| **N3** | Política para menores de 18 anos (o cadastro de aluno hoje não impede) | spike E13-S05 (Sprint 1) | — | sem sprint definida |
| **N4** | Regime fiscal e emissão de nota fiscal (retenção do Hub+ e repasse ao mentor) | spike E13-S01 (Sprint 1) | E13-S03 | sem sprint definida |
| **N6** | Vídeo: processar no próprio servidor (FFmpeg + R2) ou usar um serviço gerenciado (por exemplo Cloudflare Stream) | spike E05-S03 (Sprint a planejar) | E05-S04 | sem sprint definida |

## 10. Riscos e dependências externas

| # | Risco ou dependência | Efeito | Resposta |
|---|---|---|---|
| 1 | Os spikes da Sprint 1 dependem de terceiros (contador, jurídico, provedores) e a decisão N5 depende do PO | Atraso nelas bloqueia deploy, e-mail, reembolso e nota fiscal nas sprints seguintes | Agendar as conversas antes da Sprint 1. Cada resposta vira entrada em `DECISIONS.md` |
| 2 | Ativação da conta Stripe em produção depende de documentos e aprovação do Stripe | Pode levar dias ou semanas e atrasar o piloto | Iniciar o cadastro já na Sprint 1 (E02-S11) |
| 3 | Cobrar sem resolver a questão fiscal (N4) | Risco legal e de multa desde o primeiro pagamento | Parecer da contabilidade na Sprint 1 (E13-S01) como condição do go/no-go |
| 4 | Velocidade desconhecida | O número de sprints do R1 pode estar errado | Recalibrar ao fim da Sprint 1 e da Sprint 3, e ajustar o corte de escopo |
| 5 | Vídeos grandes enviados por celular podem falhar no piloto (upload em PUT único) | Mentor desiste de publicar | Limitar o tamanho no piloto e orientar. Se houver falhas, antecipar E05-S02 para o R1 |
| 6 | Aluno menor de 18 anos entra sem controle | Risco de LGPD | Decisão N3 na Sprint 1 e história de implementação logo depois |
| 7 | Pix pode não estar disponível no Stripe Brasil (A9) | Conversão menor entre o público jovem | Validar na Sprint 1. Se faltar, avaliar outro gateway só para Pix |
| 8 | Dependência de provedores externos (e-mail, R2, Stripe, hospedagem) | Queda externa afeta a operação | Observabilidade (E01-S07) e degradação graciosa: falha de e-mail não pode quebrar o cadastro |

## 11. Jira

### O que eu não consegui fazer

Não consigo criar os itens no Jira daqui: o conector da Atlassian precisa ser **autorizado por você** nas configurações de conectores do claude.ai. Enquanto isso, o backlog está pronto para importação por CSV.

### Configuração sugerida do projeto

- Projeto **Scrum** (gerenciado pela empresa), chave **HUB**.
- Tipos de item: Epic, Story, Task e Bug. Spike entra como Task com o rótulo `spike`.
- Componentes: `api`, `web`, `infra`, `docs`.
- Versões (fix version): `R1 · Piloto fechado`, `R2 · Lançamento público`, `R3 · Receita corporativa e impacto`.
- Fluxo de trabalho: Backlog → Refinado → Em andamento → Em revisão → Em teste → Concluído. "Refinado" é o DoR cumprido.
- Rótulos usados: release (`r1`, `r2`, `r3`), épico (`e01` a `e14`), área e `decisao-<id>` para itens bloqueados por decisão.
- Quadro com filtro rápido por release e por "bloqueado por decisão".

### Como importar o CSV

1. Jira: **Configurações → Sistema → Importação de sistema externo → CSV**. Use um projeto de teste primeiro.
2. Envie `docs/jira/hub-backlog.csv` (codificação UTF-8, vírgula como delimitador).
3. Mapeie os campos: `Issue Id` para o ID do item, `Parent` para Pai (ou Link do épico, se o campo Pai não aparecer), `Story Points` para a estimativa de story points, `Sprint`, `Fix Version/s`, `Priority`, `Description`, `Summary`, `Issue Type`, e cada uma das colunas repetidas `Labels` e `Component/s`. **`Epic Name` não deve ser mapeado:** o Jira Cloud atual não tem mais esse campo e o nome do épico é o próprio `Summary`.
4. Rode a importação. Confira um épico e algumas histórias antes de importar tudo.

As dependências entre histórias ficam escritas na descrição de cada item. Os vínculos "bloqueia" podem ser criados depois, ou por mim quando o conector estiver autorizado.

### Para eu criar tudo direto no Jira

Depois de autorizar o conector da Atlassian, me diga: o site do Jira, a chave do projeto, o nome dos tipos de item (por exemplo "História" em vez de "Story") e se a estimativa usa "Story Points" ou "Estimativa de pontos". Eu crio os épicos, histórias, vínculos e sprints, e confiro o resultado.

## 12. Acordos de trabalho sugeridos

- **Planejamento** no primeiro dia da sprint, com a meta escrita em uma frase. **Refinamento** semanal, de uma hora, para deixar duas sprints à frente como "Refinado".
- **Daily** de 15 minutos, focada em bloqueios. Decisões pendentes entram aqui como impedimento, com responsável e data.
- **Revisão** com demonstração em staging, aberta a quem usa o produto (mentores e alunos do piloto).
- **Retrospectiva** a cada sprint, com no máximo duas ações, registradas no quadro.
- **Mudança de escopo** no meio da sprint só entra trocando por item de mesmo tamanho.
- **Dívida técnica** reservada: pelo menos 10% da capacidade de cada sprint.

