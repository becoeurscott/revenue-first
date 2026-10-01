import { Suspense, lazy, useEffect, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { MascotLoader } from '@/components/mascot/MascotLoader'
import { ToastViewport } from '@/components/ui/Toast'
import { useApp } from '@/store/useApp'

// Every page is its own chunk; `page` also records the loader so all chunks can be prefetched once the app is idle.
const loaders: Array<() => Promise<unknown>> = []
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  loaders.push(load)
  return lazy(load)
}

// Entry
const Splash = page(() => import('@/pages/auth/Splash'))
const Welcome = page(() => import('@/pages/auth/Welcome'))
const Login = page(() => import('@/pages/auth/Login'))
const Signup = page(() => import('@/pages/auth/Signup'))
const ForgotPassword = page(() => import('@/pages/auth/ForgotPassword'))
const Onboarding = page(() => import('@/pages/onboarding/Onboarding'))
const Results = page(() => import('@/pages/onboarding/Results'))
// Core loop
const Home = page(() => import('@/pages/Home'))
const Plan = page(() => import('@/pages/Plan'))
const DayDetail = page(() => import('@/pages/DayDetail'))
const Mission = page(() => import('@/pages/Mission'))
const Lessons = page(() => import('@/pages/Lessons'))
const LessonDetail = page(() => import('@/pages/LessonDetail'))
// Sell
const Coach = page(() => import('@/pages/Coach'))
const OutreachHub = page(() => import('@/pages/OutreachHub'))
const ProspectDetail = page(() => import('@/pages/ProspectDetail'))
const OutreachGenerate = page(() => import('@/pages/OutreachGenerate'))
const Pricing = page(() => import('@/pages/Pricing'))
const Revenue = page(() => import('@/pages/Revenue'))
// Track
const Paths = page(() => import('@/pages/Paths'))
const PathDetail = page(() => import('@/pages/PathDetail'))
const Progress = page(() => import('@/pages/Progress'))
const Streak = page(() => import('@/pages/Streak'))
const Achievements = page(() => import('@/pages/Achievements'))
const CheckIn = page(() => import('@/pages/CheckIn'))
const Complete = page(() => import('@/pages/Complete'))
// Library & account
const Resources = page(() => import('@/pages/Resources'))
const ResourceDetail = page(() => import('@/pages/ResourceDetail'))
const Notifications = page(() => import('@/pages/Notifications'))
const Profile = page(() => import('@/pages/Profile'))
const Settings = page(() => import('@/pages/Settings'))
const Subscription = page(() => import('@/pages/Subscription'))
const Help = page(() => import('@/pages/Help'))
const Search = page(() => import('@/pages/Search'))
const MentorCheck = page(() => import('@/pages/MentorCheck'))
const Playbook = page(() => import('@/pages/Playbook'))
const NotFound = page(() => import('@/pages/NotFound'))

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

  useEffect(() => {
    const id = window.setTimeout(() => loaders.forEach((load) => void load()), 600)
    return () => window.clearTimeout(id)
  }, [])

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
              <Route path="/playbook" element={<Playbook />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
