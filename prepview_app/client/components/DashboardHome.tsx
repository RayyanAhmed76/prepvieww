'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, Timer, Flame } from 'lucide-react'

export default function DashboardHome() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [interviewCount, setInterviewCount] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [totalPracticeMs, setTotalPracticeMs] = useState(0)
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [greetingMode, setGreetingMode] = useState<'welcome' | 'welcome_back'>('welcome_back')
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [showMoreLeaderboard, setShowMoreLeaderboard] = useState(false)
  const summaryFetchRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    const storedGreeting = localStorage.getItem('dashboardGreeting')
    if (storedGreeting === 'welcome') {
      setGreetingMode('welcome')
      // Show "Welcome" only once after signup
      localStorage.removeItem('dashboardGreeting')
    } else if (storedGreeting === 'welcome_back') {
      setGreetingMode('welcome_back')
      localStorage.removeItem('dashboardGreeting')
    }

    // Load cached summary instantly (then refresh in background)
    const cached = localStorage.getItem('dashboardSummaryCache')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed?.data) applySummary(parsed.data)
      } catch {}
    }
    fetchDashboardSummary()

    // Listen for refresh events
    const handleRefresh = () => {
      fetchDashboardSummary()
    }
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [])

  const applySummary = (data: any) => {
    if (!data) return
    if (Number.isFinite(Number(data.interviewCount))) setInterviewCount(Number(data.interviewCount))
    if (Number.isFinite(Number(data.bestStreak))) setBestStreak(Number(data.bestStreak))
    if (Number.isFinite(Number(data.totalPracticeMs))) setTotalPracticeMs(Number(data.totalPracticeMs))
    if (Array.isArray(data.recentSessions)) setRecentSessions(data.recentSessions)
    if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) setLeaderboard(data.leaderboard)
  }

  const fetchDashboardSummary = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Abort previous in-flight request
    if (summaryFetchRef.current) summaryFetchRef.current.abort()
    const controller = new AbortController()
    summaryFetchRef.current = controller

    try {
      const response = await fetch('http://localhost:5000/api/interview/dashboard-summary', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      if (!response.ok) return
      const data = await response.json()
      applySummary(data)
      localStorage.setItem('dashboardSummaryCache', JSON.stringify({ at: Date.now(), data }))
    } catch (error) {
      // Ignore abort errors
    }
  }

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours <= 0) return `${minutes}m`
    if (minutes <= 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  }

  const formatDateTime = (value: any) => {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return 'Unknown date'
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const stats: { label: string; value: string; Icon: LucideIcon }[] = [
    { label: 'Interviews Completed', value: interviewCount.toString(), Icon: BarChart3 },
    { label: 'Total Practice Time', value: formatDuration(totalPracticeMs), Icon: Timer },
    { label: 'Best Streak', value: `${bestStreak} day${bestStreak === 1 ? '' : 's'}`, Icon: Flame },
  ]

  const statThemes = [
    {
      card: 'border border-primary/20 border-t-4 border-t-primary bg-gradient-to-br from-primary-50/90 via-white to-white hover:border-primary/35 hover:shadow-lg hover:shadow-primary/10',
      iconWrap: 'bg-gradient-to-br from-primary to-primary-700 text-white shadow-md shadow-primary/25',
      value: 'text-primary-800',
    },
    {
      card: 'border border-accent/25 border-t-4 border-t-accent bg-gradient-to-br from-accent-50/95 via-white to-white hover:border-accent/45 hover:shadow-lg hover:shadow-accent/15',
      iconWrap: 'bg-gradient-to-br from-accent-500 to-accent-700 text-white shadow-md shadow-accent/30',
      value: 'text-accent-900',
    },
    {
      card: 'border border-amber-200/80 border-t-4 border-t-amber-500 bg-gradient-to-br from-amber-50 via-orange-50/50 to-white hover:border-amber-300 hover:shadow-lg hover:shadow-orange-500/10',
      iconWrap: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/30',
      value: 'text-orange-950',
    },
  ] as const

  const displayName = user?.name || user?.username || ''
  const currentUserId = user?.id

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="mb-8 md:mb-12 animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
        <h1 className="mb-2 inline-block overflow-visible bg-gradient-to-r from-primary-800 via-primary-500 to-accent-500 bg-clip-text pb-[0.28em] text-4xl font-bold leading-[1.3] tracking-tight text-transparent md:text-5xl md:leading-[1.28] motion-reduce:bg-none motion-reduce:text-text-primary">
          {greetingMode === 'welcome' ? 'Welcome' : 'Welcome back'}
          {displayName ? `, ${displayName}` : ''}!
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          Ready to ace your next interview? Let&apos;s get started.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const { Icon } = stat
          const theme = statThemes[index]
          return (
            <div
              key={index}
              style={{ animationDelay: `${80 + index * 70}ms` }}
              className={[
                'rounded-xl p-6 shadow-md transition-all duration-300',
                'hover:-translate-y-1 hover:shadow-xl',
                'animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100',
                theme.card,
              ].join(' ')}
            >
              <div
                className={[
                  'mb-4 flex h-12 w-12 items-center justify-center rounded-xl',
                  theme.iconWrap,
                ].join(' ')}
                aria-hidden
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <div className={['text-3xl font-bold mb-1', theme.value].join(' ')}>{stat.value}</div>
              <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div
          style={{ animationDelay: '220ms' }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-primary/5 p-6 border border-border/80 transition-shadow duration-300 hover:shadow-xl animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-text-primary">Leaderboard</h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-500 min-h-[360px] flex flex-col items-center justify-center">
              <p>No leaderboard yet</p>
              <p className="text-sm mt-2">Complete interviews to appear here</p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto pr-2 space-y-2">
              {leaderboard.slice(0, 3).map((u: any) => {
                const isMe = currentUserId && u.userId === currentUserId
                const medal =
                  u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`

                return (
                  <div
                    key={String(u.userId)}
                    className={[
                      'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
                      isMe
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-gray-50/90 border-border hover:border-primary/15 hover:shadow-sm',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-xl w-10 text-center">{medal}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-text-primary truncate">
                          {u.username || 'Unknown'}
                          {isMe ? ' (You)' : ''}
                        </div>
                        <div className="text-xs text-gray-600">
                          Communication {u.avg_nlp_score ?? 0}/100 • Behaviour {u.avg_cv_score ?? 0}/100
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-text-primary">{u.score ?? 0}</div>
                      <div className="text-xs text-gray-500">/100</div>
                    </div>
                  </div>
                )
              })}

              {showMoreLeaderboard &&
                leaderboard.slice(3, 10).map((u: any) => {
                  const isMe = currentUserId && u.userId === currentUserId
                  const medal = `#${u.rank}`

                  return (
                    <div
                      key={String(u.userId)}
                      className={[
                        'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-200',
                        isMe
                          ? 'bg-primary/10 border-primary/30 shadow-sm'
                          : 'bg-gray-50/90 border-border hover:border-primary/15 hover:shadow-sm',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-sm w-10 text-center text-gray-500 font-semibold">{medal}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-text-primary truncate">
                            {u.username || 'Unknown'}
                            {isMe ? ' (You)' : ''}
                          </div>
                          <div className="text-xs text-gray-600">
                            NLP {u.avg_nlp_score ?? 0}/100 • CV {u.avg_cv_score ?? 0}/100
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-text-primary">{u.score ?? 0}</div>
                        <div className="text-xs text-gray-500">/100</div>
                      </div>
                    </div>
                  )
                })}

              {leaderboard.length > 3 && (
                <button
                  onClick={() => setShowMoreLeaderboard((v) => !v)}
                  className="w-full text-center px-4 py-3 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-border font-semibold text-accent"
                >
                  {showMoreLeaderboard ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </div>

        <div
          style={{ animationDelay: '300ms' }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-accent/5 p-6 border border-border/80 transition-shadow duration-300 hover:shadow-xl animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100"
        >
          <h2 className="text-2xl font-bold text-text-primary mb-4">Recent completed interviews</h2>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 min-h-[360px] flex flex-col items-center justify-center">
              <p>No completed interviews yet</p>
              <p className="text-sm mt-2">
                Finish an interview through to the report to see it listed here
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {recentSessions.slice(0, 8).map((s) => {
                const sessionId = s?.session_id || s?.sessionId || s?.id
                const fieldId = s?.fieldid || s?.fieldId || 'General'
                const created = s?.createdAt || s?.created_at

                return (
                  <button
                    key={String(sessionId)}
                    onClick={() => sessionId && router.push(`/results/${sessionId}`)}
                    type="button"
                    className="w-full text-left px-4 py-3 bg-gray-50/90 hover:bg-white rounded-xl transition-all duration-200 border border-border hover:border-accent/35 hover:shadow-md active:scale-[0.99]"
                  >
                    <div className="font-semibold text-text-primary">Interview: {fieldId}</div>
                    <div className="text-sm text-gray-600">
                      {created ? formatDateTime(created) : 'Unknown date'}
                    </div>
                    <div className="text-sm text-accent mt-2">View report →</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

