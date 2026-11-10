# Decisões do projeto Hub+

Registro das decisões tomadas e das ainda abertas. Atualizar sempre que uma decisão mudar, com data.

Legenda: **Decidido** (confirmado pelo responsável do projeto), **Proposto** (recomendação minha, aguardando confirmação), **Aberto** (sem resposta).

## D1. Não existe perfil "sponsor" (Decidido, 2026-11-09)

Empresas que financiam bolsas não têm acesso à plataforma. O processo é parecido com doações a ONGs: a empresa doa o valor diretamente ao Hub+ e recebe selo, relatório de impacto e demais contrapartidas.

Consequências:
- Perfis da plataforma: **student, mentor, company, admin**.
- Doações são registradas pelo admin (ou por uma página pública de doação, a definir). Não há login de patrocinador.
- Selos "Apoiador da Juventude" e relatórios de impacto de patrocinadores são emitidos pelo admin. Entram na fase 2.
- A tabela de doações é separada da de pedidos de curso (ver D3).

## D2. Perfis e permissões (Decidido, 2026-11-09)

| Perfil | Pode |
|---|---|
| student | Comprar cursos, assistir, fazer desafios, manter portfólio, participar do Banco de Talentos |
| mentor | Criar e publicar cursos, corrigir desafios, ver a carteira e sacar |
| company | Buscar talentos, contratar, assinar plano corporativo |
| admin | Curadoria, relatórios de impacto, doações e selos, ver a receita e a retenção do Hub+ |

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

## Decisões abertas

| ID | Pergunta | Situação |
|---|---|---|
| A6 | Logo em alta resolução ou vetorial | Usar o JPG atual. O responsável providencia uma versão melhor |
| A8 | Como a doação de empresas é recebida (página pública, Pix manual, boleto) | **Pendente**: será discutido com as sócias. Fase 2 |
| A9 | Pix no Stripe Brasil e disponibilidade do Stripe Connect para saque automático | Validar na conta Stripe do Hub+ |
| A10 | Planos corporativos do Banco de Talentos: limites de perfis abertos por mês em cada plano (Essencial, Avançado, Premium), preços, o que cada selo (Bronze, Prata, Ouro) inclui e se convites têm limite | **Pendente**: o responsável vai analisar com calma. O protótipo usa 30 perfis no Essencial e 100 no Avançado só como exemplo visual, sem valor de decisão. Banco de Talentos é fase 6 |
