import { BarChart3, BookOpen, CalendarCheck, Compass, FolderOpen, Home, PlayCircle, Settings, ShieldCheck, Sparkles, Target, Trophy, User, Users, Wallet } from 'lucide-react'

export const mobileNav = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/plan', label: 'Plan', icon: CalendarCheck },
  { to: '/coach', label: 'Coach', icon: Sparkles },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
]

export const sidebarNav = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/plan', label: 'Plan', icon: CalendarCheck },
  { to: '/paths', label: 'Paths', icon: Compass },
  { to: '/playbook', label: 'Playbook', icon: Target },
  { to: '/coach', label: 'Coach', icon: Sparkles },
  { to: '/prospects', label: 'Prospects', icon: Users },
  { to: '/revenue', label: 'Revenue', icon: Wallet },
  { to: '/lessons', label: 'Lessons', icon: PlayCircle },
  { to: '/resources', label: 'Resources', icon: FolderOpen },
  { to: '/mentor-check', label: 'Mentor Check', icon: ShieldCheck },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
]

export const sidebarFooterNav = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export { BookOpen }
