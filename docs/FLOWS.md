# Fluxos da plataforma

Como cada perfil usa o Hub+ do começo ao fim. Cada fluxo aponta a decisão que o originou (`docs/DECISIONS.md`) e as telas e rotas envolvidas.

## 1. Cadastro e onboarding (D12)

O cadastro é igual para quem aprende e quem ensina: escolher o perfil e informar nome, e-mail e senha. Logo depois, cada perfil entra no seu onboarding (`/onboarding`).

> **Empresa não se cadastra sozinha (D23).** A tela de cadastro oferece só aluno e mentor, e a API recusa `role: company`. O Hub+ cadastra a empresa e o responsável, que ativa o acesso pelo convite (seção 4).

| Perfil | Onboarding | Obrigatório? | O que bloqueia enquanto não termina |
|---|---|---|---|
| Aluno | 3 passos: sobre você, interesses e objetivo, pronto | **Não**, tem "Pular por agora" | Nada |
| Mentor | 4 passos: dados pessoais, recebimento (Pix), perfil de mentor, termos e revisão. É a **abertura da carteira** (D13) | **Sim** | Criar cursos, ver carteira, pedir saque, correções e painel do mentor. A API recusa com 403 e o menu mostra só "Abrir carteira" |
| Empresa | Sem onboarding de cadastro: o Hub+ já cadastrou os dados (D23). O responsável confere num cartão no primeiro acesso | Não se aplica | Conta de empresa sem empresa vinculada (só contas antigas) não entra |

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

O painel (`/painel`) resume tudo com dados reais (D19): horas estimadas, sequência, atividade da semana, desafios pendentes e o caminho até o Banco de Talentos.

## 4. Empresa: do cadastro pelo Hub+ à contratação

1. **A empresa pede o cadastro ao Hub+** e indica quem vai gerenciar a conta.
2. **O admin cadastra a empresa** (`/admin/companies/new`): CNPJ único, dados da empresa e o responsável (nome, cargo, e-mail e telefone). A tela mostra o link de convite, válido por 7 dias e de uso único, para o admin enviar (A11: não há e-mail automático).
3. **O responsável ativa o acesso** (`/convite/:token`): cria a senha e entra direto na empresa. No primeiro acesso, um cartão pede para **conferir os dados**. Razão social e CNPJ só o Hub+ corrige.
4. **Convida representantes** (`/settings?tab=team`): só o responsável adiciona, remove e reenvia convites. O sistema mostra um link de convite (7 dias, uso único).
5. **Passa a gestão**, quando quiser (`/settings?tab=team`, "Tornar responsável"): a pessoa escolhida precisa ter ativado o acesso, e o antigo responsável vira representante comum. Se o responsável sair da empresa sem passar a gestão, o Hub+ indica outro a pedido da empresa e registra o pedido.
6. **Busca talentos** (`/talents`): por texto, área, cidade e bairro. Vê **primeiro nome e inicial do sobrenome**.
7. **Abre o perfil** (`/talents/:id`): portfólio validado, cursos concluídos, interesses.
8. **Convida para a vaga:** título e mensagem (mínimo de 20 caracteres). Um convite por vez por talento.
9. **Acompanha** (`/company/invitations`): enviado, aceito, recusado, retirado, contratado.
10. **Após o aceite**, vê nome completo, e-mail e WhatsApp, e pode **marcar como contratado** (o dado fica guardado para o relatório de impacto, que é pós-MVP, D24; a taxa de intermediação ainda não é cobrada, A12).

Planos (A10) não são aplicados e os selos são pós-MVP (D24): toda empresa com cadastro completo acessa tudo.

## 5. Admin

- **Visão geral** (`/admin`): usuários, cursos, vendas, retenção do Hub+, saques a pagar, certificados e convites.
- **Carteira do Hub+** (`/admin/wallet`): mesma tela do mentor, com as retenções.
- **Saques** (`/admin/withdrawals`): vê nome completo, CPF, telefone e chave Pix, faz o Pix por fora e marca como pago ou recusa (o valor volta ao saldo).
- **Pedidos** (`/admin/orders`): lista e reembolso (revoga a matrícula e estorna o ledger).
- **Empresas** (`/admin/companies`): cadastra empresas (D23), acompanha o estado do acesso (ativo, convite pendente, convite vencido), reenvia convites e indica outro responsável a pedido da empresa.

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

## 7. Visitante: da página inicial ao cadastro (D25)

1. **Abre o site** (`/`): vê a página inicial pública, com ou sem login. Sem login, o cabeçalho mostra "Entrar" e "Criar conta". Com login, mostra "Acessar conta", que leva ao painel (`/painel`).
2. **Entende a proposta**: como funciona, para mentores e para empresas. O catálogo está em "Explorar cursos" (`/explore`).
3. **Cria a conta** (`/register`): aluno ou mentor. "Quero ensinar" abre `/register?role=mentor`, já com o perfil escolhido.
4. **Empresa** não se cadastra: usa "Fale conosco" (e-mail ou Instagram) e o Hub+ cadastra (D23).
