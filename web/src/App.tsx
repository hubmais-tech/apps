import { Route, Routes } from 'react-router-dom'

import { Layout } from '@/components/layout'
import { RequireRole } from '@/components/require-role'
import { AdminOrdersPage } from '@/pages/admin/orders'
import { AdminWithdrawalsPage } from '@/pages/admin/withdrawals'
import { CourseDetailPage } from '@/pages/course-detail'
import { ExplorePage } from '@/pages/explore'
import { FakeCheckoutPage } from '@/pages/fake-checkout'
import { HomePage } from '@/pages/home'
import { LearnPage } from '@/pages/learn'
import { LoginPage } from '@/pages/login'
import { CourseEditorPage } from '@/pages/mentor/course-editor'
import { MentorCoursesPage } from '@/pages/mentor/courses'
import { MyLearningPage } from '@/pages/my-learning'
import { NotFoundPage } from '@/pages/not-found'
import { RegisterPage } from '@/pages/register'
import { WalletPage } from '@/pages/wallet'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/checkout/fake/:orderId" element={<FakeCheckoutPage />} />

        <Route element={<RequireRole roles={['student', 'mentor', 'company', 'admin']} />}>
          <Route path="/courses/:slug/learn" element={<LearnPage />} />
          <Route path="/my-learning" element={<MyLearningPage />} />
        </Route>

        <Route element={<RequireRole roles={['mentor']} />}>
          <Route path="/mentor/courses" element={<MentorCoursesPage />} />
          <Route path="/mentor/courses/:id" element={<CourseEditorPage />} />
          <Route path="/mentor/wallet" element={<WalletPage scope="me" />} />
        </Route>

        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/admin/wallet" element={<WalletPage scope="platform" />} />
          <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
