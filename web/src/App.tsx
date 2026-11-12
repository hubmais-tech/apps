import { Route, Routes } from 'react-router-dom'

import { Layout } from '@/components/layout'
import { RequireRole } from '@/components/require-role'
import { AcceptInvitePage } from '@/pages/accept-invite'
import { AdminOrdersPage } from '@/pages/admin/orders'
import { AdminOverviewPage } from '@/pages/admin/overview'
import { AdminWithdrawalsPage } from '@/pages/admin/withdrawals'
import { CertificatePublicPage } from '@/pages/certificate-public'
import { CompanyInvitationsPage } from '@/pages/company/invitations'
import { TalentProfilePage } from '@/pages/company/talent-profile'
import { TalentsPage } from '@/pages/company/talents'
import { CourseDetailPage } from '@/pages/course-detail'
import { ExplorePage } from '@/pages/explore'
import { FakeCheckoutPage } from '@/pages/fake-checkout'
import { HomePage } from '@/pages/home'
import { LearnPage } from '@/pages/learn'
import { LoginPage } from '@/pages/login'
import { CourseBuilderPage } from '@/pages/mentor/course-builder'
import { MentorCoursesPage } from '@/pages/mentor/courses'
import { MentorReviewsPage } from '@/pages/mentor/reviews'
import { NewCoursePage } from '@/pages/mentor/new-course'
import { MyLearningPage } from '@/pages/my-learning'
import { NotFoundPage } from '@/pages/not-found'
import { OnboardingPage } from '@/pages/onboarding'
import { RegisterPage } from '@/pages/register'
import { SettingsPage } from '@/pages/settings'
import { CertificatesPage } from '@/pages/student/certificates'
import { StudentInvitationsPage } from '@/pages/student/invitations'
import { PortfolioPage } from '@/pages/student/portfolio'
import { WalletPage } from '@/pages/wallet'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/convite/:token" element={<AcceptInvitePage />} />

      <Route element={<RequireRole roles={['student', 'mentor', 'company']} allowPendingOnboarding />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/checkout/fake/:orderId" element={<FakeCheckoutPage />} />
        <Route path="/certificado/:code" element={<CertificatePublicPage />} />

        <Route element={<RequireRole roles={['student', 'mentor', 'company', 'admin']} />}>
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
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
