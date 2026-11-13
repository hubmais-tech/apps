# Decisões do projeto Hub+

Registro das decisões tomadas e das ainda abertas. Atualizar sempre que uma decisão mudar, com data.

Legenda: **Decidido** (confirmado pelo responsável do projeto), **Proposto** (recomendação minha, aguardando confirmação), **Aberto** (sem resposta).

## D1. Não existe perfil "sponsor" (Decidido, 2026-11-09)

Empresas que financiam bolsas não têm acesso à plataforma. O processo é parecido com doações a ONGs: a empresa doa o valor diretamente ao Hub+ e recebe selo, relatório de impacto e demais contrapartidas.

Consequências:
- Perfis da plataforma: **student, mentor, company, admin**.
- Doações são registradas pelo admin (ou por uma página pública de doação, a definir). Não há login de patrocinador.
- Selos "Apoiador da Juventude" e relatórios de impacto de patrocinadores seriam emitidos pelo admin. **Ficam para o pós-MVP** (D24).
- A tabela de doações é separada da de pedidos de curso (ver D3).

## D2. Perfis e permissões (Decidido, 2026-11-09)

| Perfil | Pode |
|---|---|
| student | Comprar cursos, assistir, fazer desafios, manter portfólio, participar do Banco de Talentos |
| mentor | Criar e publicar cursos, corrigir desafios, ver a carteira e sacar |
| company | Buscar talentos, contratar, assinar plano corporativo. A conta é cadastrada pelo Hub+ (D23) |
| admin | Curadoria, cadastrar empresas (D23), doações, ver a receita e a retenção do Hub+. Relatórios de impacto e selos ficam para o pós-MVP (D24) |

## D3. Carteira estilo Kiwify, Ticto e Cakto (Decidido, 2026-11-09)

- O mentor vê tudo dentro da plataforma (vendas, saldo, extrato) e saca para a conta bancária pessoal.
- O Hub+ também terá uma carteira, no perfil admin, **com o mesmo modelo e a mesma plataforma** (decidido em 2026-11-10): o admin vê as retenções, o saldo e o extrato do Hub+ do mesmo jeito que o mentor vê os dele.

Detalhes técnicos (Decidido em 2026-11-10, incluindo a janela de garantia D7):
- **Ledger interno** com lançamentos imutáveis (venda, taxa do Hub+, estorno, saque). O saldo é sempre a soma dos lançamentos. Nunca um campo editado direto, como `accountBalance` no repositório base.
- **Saldo pendente e disponível:** a venda entra como pendente e é liberada após uma janela de garantia. O CDC dá 7 dias de arrependimento em compra online. Confirmar o prazo com contador ou advogado.
- **Saque** por Pix para a chave do mentor, com valor mínimo e taxa de saque definidos pelo Hub+.
- **Dinheiro sempre em centavos** e toda movimentação dentro de transação do banco.

## D4. Gateway de pagamento (Decidido: Stripe, 2026-11-10)

O requisito é de marketplace: o aluno paga ao Hub+ e o valor se divide entre mentor e Hub+, com saque do mentor. Isso exige split, ou o Hub+ receber tudo e repassar.

Fontes: pesquisas feitas em 2026-11-09 em páginas oficiais e comparativos de terceiros. As fontes divergem entre si em alguns valores, então **toda taxa abaixo precisa ser confirmada no site oficial ou em contrato antes da decisão final**.

| | Asaas | AbacatePay | Stripe | Pagar.me | Mercado Pago |
|---|---|---|---|---|---|
| Pix | R$ 1,99 padrão (R$ 0,99 promocional por 3 meses) | R$ 0,80 fixo | 1,19% (alguns relatos dizem que é só por convite no Brasil) | cerca de 0,99% (oferta antiga) | a partir de 0,99% |
| Cartão de crédito | de R$ 0,49 + 1,99% a 2,99% à vista (promo versus padrão divergem) | a partir de 3,5% + R$ 0,60 | 3,99% + R$ 0,39 | cerca de 4,19% (oferta antiga) | a partir de 3,99% (30 dias) |
| Split nativo | Sim, via subcontas e `walletId` | **Não ainda** (anunciado, sem data) | Sim, via Connect (taxas do Connect no Brasil não encontradas) | Sim, `split_rules` | Sim, `marketplace_fee` com OAuth |
| Subcontas e KYC do mentor | Sim | Não | Sim (contas conectadas) | Sim (recebedores) | Sim (vendedor autorizado) |
| Saque do mentor | Transferência da subconta | Hub+ paga o mentor por Pix (`/pix/create`), com taxa por saque | Payouts do Connect | Recebedor tem saque | Conta do vendedor |
| Já usado no repositório base | **Sim** | Não | Não | Não | Não |
| Ponto de atenção | Taxa de split negociada em contrato, chargeback de cartão pouco claro | Hub+ passa a segurar dinheiro de terceiros | Cartão nacional liquida em 30 dias, restrições de câmbio | Integração mais técnica | Taxas variam por canal |

### Parecer

1. **Asaas é uma boa opção para este projeto, mas não a única.** É o único que reúne split nativo, subcontas com cadastro do mentor, Pix e saque, já está no repositório base e tem taxa competitiva em Pix. O ponto fraco é a taxa de cartão, que fica alta, e o custo de split, que não é publicado.
2. **AbacatePay tem a taxa de Pix mais barata e uma API simples, mas hoje não tem split.** Para usar, o Hub+ receberia tudo e pagaria cada mentor por Pix. Isso funciona e combina com o ledger interno de D3, mas o Hub+ passa a custodiar dinheiro de terceiros. Isso tem implicação regulatória e contábil. Só vale se o contador e o advogado aprovarem. Reavaliar quando o split for lançado.
3. **Stripe é mais forte em cartão internacional e em SaaS por assinatura.** Para um público de Aracaju que paga por Pix, ele traz pouco benefício e tem restrições no Brasil. Não recomendo para o MVP.
4. **Pagar.me e Mercado Pago** são alternativas se a negociação com o Asaas não avançar. O Pagar.me é o mais voltado a marketplace. O Mercado Pago tem fricção de OAuth por vendedor.

**Recomendação:** começar com **Asaas**, mas isolando o gateway atrás de uma interface (`PaymentGateway`) para poder trocar sem mexer no ledger nem nas rotas. Pedir ao Asaas uma proposta por escrito com a taxa de split e a política de chargeback antes de ir para produção.

### Decisão (2026-11-10): Stripe

O responsável pelo projeto escolheu o **Stripe**, por familiaridade. Consequências que precisam ser tratadas:

- O gateway fica atrás da interface `PaymentGateway`. A implementação do MVP usa o **Stripe Checkout** (cobrança na conta da plataforma) com webhook para confirmar o pagamento.
- O Stripe não faz split para o mentor sem **Stripe Connect**, e a disponibilidade e as taxas do Connect para contas brasileiras **não foram confirmadas** na pesquisa. Por isso o MVP **não usa Connect**: o dinheiro entra na conta do Hub+, a divisão é feita no ledger interno (D3) e o **saque do mentor é uma solicitação** que o admin marca como paga depois de transferir por Pix fora do Stripe. Migrar o saque para Connect, ou para outro meio, é trabalho futuro.
- Pix no Stripe Brasil: relatos divergem (disponível, ou só por convite). Confirmar na conta. O cartão nacional liquida em cerca de 30 dias, o que combina com a janela de garantia (D7).
- Se o Stripe não habilitar Pix, a conversão cai e o público-alvo (Aracaju) paga principalmente por Pix. Vale validar isso antes do lançamento.

## D5. Logo (Decidido, 2026-11-09)

O logo é a foto de perfil do Instagram `@hub.mais`: letras brancas "HUB+" sobre fundo em degradê vermelho-alaranjado. Salvo em `docs/images/logo-hubmais-instagram.jpg`.

Em 2026-11-10: usar este arquivo por enquanto. O responsável providencia uma versão melhor. Limite: o arquivo tem **150x150 px**, resolução baixa para uso no site. Antes da fase 1, é preciso o arquivo original em alta resolução ou vetorial (SVG). Até lá, uso o JPG só como referência de cor e forma.

## D6. Cores (Decidido, 2026-11-09)

Principais: roxo `#5900B0`, areia `#F3CC9F`, laranja `#F26303`. O laranja combina com o degradê do logo.

Em 2026-11-10, a decisão de tema escuro como padrão (vinda da referência do Creem) foi **revertida**. Ver D11.

## D11. Direção visual "Hub+ Workspace" (Decidido, 2026-11-10)

As duas primeiras versões do front-end foram descartadas: tinham cara de landing page (hero em gradiente, botões em pílula, fonte de display, tema escuro forçado) e não de produto. As referências enviadas pelo responsável (Tutor, ITschool, Fobework, Cantilever, Focotech, Fastpay, earnify, Braintrust, DevRel City, Untitled UI, Cadence e o vídeo do painel Autohire) convergem para um painel de SaaS limpo, e a pesquisa de tendências de 2026 confirma: flat, alto contraste, orientado a dados, paleta contida.

Decisões:

- **Tema claro como padrão.** Fundo lilás-cinza muito claro, cards brancos com borda de 1 px, quase sem sombra. Tema escuro fica como opção da pessoa.
- **Uma cor de ação: o roxo `#5900B0`.** O laranja `#F26303` é reservado para progresso, selos e um único destaque por tela. A areia `#F3CC9F` vira superfície pastel de categoria, ao lado de lilás e menta claros.
- **Tipografia neutra**, sem fonte de display: títulos de 24 a 28 px em peso 600, corpo em 14 px.
- **Shell de produto:** sidebar fixa de 256 px com grupos por perfil, item ativo em roxo a 8% de opacidade; topo com saudação, busca, notificações e avatar. No celular, barra inferior com 4 abas.
- **Botões retangulares** com raio de 8 px e cor sólida. Cards com raio de 12 px.
- **Telas de referência:** painel do aluno com tiles de estatística e "continuar estudando"; player com vídeo grande, acordeão de módulos (concluído, em andamento, bloqueado) e abas; carteira com 4 tiles, atividade, histórico de saques e ações rápidas; cadastro em tela dividida com foto real e stepper.
- **Processo:** um protótipo estático em HTML (`docs/design/`) é aprovado antes de reescrever o `web/`, para evitar uma terceira reescrita às cegas.

## D7. Janela de garantia (Decidido, 2026-11-10)

A venda entra no saldo do mentor como **pendente** e vira **disponível** depois de 7 dias (configurável por variável de ambiente `WALLET_HOLD_DAYS`). Isso cobre o direito de arrependimento do CDC e o tempo de liquidação do gateway. Reembolso dentro da janela cancela o lançamento pendente.

## D8. Stack do front-end (Decidido, 2026-11-10)

React Router DOM entra no projeto.

## D9. Vídeos (Decidido, 2026-11-10)

Vídeos ficam num bucket do Cloudflare R2, com upload por URL pré-assinada e leitura por URL assinada de curta duração (só quem comprou o curso assiste).

## D10. Escopo do MVP (Decidido, 2026-11-10)

MVP são as fases 1 a 4 do `PLAN.md`: estrutura e design system, auth com perfis e CASL, cursos com upload no R2 e catálogo, compra com Stripe, carteira e matrícula.

## D12. Cadastro e onboarding por perfil (Decidido, 2026-11-10)

O cadastro deixa de ser igual para todos. A conta nasce com nome, e-mail, senha e perfil, e cada perfil passa por um onboarding próprio logo depois:

- **Aluno:** onboarding leve e **pulável**: data de nascimento, cidade e bairro, WhatsApp, interesses e objetivo. Nada disso bloqueia o uso. **Sem CPF** (mantém a correção ao `hubmais-tech/api`).
- **Mentor:** onboarding **obrigatório**, chamado de **"abrir a carteira"** (D13).
- **Empresa:** não há onboarding de cadastro: o Hub+ cadastra a empresa e a pessoa só ativa o acesso pelo convite (D23, que substituiu o onboarding com CNPJ da D14).

O front-end redireciona para o onboarding enquanto ele não estiver completo. A trava real fica na API (CASL), não só na tela.

## D13. Mentor precisa abrir a carteira antes de usar a plataforma (Decidido, 2026-11-10)

Enquanto o mentor não abrir a carteira, ele **não cria cursos, não vê a carteira e não pede saque**. Para abrir, informa:

- Dados pessoais: nome completo, **CPF**, data de nascimento e telefone.
- Recebimento: tipo e chave Pix.
- Perfil de mentor: mini bio e áreas de atuação.
- Aceite dos termos de mentoria e de repasse (janela de garantia de 7 dias, retenção do Hub+).

Regras:

- O CPF é validado pelos dígitos verificadores, guardado só com números, único por conta e exibido mascarado (`***.456.789-**`). O CPF **só existe no mentor**, porque é necessário para pagar Pix.
- A carteira é "aberta" quando existe a conta do mentor (`mentor_accounts`). A permissão do CASL para criar curso, ver a carteira e sacar depende disso.
- O saque usa a chave Pix cadastrada na conta, sem digitar a chave a cada pedido. O mentor pode trocar a chave nas configurações.
- A chave Pix e o CPF aparecem completos só para o admin que paga o saque.

## D14. Empresa: CNPJ e representantes (Decidido, 2026-11-10; cadastro inicial substituído pela D23)

> **Atenção:** o primeiro cadastro da empresa (quem preenche o CNPJ e vira representante principal) é feito pelo Hub+, conforme a D23. O restante desta decisão (representantes, convite com link, visibilidade dos dados) continua valendo. O "representante principal" passou a se chamar **responsável pela conta**.

- O cadastro da empresa pede **CNPJ** (validado pelos dígitos verificadores; sem consulta à Receita no MVP), razão social, nome fantasia, setor, porte, cidade e site opcional.
- Quem cadastra vira o **representante principal** (nome, cargo, telefone).
- Dentro da plataforma, a empresa cadastra **outros representantes**: nome, cargo, e-mail e telefone. Cada representante pode receber um **convite com link** para criar a própria senha e acessar a empresa.
- Não há envio de e-mail ainda (ver A11): o link do convite é mostrado na tela para a empresa copiar.
- Todos os representantes de uma empresa enxergam os mesmos dados da empresa. Só o principal remove representantes.
- A empresa só acessa o Banco de Talentos com o cadastro completo.

## D15. Uploads com dropzone (Decidido, 2026-11-10)

Capas e vídeos usam um componente de **arrastar e soltar** com pré-visualização e barra de progresso, enviando direto ao R2 por URL pré-assinada (o binário não passa pela API). Limites:

- Capa: JPG, PNG ou WebP, até 5 MB.
- Vídeo de aula: MP4, WebM ou MOV, até 2 GB.
- Arquivo de entrega de desafio: imagem, PDF ou ZIP, até 25 MB.

A validação de tipo e tamanho acontece no navegador e de novo na API ao gerar a URL.

## D16. Desafios, entregas e certificado (Decidido, 2026-11-10)

- Um **desafio** pertence a um curso e é criado pelo mentor, com enunciado e critérios.
- O aluno matriculado faz a **entrega** com texto, links e arquivos. O mentor **aprova** ou **pede ajustes**, com feedback escrito. O aluno pode reenviar.
- O **certificado** é emitido automaticamente quando o aluno conclui todas as aulas **e** tem todos os desafios do curso aprovados. Tem código de verificação e uma página pública de validação.
- O certificado é uma página HTML com estilo de impressão. Não há geração de PDF no servidor.

## D17. Portfólio (Decidido, 2026-11-10)

- Uma entrega aprovada pode virar **item de portfólio**, por escolha do aluno. O item fica **validado** pelo mentor que aprovou.
- O aluno também pode adicionar projetos próprios (título, descrição, links, imagem), que aparecem como **não validados**.
- Só itens validados contam para o Banco de Talentos.

## D18. Banco de Talentos (Decidido, 2026-11-10)

- O aluno decide aparecer. Para ficar visível precisa de **pelo menos 1 projeto validado**.
- Empresas com cadastro completo buscam por texto, área, cidade e bairro, e abrem o perfil do talento. Antes do aceite, a empresa vê **só o primeiro nome e a inicial do sobrenome** (jovens de 18 a 26 anos: privacidade por padrão).
- A empresa envia um **convite para vaga** (título e mensagem). O aluno aceita ou recusa. **Contato direto (e-mail e WhatsApp) só é revelado após o aceite.**
- Planos das empresas (limite de perfis por mês) **não são aplicados** por enquanto (A10 pendente). Os selos ficam para o pós-MVP (D24). Tudo fica liberado para empresas com cadastro completo.
- A taxa de intermediação sobre contratações **não é cobrada** por enquanto (A12 pendente). A empresa pode marcar o convite como "contratado", e esse dado fica guardado para o relatório de impacto, que é pós-MVP (D24).

## D19. Painel do aluno com dados reais (Decidido, 2026-11-10)

O painel usa só números que o sistema tem de verdade:

- **Horas de estudo:** estimativa pela soma da duração das aulas concluídas (a plataforma não mede o tempo assistido).
- **Sequência:** dias seguidos com pelo menos uma aula concluída.
- **Atividade da semana:** aulas concluídas por dia, nos últimos 7 dias.
- Além disso: continuar estudando, desafios pendentes e devolutivas, certificados, convites de empresas e o caminho até o Banco de Talentos.

## D20. Construtor de cursos guiado (Decidido, 2026-11-10)

O formulário único de edição foi trocado por um construtor em **cinco etapas navegáveis em qualquer ordem**: Informações, Capa, Conteúdo, Desafios e Publicar. Regras:

- O curso nasce como rascunho com título e preço. O resto é completado no construtor.
- **Vídeos por arrastar e soltar:** vários arquivos de uma vez, cada um vira uma aula (título sugerido pelo nome do arquivo, duração lida do vídeo). Até 2 envios simultâneos.
- **Reordenar** módulos e aulas por arrastar ou pelas setas (acessível pelo teclado), inclusive mover aula entre módulos. A API recebe a ordem inteira e recusa listas que não batem com o curso.
- **Remover** pede confirmação em dois cliques, sem diálogo do navegador.
- **Checklist para publicar.** Obrigatórios: título e preço, ao menos uma aula com vídeo. Recomendados (não bloqueiam): descrição de 40 caracteres ou mais, capa, ao menos um desafio, todas as aulas com vídeo. O desafio é recomendado porque sem ele o aluno não consegue um projeto validado para o portfólio e o Banco de Talentos.

## D21. Dados mostrados nos painéis (Decidido, 2026-11-10)

Complementa a D19. Todos os painéis usam só números que o sistema tem:

- **Mentor:** vendas do mês (já descontada a retenção), saldo disponível e pendente, alunos, entregas para corrigir, vendas da semana, cursos com mais alunos.
- **Empresa:** talentos disponíveis e convites por estado.
- **Admin:** usuários por perfil, cursos publicados, receita bruta, retenção do Hub+, pedidos pagos, saques a pagar, certificados, convites e contratações.
- Os dias dos gráficos e da sequência de estudo usam o fuso de Aracaju (UTC-3).

## D22. Transparência de ganhos do mentor e taxa do gateway (Decidido, 2026-11-12)

Ao definir o preço de um curso, o mentor vê quanto fica com ele, com as três partes do valor pago:

- **Retenção do Hub+:** percentual do valor pago (`PLATFORM_FEE_PERCENT`).
- **Taxa do meio de pagamento:** estimada por percentual mais valor fixo (`GATEWAY_FEE_PERCENT` e `GATEWAY_FEE_FIXED_IN_CENTS`; padrão 3,99% + R$ 0,39, cartão no Stripe Brasil). **É descontada do mentor.**
- **Mentor:** o que sobra. A soma das três partes é sempre o valor pago, sem sobra de centavo.

Regras:

- A prévia vem de `GET /pricing/preview`, que usa a **mesma função** que grava o pedido (`splitAmount`). O valor exibido é o que cai na carteira.
- A taxa estimada é gravada no pedido (`orders.gateway_fee_in_cents`). Mudar a configuração depois **não altera pedidos antigos**.
- A taxa real do Stripe fica debitada na conta do Hub+, não no extrato interno. Se a taxa real for diferente da estimada, a diferença é do Hub+. A reconciliação com a taxa real (balance transaction do Stripe) não está implementada.
- Em reembolso, o mentor e o Hub+ são estornados pelos valores originais. O Stripe **não devolve** a taxa dele, então esse custo fica com o Hub+.
- Os testes automáticos usam gateway `fake` e valores fixos (retenção 20%, taxa de gateway zerada), independentemente do `.env`. Os testes de taxa ajustam os valores por conta própria.

## D23. Empresa tem cadastro único, feito pelo Hub+ (Decidido, 2026-11-12)

- **A empresa não se cadastra sozinha.** O Hub+ (perfil admin) cadastra a empresa com o CNPJ. Há **um único cadastro por CNPJ**.
- **A empresa escolhe quem gerencia a conta.** Ela indica ao Hub+ o responsável, e o Hub+ cadastra essa pessoa com um convite. Depois, o responsável pode passar a gestão a outro representante com acesso ativo (e o admin pode indicar outro responsável, a pedido da empresa, se o atual sair).
- O responsável ativa o acesso pelo link de convite (D14), cria a senha e já entra na empresa. Confere os dados cadastrados, mas não refaz o cadastro.
- O cadastro de empresa sai da tela pública de cadastro. A API deixa de aceitar `role: company` em `POST /auth/register`.
- Os demais representantes, o convite com link e a visibilidade dos dados continuam como na D14.

Situação do código: **implementado** (2026-11-12).

- `POST /auth/register` só aceita `student` e `mentor`. A rota `POST /company` deixou de existir.
- O admin cadastra a empresa e o responsável em `POST /admin/companies` (tela `/admin/companies/new`). O CNPJ é validado e único, e o e-mail do responsável não pode ter conta. O responsável recebe um convite de 7 dias. Como o e-mail transacional ainda não existe (A11), o link aparece na tela do admin para ele copiar e enviar.
- O responsável ativa o acesso em `/convite/:token`, entra direto na empresa e vê um cartão para conferir os dados cadastrados. **Razão social e CNPJ só o Hub+ altera**; a empresa edita o resto.
- **Só o responsável pela conta adiciona, remove e reenvia convites de representantes e passa a gestão.** Quem recebe a gestão precisa ter ativado o acesso. Há sempre exatamente um responsável, e o responsável atual não pode ser removido sem antes passar a gestão.
- Se o responsável sai da empresa e não passa a gestão, o admin indica outro (`POST /admin/companies/:id/manager`) e **registra quem da empresa pediu e o motivo**. Toda troca fica em `company_manager_changes`.
- O admin acompanha as empresas em `/admin/companies`, com o estado do acesso (ativo, convite pendente, convite vencido) e o reenvio do convite.
- Conta de empresa sem empresa vinculada (só existe nas contas criadas antes da D23) **não consegue entrar**: o login responde 403 com a orientação de falar com o Hub+. Contas já vinculadas continuam como estavam.

Pontos que **assumi** e precisam de confirmação (A15): o canal de contato por onde a empresa pede o cadastro (a tela só diz "fale com o Hub+", sem e-mail ou telefone), o que o Hub+ confere antes de cadastrar (hoje nada além da validação dos dígitos do CNPJ) e se desativar as contas antigas sem empresa é o desejado.

## D24. Relatório de impacto e selos ficam para o pós-MVP (Decidido, 2026-11-12)

O objetivo é entregar um **MVP funcional**. Ficam para uma versão posterior:

- **Relatório de impacto** (painel e PDF do admin, relatório para doadores).
- **Selos** das empresas (Bronze, Prata e Ouro, por plano) e dos doadores ("Apoiador da Juventude").

Consequências:

- No backlog, esses itens foram para o release "Pós-MVP" (épico E16), com prioridade P3.
- O que já existe no código **não é removido**: o selo "Validado por mentor" do portfólio (D17) faz parte do Banco de Talentos e continua. A marcação "contratado" do convite (D18) continua guardando o dado para o relatório futuro.
- Doações (A8), planos corporativos (A10) e taxa de contratação (A12) **seguem como estavam** (release R3 do backlog, decisões pendentes), apenas sem selo e sem relatório de impacto. Se essas também forem para o pós-MVP, é só dizer.

## D25. Página inicial pública (Decidido, 2026-11-12)

A raiz do site (`/`) é **sempre a página inicial pública**, com ou sem login. Ela não redireciona ninguém. O painel de cada perfil fica em **`/painel`** (o admin cai em `/admin`).

- **Cabeçalho sem login:** "Entrar" e "Criar conta". **Com login:** "Acessar conta", que leva ao painel.
- **Com login**, a página some com "Criar conta", "Quero ensinar" e a chamada final, e o botão principal do início vira "Acessar minha conta".
- Login, cadastro, convite, fim do onboarding e perfil sem permissão para a rota levam a `/painel`. A tela de login e a de cadastro (`AuthShell`) **não têm mais depoimento**: o painel lateral mostra o que a plataforma entrega de fato (cursos de 4 a 6 semanas, desafios com projetos validados e certificado, Banco de Talentos).

- **Blocos:** proposta de valor, como funciona (3 passos), para mentores, para empresas, chamada final e rodapé. Protótipo aprovado: `docs/design/mockup-landing.html`.
- **Sem seção de cursos em destaque** por enquanto, porque o catálogo ainda tem poucos cursos. O catálogo continua em `/explore`, com botão "Explorar cursos" no topo e no início da página. A API não mudou.
- **Localidade:** a página fala em **Sergipe**, não em "Aracaju e região". O rodapé diz "Formando, conectando e transformando jovens de Sergipe." O nome da plataforma é **Hub+** (não "Hub Juventude+").
- **Empresas não têm botão de cadastro** (D23): o bloco "Para empresas" tem "Fale conosco" (e-mail) e o Instagram. Contatos provisórios em `web/src/lib/contact.ts`: `hubmaised@gmail.com` e `@hub.mais`. Trocar quando a A15 for decidida.
- **Mentores:** o botão leva a `/register?role=mentor`, que já abre no passo dos dados com o perfil de mentor escolhido.
- **Sem números nem promessas inventados:** nada de total de alunos, retenção do Hub+ (A14), preço de plano (A10) ou selos (D24). Os cartões são ilustrações do painel e não levam legenda.
- **Contraste (4,5:1):** os pares `--success` sobre `--mint-soft` (claro) e `--primary` sobre `--primary-soft` (escuro) davam cerca de 4,3:1. Para texto sobre fundo pastel, a página usa os tokens novos `--success-ink` e `--primary-ink`. O selo de sucesso do restante do app ainda usa o par antigo.
- **Desempenho:** as telas autenticadas carregam sob demanda (`React.lazy`). O pacote inicial caiu de 700 kB para 383 kB (205 para 119 kB comprimido), e a página inicial, sem os painéis, transfere cerca de 166 kB.

Verificado no Chrome com a página real em 360 px, claro e escuro, 4G simulada (1,6 Mbps, 150 ms) e CPU 4 vezes mais lenta: maior elemento visível em cerca de 2,1 s, sem rolagem horizontal e sem falha de contraste de texto. Medido no build de produção local. Falta repetir no staging, quando a hospedagem (N1) estiver definida.

## Decisões abertas

| ID | Pergunta | Situação |
|---|---|---|
| A6 | Logo em alta resolução ou vetorial | Usar o JPG atual. O responsável providencia uma versão melhor |
| A8 | Como a doação de empresas é recebida (página pública, Pix manual, boleto) | **Pendente**: será discutido com as sócias. Fase 2 |
| A9 | Pix no Stripe Brasil e disponibilidade do Stripe Connect para saque automático | Validar na conta Stripe do Hub+ |
| A10 | Planos corporativos do Banco de Talentos: limites de perfis abertos por mês em cada plano (Essencial, Avançado, Premium), preços e se convites têm limite. Os selos (Bronze, Prata, Ouro) são pós-MVP (D24) | **Pendente**: o responsável vai analisar com calma. O protótipo usa 30 perfis no Essencial e 100 no Avançado só como exemplo visual, sem valor de decisão. Banco de Talentos é fase 6 |
| A11 | Provedor de e-mail transacional (convites de representantes, recuperação de senha, avisos de saque e de devolutiva) | **Pendente**. Hoje o link do convite é mostrado na tela e não há recuperação de senha por e-mail |
| A12 | Taxa de intermediação sobre contratação feita pela plataforma: percentual, base de cálculo e forma de cobrança | **Pendente**. Fase 6 registra a contratação, sem cobrar |
| A13 | Verificação de identidade do mentor (CPF x nome) e regras antifraude para troca de chave Pix e saque | **Pendente**. Hoje só validamos os dígitos do CPF |
| A14 | Quem arca com a taxa do Stripe (hoje: o mentor, por estimativa), valores reais da taxa (cartão e Pix) na conta do Hub+, e se a taxa real do Stripe deve substituir a estimativa em cada pedido | **Pendente**: confirmar com o responsável. Os valores padrão (3,99% + R$ 0,39) vêm de pesquisa e **não foram verificados** na conta do Stripe |
| A15 | Pedido de cadastro de empresa (D23): canal de contato do Hub+ mostrado na tela de cadastro, o que o Hub+ confere antes de cadastrar (documentos, contrato) e o destino das contas antigas de empresa sem empresa vinculada | **Pendente**. Hoje a tela diz só "fale com o Hub+" e essas contas ficam sem acesso |
