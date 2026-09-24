import type { Achievement } from './types'

/** An achievement unlocks when stats[metric] >= target. */
export const achievements: Achievement[] = [
  { id: 'first-step', title: 'First Step', description: 'Complete your very first daily mission.', emoji: '👣', metric: 'missions', target: 1 },
  { id: 'three-day', title: '3-Day Streak', description: 'Show up three days in a row.', emoji: '🔥', metric: 'streak', target: 3 },
  { id: 'seven-day', title: '7-Day Streak', description: 'Keep your streak alive for a full week.', emoji: '⚡', metric: 'streak', target: 7 },
  { id: 'mission-master', title: 'Mission Master', description: 'Complete 15 daily missions, half the program.', emoji: '🎯', metric: 'missions', target: 15 },
  { id: 'first-prospect', title: 'First Prospect', description: 'Add your first potential client to your list.', emoji: '🔍', metric: 'prospects', target: 1 },
  { id: 'ten-prospects', title: '10 Prospects', description: 'Build a list of 10 potential clients.', emoji: '📋', metric: 'prospects', target: 10 },
  { id: 'first-reply', title: 'First Reply', description: 'Get your first reply from a prospect.', emoji: '💬', metric: 'replies', target: 1 },
  { id: 'first-client', title: 'First Client', description: 'Turn a prospect into a paying client.', emoji: '🤝', metric: 'clients', target: 1 },
  { id: 'club-100', title: '$100 Club', description: 'Collect your first $100 online.', emoji: '💵', metric: 'revenue', target: 100, money: true },
  { id: 'club-500', title: '$500 Club', description: 'Reach $500 in collected revenue.', emoji: '💰', metric: 'revenue', target: 500, money: true },
  { id: 'lesson-lover', title: 'Lesson Lover', description: 'Finish 10 lessons from the library.', emoji: '📚', metric: 'lessons', target: 10 },
  { id: 'finisher', title: '30-Day Finisher', description: 'Complete all 30 days of your program.', emoji: '🏆', metric: 'daysCompleted', target: 30 },
]
