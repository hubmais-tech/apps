# Modelo de dados

Banco: Postgres 17, acessado com Drizzle (`api/src/database/schema/*.ts`). As migrações ficam em `api/src/database/migrations` e são geradas com `pnpm db:generate` e aplicadas com `pnpm db:migrate`.

Regras gerais:

- **Dinheiro em centavos** (`integer`). Nunca ponto flutuante.
- **Ids** são UUID gerados pelo banco.
- **Ledger imutável:** `ledger_entries` só recebe novas linhas. Saldo é soma, nunca campo editável.
- Valores sensíveis (CPF, chave Pix) ficam só em `mentor_accounts` e são mascarados nas respostas da API.

## Visão geral

```
users ─┬─ student_profiles        (1:1, aluno)
       ├─ mentor_accounts         (1:1, mentor com carteira aberta)
       ├─ company_members ── companies   (representantes de uma empresa; um é o responsável)
       │                    └─ company_manager_changes
       ├─ courses ─ modules ─ lessons
       │     ├─ enrollments ── lesson_progress
       │     ├─ challenges ─ submissions ─ portfolio_items
       │     └─ certificates
       ├─ orders ─ ledger_entries ─ withdrawals
       └─ invitations (empresa → aluno)
```

## Contas e perfis (`users.ts`, `profiles.ts`)

| Tabela | Para que serve | Pontos importantes |
|---|---|---|
| `users` | Toda conta de acesso | `role`: `student`, `mentor`, `company`, `admin`. E-mail único, senha com hash scrypt |
| `student_profiles` | Perfil opcional do aluno (D12) | Chave = `user_id`. Sem CPF. `interests` é lista de texto. `talent_visible` liga o Banco de Talentos (exige projeto validado, D18). `onboarding_completed_at` ou `onboarding_skipped_at` encerram o onboarding |
| `mentor_accounts` | A "carteira aberta" do mentor (D13) | Chave = `user_id`. `cpf` (só dígitos, único), `pix_key_type`, `pix_key`, `full_name`, `birth_date`, `phone`, `bio`, `expertise`. Existir uma linha aqui é o que libera criar cursos e ver a carteira |
| `companies` | Empresa, cadastrada pelo Hub+ (D14, D23) | `cnpj` único (só dígitos). Não muda depois de criado. `created_by_user_id` é o admin que cadastrou (nulo nas empresas antigas) |
| `company_members` | Representantes da empresa | `user_id` fica nulo até a pessoa aceitar o convite. `is_primary` marca o **responsável pela conta** (um por empresa, D23). `invite_token_hash` guarda só o hash do link (o link em si nunca é salvo). `invite_expires_at` limita a 7 dias. Único por (`company_id`, `email`) |
| `company_manager_changes` | Histórico de troca do responsável (D23) | `from_member_id` e `to_member_id`, `changed_by_user_id`, `origin` (`company` ou `admin`) e `note` (pedido da empresa, obrigatório quando o admin indica) |

## Cursos e aprendizado (`courses.ts`)

| Tabela | Para que serve | Pontos importantes |
|---|---|---|
| `courses` | Curso do mentor | `slug` único, `price_in_cents`, `cover_key` (R2), `is_published` |
| `modules` | Agrupa aulas | `position` define a ordem. Apagar o curso apaga os módulos |
| `lessons` | Aula em vídeo | `video_key` (R2, nunca exposta ao catálogo), `duration_in_seconds`, `position` |
| `enrollments` | Matrícula criada na compra | Único por (`user_id`, `course_id`) |
| `lesson_progress` | Aula concluída pelo aluno | Único por (`user_id`, `lesson_id`). `completed_at` alimenta horas de estudo e sequência |

## Desafios, certificados, portfólio e convites (`engagement.ts`)

| Tabela | Para que serve | Pontos importantes |
|---|---|---|
| `challenges` | Desafio prático de um curso (D16) | `brief` (enunciado), `criteria` (opcional) |
| `submissions` | Entrega do aluno | Única por (`challenge_id`, `user_id`): reenviar atualiza a mesma linha e soma `attempt`. `status`: `submitted`, `changes_requested`, `approved`. `attachments` é JSON `[{ key, name, size, contentType }]`, com chaves sob `submissions/<desafio>/<aluno>/` |
| `certificates` | Certificado de conclusão | Único por (`user_id`, `course_id`). `code` único (`HUB-XXXX-XXXX`) para a página pública de validação |
| `portfolio_items` | Projeto do aluno (D17) | `validated_at` preenchido = validado por mentor. `submission_id` (único) liga ao desafio de origem. `is_public` controla se aparece para empresas |
| `invitations` | Convite empresa → aluno (D18) | `status`: `sent`, `accepted`, `declined`, `hired`, `withdrawn` |

## Pagamentos e carteira (`finance.ts`)

| Tabela | Para que serve | Pontos importantes |
|---|---|---|
| `orders` | Compra de um curso | `amount_in_cents`, `platform_fee_in_cents`, `gateway_fee_in_cents` (estimativa, D22), `mentor_amount_in_cents`. As três partes somam exatamente o valor pago. `status`: `pending`, `paid`, `refunded`, `failed`. Referências do gateway para idempotência |
| `ledger_entries` | Extrato imutável | `user_id` nulo = carteira do Hub+. Valores com sinal. `available_at` no futuro = saldo pendente (janela de garantia, D7). Tipos: `sale`, `platform_fee`, `refund`, `withdrawal`, `withdrawal_reversal` |
| `withdrawals` | Pedido de saque | A chave Pix é **copiada** para a linha no momento do pedido (auditoria). `status`: `requested`, `paid`, `rejected` |

## Como o saldo é calculado

- **Disponível:** soma de `ledger_entries.amount_in_cents` com `available_at <= agora`.
- **Pendente:** soma com `available_at > agora`.
- Operações de saldo da mesma carteira são serializadas com `pg_advisory_xact_lock` dentro de uma transação, para impedir saque duplo.

## O que cada perfil enxerga

| Dado | Aluno | Mentor | Empresa | Admin |
|---|---|---|---|---|
| Próprio perfil | sim | sim | sim | sim |
| CPF completo | não | não (vê mascarado) | não | só ao pagar saque |
| Chave Pix completa | não | não (vê mascarada) | não | só ao pagar saque |
| Entregas de desafios | as próprias | dos próprios cursos | não | todas |
| Nome completo e contato do aluno | próprio | só nome nas entregas | só após o aluno aceitar convite | sim |
