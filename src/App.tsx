import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { MascotLoader } from '@/components/mascot/MascotLoader'
import { ToastViewport } from '@/components/ui/Toast'
import { useApp } from '@/store/useApp'

// Entry
const Splash = lazy(() => import('@/pages/auth/Splash'))
const Welcome = lazy(() => import('@/pages/auth/Welcome'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Signup = lazy(() => import('@/pages/auth/Signup'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'))
const Results = lazy(() => import('@/pages/onboarding/Results'))
// Core loop
const Home = lazy(() => import('@/pages/Home'))
const Plan = lazy(() => import('@/pages/Plan'))
const DayDetail = lazy(() => import('@/pages/DayDetail'))
const Mission = lazy(() => import('@/pages/Mission'))
const Lessons = lazy(() => import('@/pages/Lessons'))
const LessonDetail = lazy(() => import('@/pages/LessonDetail'))
// Sell
const Coach = lazy(() => import('@/pages/Coach'))
const OutreachHub = lazy(() => import('@/pages/OutreachHub'))
const ProspectDetail = lazy(() => import('@/pages/ProspectDetail'))
const OutreachGenerate = lazy(() => import('@/pages/OutreachGenerate'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Revenue = lazy(() => import('@/pages/Revenue'))
// Track
const Paths = lazy(() => import('@/pages/Paths'))
const PathDetail = lazy(() => import('@/pages/PathDetail'))
const Progress = lazy(() => import('@/pages/Progress'))
const Streak = lazy(() => import('@/pages/Streak'))
const Achievements = lazy(() => import('@/pages/Achievements'))
const CheckIn = lazy(() => import('@/pages/CheckIn'))
const Complete = lazy(() => import('@/pages/Complete'))
// Library & account
const Resources = lazy(() => import('@/pages/Resources'))
const ResourceDetail = lazy(() => import('@/pages/ResourceDetail'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Profile = lazy(() => import('@/pages/Profile'))
const Settings = lazy(() => import('@/pages/Settings'))
const Subscription = lazy(() => import('@/pages/Subscription'))
const Help = lazy(() => import('@/pages/Help'))
const Search = lazy(() => import('@/pages/Search'))
const MentorCheck = lazy(() => import('@/pages/MentorCheck'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function RequireAuth() {
  const authed = useApp((s) => s.authed)
  const onboarded = useApp((s) => s.onboarded)
  if (!authed) return <Navigate to="/welcome" replace />
  if (!onboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function RequireSignedIn() {
  const authed = useApp((s) => s.authed)
  return authed ? <Outlet /> : <Navigate to="/welcome" replace />
}

export default function App() {
  const theme = useApp((s) => s.settings.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <BrowserRouter>
      <ToastViewport />
      <Suspense fallback={<MascotLoader />}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<RequireSignedIn />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/onboarding/results" element={<Results />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/mission/:day" element={<Mission />} />
            <Route path="/30-day-complete" element={<Complete />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<Home />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/plan/day/:day" element={<DayDetail />} />
              <Route path="/lessons" element={<Lessons />} />
              <Route path="/lessons/:id" element={<LessonDetail />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/coach/conversation/:id" element={<Coach />} />
              <Route path="/prospects" element={<OutreachHub tab="Prospects" />} />
              <Route path="/prospects/:id" element={<ProspectDetail />} />
              <Route path="/outreach" element={<OutreachHub tab="Messages" />} />
              <Route path="/outreach/templates" element={<OutreachHub tab="Templates" />} />
              <Route path="/outreach/follow-ups" element={<OutreachHub tab="Follow-ups" />} />
              <Route path="/outreach/generate" element={<OutreachGenerate />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/paths" element={<Paths />} />
              <Route path="/paths/:slug" element={<PathDetail />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/streak" element={<Streak />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:id" element={<ResourceDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/help" element={<Help />} />
              <Route path="/search" element={<Search />} />
              <Route path="/mentor-check" element={<MentorCheck />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
