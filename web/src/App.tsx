import { lazy, Suspense, type ComponentProps, type ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'

import { Layout, PublicLayout } from '@/components/layout'
import { Loading } from '@/components/query-state'
import { RequireRole } from '@/components/require-role'
import { CourseDetailPage } from '@/pages/course-detail'
import { ExplorePage } from '@/pages/explore'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { RegisterPage } from '@/pages/register'
import { LandingPage } from '@/pages/landing'

/**
 * Páginas públicas de entrada (início, catálogo, curso, login e cadastro) ficam no pacote inicial.
 * O resto carrega sob demanda, para a página inicial abrir rápido no celular.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page<M extends Record<string, any>, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(() => load().then((module) => ({ default: module[name] as ComponentType<ComponentProps<M[K]>> })))
}

const HomePage = page(() => import('@/pages/home'), 'HomePage')
const AcceptInvitePage = page(() => import('@/pages/accept-invite'), 'AcceptInvitePage')
const AdminCompaniesPage = page(() => import('@/pages/admin/companies'), 'AdminCompaniesPage')
const AdminCompanyDetailPage = page(() => import('@/pages/admin/company-detail'), 'AdminCompanyDetailPage')
const AdminCompanyNewPage = page(() => import('@/pages/admin/company-new'), 'AdminCompanyNewPage')
const AdminOrdersPage = page(() => import('@/pages/admin/orders'), 'AdminOrdersPage')
const AdminOverviewPage = page(() => import('@/pages/admin/overview'), 'AdminOverviewPage')
const AdminWithdrawalsPage = page(() => import('@/pages/admin/withdrawals'), 'AdminWithdrawalsPage')
const CertificatePublicPage = page(() => import('@/pages/certificate-public'), 'CertificatePublicPage')
const CompanyInvitationsPage = page(() => import('@/pages/company/invitations'), 'CompanyInvitationsPage')
const TalentProfilePage = page(() => import('@/pages/company/talent-profile'), 'TalentProfilePage')
const TalentsPage = page(() => import('@/pages/company/talents'), 'TalentsPage')
const FakeCheckoutPage = page(() => import('@/pages/fake-checkout'), 'FakeCheckoutPage')
const LearnPage = page(() => import('@/pages/learn'), 'LearnPage')
const CourseBuilderPage = page(() => import('@/pages/mentor/course-builder'), 'CourseBuilderPage')
const MentorCoursesPage = page(() => import('@/pages/mentor/courses'), 'MentorCoursesPage')
const MentorReviewsPage = page(() => import('@/pages/mentor/reviews'), 'MentorReviewsPage')
const NewCoursePage = page(() => import('@/pages/mentor/new-course'), 'NewCoursePage')
const MyLearningPage = page(() => import('@/pages/my-learning'), 'MyLearningPage')
const OnboardingPage = page(() => import('@/pages/onboarding'), 'OnboardingPage')
const SettingsPage = page(() => import('@/pages/settings'), 'SettingsPage')
const CertificatesPage = page(() => import('@/pages/student/certificates'), 'CertificatesPage')
const StudentInvitationsPage = page(() => import('@/pages/student/invitations'), 'StudentInvitationsPage')
const PortfolioPage = page(() => import('@/pages/student/portfolio'), 'PortfolioPage')
const WalletPage = page(() => import('@/pages/wallet'), 'WalletPage')

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/convite/:token" element={<AcceptInvitePage />} />

        <Route element={<RequireRole roles={['student', 'mentor', 'company']} allowPendingOnboarding />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* A página inicial é a mesma com ou sem login (D25). O painel fica em /painel. */}
        <Route element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
        </Route>

        <Route element={<Layout />}>
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/checkout/fake/:orderId" element={<FakeCheckoutPage />} />
          <Route path="/certificado/:code" element={<CertificatePublicPage />} />

          <Route element={<RequireRole roles={['student', 'mentor', 'company', 'admin']} />}>
            <Route path="/painel" element={<HomePage />} />
            <Route path="/courses/:slug/learn" element={<LearnPage />} />
            <Route path="/my-learning" element={<MyLearningPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<RequireRole roles={['student']} />}>
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/invitations" element={<StudentInvitationsPage />} />
          </Route>

          <Route element={<RequireRole roles={['company']} />}>
            <Route path="/talents" element={<TalentsPage />} />
            <Route path="/talents/:id" element={<TalentProfilePage />} />
            <Route path="/company/invitations" element={<CompanyInvitationsPage />} />
          </Route>

          <Route element={<RequireRole roles={['mentor']} />}>
            <Route path="/mentor/courses" element={<MentorCoursesPage />} />
            <Route path="/mentor/courses/new" element={<NewCoursePage />} />
            <Route path="/mentor/courses/:id" element={<CourseBuilderPage />} />
            <Route path="/mentor/reviews" element={<MentorReviewsPage />} />
            <Route path="/mentor/wallet" element={<WalletPage scope="me" />} />
          </Route>

          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/wallet" element={<WalletPage scope="platform" />} />
            <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
            <Route path="/admin/companies" element={<AdminCompaniesPage />} />
            <Route path="/admin/companies/new" element={<AdminCompanyNewPage />} />
            <Route path="/admin/companies/:id" element={<AdminCompanyDetailPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
