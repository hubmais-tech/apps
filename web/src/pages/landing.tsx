import { ArrowRight, Award, Briefcase, Check, GraduationCap, Lock, Mail, MapPin, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Instagram } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { COMPANY_REQUEST_MAILTO, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/contact'
import { cn } from '@/lib/utils'

const wrap = 'mx-auto w-full max-w-[1120px] px-4 sm:px-6'

/** Quadrado colorido do ícone. Os tons de texto garantem contraste de 4,5:1 nos dois temas. */
function Chip({ tone, children, className }: { tone: 'lilac' | 'orange' | 'mint' | 'sand'; children: ReactNode; className?: string }) {
  const tones = {
    lilac: 'bg-lilac-soft text-primary-ink',
    orange: 'bg-orange-soft text-orange',
    mint: 'bg-mint-soft text-success-ink',
    sand: 'bg-sand-soft text-foreground',
  }
  return <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-[18px]', tones[tone], className)}>{children}</span>
}

function Tag({ tone = 'mint', children }: { tone?: 'mint' | 'lilac'; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1 rounded-md px-2 text-xs font-semibold', tone === 'mint' ? 'bg-mint-soft text-success-ink' : 'bg-primary-soft text-primary-ink')}>
      {children}
    </span>
  )
}

function Check4({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[15px]">
      <Check className="mt-0.5 size-[18px] shrink-0 text-success" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

function SectionHeading({ id, kicker, title, children }: { id: string; kicker: string; title: string; children?: ReactNode }) {
  return (
    <>
      <span className="text-[13px] font-semibold text-primary">{kicker}</span>
      <h2 id={id} className="mt-2 text-[clamp(24px,6.4vw,36px)] leading-[1.15] font-extrabold tracking-tight text-balance">
        {title}
      </h2>
      {children && <p className="mt-3 max-w-[560px] text-base text-muted-foreground">{children}</p>}
    </>
  )
}

/** Página inicial pública (E12-S01): o visitante entende o Hub+ antes de criar a conta. */
export function LandingPage() {
  const { user } = useAuth()
  return (
    <>
      {/* 1. Proposta de valor */}
      <section aria-labelledby="h-hero" className="py-9 lg:py-[72px]">
        <div className={cn(wrap, 'grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-14')}>
          <div>
            <span className="inline-flex items-center rounded-md bg-primary-soft px-2.5 py-1 text-[13px] font-semibold text-primary-ink">Jovens de 18 a 26 anos · Sergipe</span>
            <h1 id="h-hero" className="mt-4 text-[clamp(30px,8.5vw,52px)] leading-[1.08] font-extrabold tracking-tight text-balance">
              Aprenda em <em className="text-primary not-italic">4 a 6 semanas</em> e mostre seu trabalho para quem contrata.
            </h1>
            <p className="mt-4 max-w-[520px] text-base text-muted-foreground">
              Cursos curtos com mentores de verdade, desafios práticos e certificado. Seus melhores projetos ficam num portfólio e as empresas da região podem convidar você para uma vaga.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Button asChild size="lg">
                <Link to={user ? '/painel' : '/register'}>
                  {user ? 'Acessar minha conta' : 'Criar conta'} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/explore">Explorar cursos</Link>
              </Button>
            </div>
            {!user && <p className="mt-3.5 text-[13px] text-muted-foreground">Criar a conta não custa nada. Você só paga pelos cursos que escolher.</p>}
          </div>

          <div className="grid gap-3" aria-hidden="true">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Chip tone="lilac">
                  <GraduationCap />
                </Chip>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Social media para pequenos negócios</h3>
                  <p className="text-xs text-muted-foreground">Semana 3 de 5 · 12 de 20 aulas</p>
                </div>
              </div>
              <div className="mt-3.5 h-2 overflow-hidden rounded-full border border-border bg-faint">
                <div className="h-full w-[60%] rounded-full bg-orange" />
              </div>
            </Card>
            <Card className="p-4 lg:ml-9">
              <div className="flex items-center gap-3">
                <Chip tone="sand">
                  <Award />
                </Chip>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Calendário editorial</h3>
                  <p className="text-xs text-muted-foreground">Projeto do seu portfólio</p>
                </div>
                <Tag>
                  <Check className="size-3" /> Validado por mentor
                </Tag>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Chip tone="orange">
                  <Briefcase />
                </Chip>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Convite para vaga</h3>
                  <p className="text-xs text-muted-foreground">Estágio em social media · Studio Atalaia</p>
                </div>
                <Tag tone="lilac">Novo</Tag>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 2. Como funciona */}
      <section id="como-funciona" aria-labelledby="h-como" className="scroll-mt-[72px] border-y border-border bg-surface py-12 lg:py-20">
        <div className={wrap}>
          <SectionHeading id="h-como" kicker="Como funciona" title="Do primeiro curso à primeira entrevista">
            Três passos, no seu ritmo e do seu celular.
          </SectionHeading>
          <div className="mt-7 grid gap-3.5 sm:grid-cols-3">
            {[
              { tone: 'lilac', icon: <GraduationCap />, title: '1. Estude um curso curto', text: 'Aulas em vídeo de 4 a 6 semanas, criadas por mentores que trabalham na área.' },
              { tone: 'orange', icon: <Award />, title: '2. Faça desafios e ganhe o certificado', text: 'Você entrega trabalhos reais. O mentor corrige, e o que for aprovado vira projeto validado no seu portfólio.' },
              { tone: 'mint', icon: <Briefcase />, title: '3. Apareça para as empresas', text: 'No Banco de Talentos, empresas da região veem seus projetos e podem convidar você para uma vaga.' },
            ].map((step) => (
              <Card key={step.title} className="p-5">
                <Chip tone={step.tone as 'lilac'}>{step.icon}</Chip>
                <h3 className="mt-4 text-[17px] font-bold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Para mentores */}
      <section id="mentores" aria-labelledby="h-mentor" className="scroll-mt-[72px] py-12 lg:py-20">
        <div className={cn(wrap, 'grid gap-7 lg:grid-cols-2 lg:items-center lg:gap-16')}>
          <div>
            <SectionHeading id="h-mentor" kicker="Para mentores" title="Ensine o que você sabe e receba pelas vendas">
              Crie seu curso, grave as aulas e acompanhe tudo pelo painel. A plataforma cuida da cobrança.
            </SectionHeading>
            <ul className="mt-5 grid gap-3">
              <Check4>Você cria o curso e define o preço. Cada venda é dividida entre você e o Hub+.</Check4>
              <Check4>Carteira com saldo e extrato. Você saca por Pix depois da janela de garantia de 7 dias.</Check4>
              <Check4>Você corrige os desafios e valida os projetos dos alunos.</Check4>
            </ul>
            {!user && (
              <div className="mt-6">
                <Button asChild size="lg">
                  <Link to="/register?role=mentor">
                    Quero ensinar <ArrowRight />
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-3" aria-hidden="true">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Saldo disponível</p>
              <p className="mt-0.5 text-[30px] leading-tight font-extrabold tracking-tight">R$ 1.240,00</p>
              <div className="mt-3.5 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">A liberar: R$ 380,00</span>
                <span className="inline-flex h-[34px] items-center rounded-md bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground">Sacar por Pix</span>
              </div>
            </Card>
            <Card className="p-4 lg:ml-9">
              <div className="flex items-center gap-3">
                <Chip tone="mint">
                  <Wallet />
                </Chip>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Nova venda</h3>
                  <p className="text-xs text-muted-foreground">Social media para pequenos negócios</p>
                </div>
                <b className="text-xs">+ R$ 79,00</b>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Para empresas */}
      <section id="empresas" aria-labelledby="h-empresa" className="scroll-mt-[72px] border-y border-border bg-surface py-12 lg:py-20">
        <div className={cn(wrap, 'grid gap-7 lg:grid-cols-2 lg:items-center lg:gap-16')}>
          <div className="lg:order-2">
            <SectionHeading id="h-empresa" kicker="Para empresas" title="Encontre jovens que já provaram o que sabem fazer">
              O Banco de Talentos reúne jovens de Sergipe com projetos validados por mentores.
            </SectionHeading>
            <ul className="mt-5 grid gap-3">
              <Check4>Busque por área, cidade e bairro e veja o portfólio de cada jovem.</Check4>
              <Check4>Convide para uma vaga. O contato direto só aparece depois que o jovem aceita.</Check4>
              <Check4>O cadastro da empresa é feito pela nossa equipe, e você escolhe quem gerencia a conta.</Check4>
            </ul>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <a href={COMPANY_REQUEST_MAILTO}>
                  <Mail /> Fale conosco
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                  <Instagram /> {INSTAGRAM_HANDLE}
                </a>
              </Button>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">Escreva para hubmaised@gmail.com com o CNPJ e o nome de quem vai gerenciar a conta.</p>
          </div>

          <div aria-hidden="true" className="lg:order-1">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-lilac-soft text-[13px] font-semibold text-primary-ink">AS</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">Ana S.</h3>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> Atalaia, Aracaju · 21 anos
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs">Social media e conteúdo para pequenos negócios.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag>
                  <Check className="size-3" /> 2 projetos validados
                </Tag>
                <Tag tone="lilac">1 certificado</Tag>
              </div>
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" /> Contato liberado após o aceite
                </span>
                <span className="inline-flex h-[34px] items-center rounded-md bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground">Convidar para vaga</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. Chamada final */}
      {!user && (
      <section aria-labelledby="h-final" className="py-12 lg:py-16">
        <div className={wrap}>
          <div className="grid gap-4 rounded-2xl bg-primary p-[22px] py-8 text-primary-foreground sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
            <div>
              <h2 id="h-final" className="text-[clamp(24px,6.4vw,34px)] leading-[1.15] font-extrabold tracking-tight text-balance">
                Comece pelo seu primeiro curso
              </h2>
              <p className="mt-2 text-base opacity-95">Crie sua conta em menos de um minuto. Não pedimos CPF para estudar.</p>
            </div>
            <Button asChild size="lg" className="bg-surface text-primary hover:bg-surface hover:brightness-95">
              <Link to="/register">
                Criar conta <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      )}
    </>
  )
}
