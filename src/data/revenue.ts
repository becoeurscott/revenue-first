import type { Deal } from './types'
import { daysAgo } from '@/lib/date'

/** ALL CLIENTS AND AMOUNTS ARE FICTITIOUS. */
export const seedDeals: Deal[] = [
  { id: 'd-01', prospectId: 'p-01', path: 'clipping', client: 'Jordan Williams', service: '5-clip starter pack', amount: 150, status: 'Collected', date: daysAgo(2, 12) },
  { id: 'd-02', prospectId: 'p-01', path: 'clipping', client: 'Jordan Williams', service: 'Monthly clipping retainer', amount: 250, status: 'Booked', date: daysAgo(1, 16) },
  { id: 'd-03', prospectId: 'p-02', path: 'clipping', client: 'Priya Raman', service: '10-clip monthly pack', amount: 250, status: 'Potential', date: daysAgo(1, 13) },
  { id: 'd-04', prospectId: 'p-03', path: 'clipping', client: 'Marcus Bell', service: '8-clip podcast pack', amount: 200, status: 'Potential', date: daysAgo(2, 15) },
  { id: 'd-05', prospectId: 'p-04', path: 'clipping', client: 'Elena Voss', service: '6-clip starter pack', amount: 180, status: 'Potential', date: daysAgo(1, 13) },
  { id: 'd-06', prospectId: 'p-05', path: 'clipping', client: 'Dev Okafor', service: '12-clip live stream pack', amount: 300, status: 'Potential', date: daysAgo(2, 10) },
  { id: 'd-07', prospectId: 'p-06', path: 'clipping', client: 'Hannah Lindqvist', service: '5-clip starter pack', amount: 150, status: 'Potential', date: daysAgo(3, 14) },
  { id: 'd-08', prospectId: 'p-07', path: 'clipping', client: 'Tyrese Coleman', service: 'Weekly stream highlights', amount: 120, status: 'Potential', date: daysAgo(2, 20) },
  { id: 'd-09', prospectId: 'p-08', path: 'clipping', client: 'Sofia Marchetti', service: 'LinkedIn Live clip pack', amount: 220, status: 'Potential', date: daysAgo(1, 9) },
  { id: 'd-10', prospectId: 'p-09', path: 'clipping', client: 'Noah Feldman', service: '8-clip trip film pack', amount: 200, status: 'Potential', date: daysAgo(4, 10) },
  { id: 'd-11', prospectId: 'p-10', path: 'clipping', client: 'Aisha Karim', service: '5-clip audiogram pack', amount: 150, status: 'Potential', date: daysAgo(1, 18) },
]

export const revenueGoalHint = 'First $500'
