# Fluxos da plataforma

Como cada perfil usa o Hub+ do começo ao fim. Cada fluxo aponta a decisão que o originou (`docs/DECISIONS.md`) e as telas e rotas envolvidas.

## 1. Cadastro e onboarding (D12)

O cadastro é igual para todos: escolher o perfil (aprender, ensinar ou empresa) e informar nome, e-mail e senha. Logo depois, cada perfil entra no seu onboarding (`/onboarding`).

| Perfil | Onboarding | Obrigatório? | O que bloqueia enquanto não termina |
|---|---|---|---|
| Aluno | 3 passos: sobre você, interesses e objetivo, pronto | **Não**, tem "Pular por agora" | Nada |
| Mentor | 4 passos: dados pessoais, recebimento (Pix), perfil de mentor, termos e revisão. É a **abertura da carteira** (D13) | **Sim** | Criar cursos, ver carteira, pedir saque, correções e painel do mentor. A API recusa com 403 e o menu mostra só "Abrir carteira" |
| Empresa | 3 passos: dados da empresa (CNPJ), representante, revisão (D14) | **Sim** | Banco de Talentos, convites e painel da empresa |

Representante convidado entra por outro caminho: recebe um link `/convite/<token>`, cria a senha e já cai na empresa, sem refazer o cadastro.

## 2. Mentor: do cadastro à primeira venda

1. **Abre a carteira** (`/onboarding`): nome completo, CPF, nascimento, telefone, chave Pix, bio, áreas e aceite dos termos.
2. **Cria o curso** (`/mentor/courses/new`): título, descrição e preço (mínimo R$ 5,00). Vira rascunho.
3. **Monta o curso** (`/mentor/courses/:id`), em cinco etapas navegáveis em qualquer ordem:
   - **Informações:** título, descrição, preço.
   - **Capa:** arrastar e soltar (JPG, PNG, WebP, até 5 MB). Pré-visualização do cartão no catálogo.
   - **Conteúdo:** módulos e aulas. Arrastar vídeos (vários de uma vez) para dentro de um módulo cria uma aula por arquivo, com o título sugerido pelo nome do arquivo e a duração lida do vídeo. Envio direto ao R2, com progresso e no máximo 2 vídeos ao mesmo tempo. Reordenar por arrastar ou pelas setas; renomear clicando no título; remover com confirmação.
   - **Desafios:** tarefas práticas com enunciado e critérios.
   - **Publicar:** checklist. Obrigatórios: título e preço, uma aula com vídeo. Recomendados: descrição, capa, desafio, todas as aulas com vídeo.
4. **Vende:** o aluno compra pelo Stripe. A venda entra no extrato como **pendente** por 7 dias (D7).
5. **Corrige** (`/mentor/reviews`): aprova ou pede ajustes nas entregas.
6. **Saca** (`/mentor/wallet`): pede saque para a chave Pix cadastrada. O admin faz o Pix e marca como pago.

## 3. Aluno: da compra ao Banco de Talentos

1. **Explora** (`/explore`): busca, filtro de preço e ordenação, guardados na URL.
2. **Compra** (página do curso → Stripe). O webhook confirma, cria a matrícula e lança a venda no extrato do mentor e do Hub+.
3. **Estuda** (`/courses/:slug/learn`): vídeo, módulos, anterior e próxima, concluir aula.
4. **Faz os desafios** (aba Desafios do player): texto, links e anexos (arrastar e soltar, até 25 MB). O mentor aprova ou pede ajustes com feedback. O aluno reenvia quantas vezes precisar, até aprovar.
5. **Recebe o certificado** (`/certificates`) quando conclui todas as aulas **e** todos os desafios estão aprovados (D16). Cada certificado tem um código e uma página pública de validação (`/certificado/:code`), pronta para imprimir ou salvar em PDF.
6. **Monta o portfólio** (`/portfolio`, D17): entrega aprovada vira projeto **validado** (selo do mentor). O aluno também pode adicionar projetos próprios, que ficam como não validados.
7. **Aparece no Banco de Talentos** (D18): só com 1 projeto validado e público, e só se o aluno ligar a opção. Se o último projeto validado for ocultado ou apagado, ele sai da lista.
8. **Responde convites** (`/invitations`): aceitar libera nome completo e contato para a empresa que convidou.

O painel (`/`) resume tudo com dados reais (D19): horas estimadas, sequência, atividade da semana, desafios pendentes e o caminho até o Banco de Talentos.

## 4. Empresa: do cadastro à contratação

1. **Cadastra a empresa** (`/onboarding`): CNPJ, razão social, nome fantasia, setor, porte, cidade, representante principal.
2. **Convida representantes** (`/settings?tab=team`): o sistema mostra um link de convite (válido por 7 dias, uso único) para a empresa enviar. Ainda não há envio automático por e-mail (A11).
3. **Busca talentos** (`/talents`): por texto, área, cidade e bairro. Vê **primeiro nome e inicial do sobrenome**.
4. **Abre o perfil** (`/talents/:id`): portfólio validado, cursos concluídos, interesses.
5. **Convida para a vaga:** título e mensagem (mínimo de 20 caracteres). Um convite por vez por talento.
6. **Acompanha** (`/company/invitations`): enviado, aceito, recusado, retirado, contratado.
7. **Após o aceite**, vê nome completo, e-mail e WhatsApp, e pode **marcar como contratado** (alimenta o relatório de impacto; a taxa de intermediação ainda não é cobrada, A12).

Planos e selos (A10) não são aplicados: toda empresa com cadastro completo acessa tudo.

## 5. Admin

- **Visão geral** (`/admin`): usuários, cursos, vendas, retenção do Hub+, saques a pagar, certificados e convites.
- **Carteira do Hub+** (`/admin/wallet`): mesma tela do mentor, com as retenções.
- **Saques** (`/admin/withdrawals`): vê nome completo, CPF, telefone e chave Pix, faz o Pix por fora e marca como pago ou recusa (o valor volta ao saldo).
- **Pedidos** (`/admin/orders`): lista e reembolso (revoga a matrícula e estorna o ledger).

## 6. Caminho do dinheiro (D22)

```
Aluno paga R$ 199,00 (Stripe)            exemplo com retenção de 12,5% e gateway 3,99% + R$ 0,39
  └─ webhook confirma → pedido "paid" + matrícula
       ├─ ledger do mentor:  + R$ 165,79 (pendente por 7 dias)   = 199,00 − 24,88 − 8,33
       └─ ledger do Hub+:    + R$ 24,88  (pendente por 7 dias)
       (a taxa do Stripe, R$ 8,33 estimada, é descontada do mentor e paga pelo Hub+ ao Stripe)
Passados 7 dias → ficam disponíveis
Mentor pede saque → ledger: − R$ valor, saque "requested"
Admin paga o Pix por fora → saque "paid"   (ou "rejected" → o valor volta)
Reembolso → estorna os dois lançamentos pelos valores originais e revoga a matrícula
            (o Stripe não devolve a taxa dele: esse custo fica com o Hub+)
```

O mentor vê esse cálculo ao definir o preço do curso (tela "Novo curso" e etapa Informações do construtor).

O percentual do Hub+ (`PLATFORM_FEE_PERCENT`) e a taxa do gateway (`GATEWAY_FEE_PERCENT` e `GATEWAY_FEE_FIXED_IN_CENTS`) vêm do `.env`. A taxa do gateway é uma **estimativa** e ainda não foi verificada na conta do Stripe (A14).
