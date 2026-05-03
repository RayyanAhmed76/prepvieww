'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Sparkles, Target } from 'lucide-react'
import InterviewFeedbackMarkdown from '@/components/InterviewFeedbackMarkdown'

export default function DashboardPerformance() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bars, setBars] = useState<{ key: string; label: string; value: number }[]>([])
  const [overall, setOverall] = useState<any>(null)
  const [reportsCount, setReportsCount] = useState(0)
  const [latest, setLatest] = useState<any>(null)

  const fetchOverallPerformance = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const res = await fetch('http://localhost:5000/api/interview/performance-overall', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to fetch performance summary')

      const data = await res.json()
      setBars(Array.isArray(data?.bars) ? data.bars : [])
      setOverall(data?.overall || null)
      setReportsCount(Number(data?.reportsCount) || 0)
      setLatest(data?.latest || null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load performance')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchOverallPerformance()
    const handleRefresh = () => fetchOverallPerformance()
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [fetchOverallPerformance])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="mb-8 md:mb-10 animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-800 text-white shadow-lg shadow-primary/25">
            <LineChart className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl">Performance Analytics</h1>
            <p className="mt-1 text-lg text-gray-600">Track your progress and identify areas for improvement</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div
          style={{ animationDelay: '100ms' }}
          className="rounded-2xl border border-border/80 bg-white/95 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm transition-shadow duration-300 hover:shadow-2xl animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100 md:p-8"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-start gap-3">
              <Target className="mt-1 h-6 w-6 shrink-0 text-primary" strokeWidth={2} aria-hidden />
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Overall Performance</h2>
                <p className="text-sm text-gray-600">
                  Aggregated across all completed interviews ({reportsCount})
                </p>
              </div>
            </div>
            {overall ? (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600">Overall Score</div>
                <div className="text-4xl font-bold tabular-nums text-primary-800">
                  {(((overall?.avg_nlp_score || 0) + (overall?.avg_cv_score || 0)) / 2).toFixed(0)}
                  <span className="text-xl font-semibold text-gray-500">/100</span>
                </div>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="space-y-4 py-8">
              <div className="h-4 w-3/4 animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none" />
              <div className="h-3 w-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
              <div className="h-4 w-2/3 animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none" />
              <div className="h-3 w-full animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 py-10 text-center text-red-600">{error}</div>
          ) : bars.length === 0 ? (
            <div className="rounded-xl bg-gray-50 py-12 text-center text-gray-500">
              <p className="text-lg font-medium mb-2">No performance data yet</p>
              <p className="text-sm">Complete an interview to see your metrics.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {bars.map((item, i) => (
                <div
                  key={item.key}
                  style={{ animationDelay: `${140 + i * 45}ms` }}
                  className="animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100"
                >
                  <div className="mb-2 flex justify-between gap-2">
                    <span className="font-medium text-text-primary">{item.label}</span>
                    <span className="tabular-nums text-gray-600">{Math.round(item.value)}/100</span>
                  </div>
                  <div className="h-3.5 w-full overflow-hidden rounded-full bg-gray-200/90 ring-1 ring-gray-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-primary-500 to-accent shadow-sm transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                      style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{ animationDelay: '180ms' }}
          className="rounded-2xl border border-accent/20 bg-white/95 p-6 shadow-xl shadow-accent/10 backdrop-blur-sm transition-shadow duration-300 hover:shadow-2xl animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100 md:p-8"
        >
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" strokeWidth={2} aria-hidden />
            <h2 className="text-2xl font-bold text-text-primary">Latest Report</h2>
          </div>
          {!latest ? (
            <div className="rounded-xl bg-gradient-to-br from-gray-50 to-primary/5 py-12 text-center text-gray-500">
              <p className="mb-2 text-lg font-medium">No reports yet</p>
              <p className="text-sm">Finish an interview to generate a report.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border/80 bg-gradient-to-b from-gray-50/90 to-white p-4 shadow-inner md:p-5">
                {latest.ai_feedback ? (
                  <InterviewFeedbackMarkdown
                    content={latest.ai_feedback}
                    className="text-sm [&_h2]:text-lg [&_h3]:text-base [&_p]:text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-500">No feedback available.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => latest.sessionId && router.push(`/results/${latest.sessionId}`)}
                className="w-full rounded-xl bg-gradient-to-r from-button-primary via-primary to-primary-800 py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl motion-reduce:hover:translate-y-0"
              >
                View full report
              </button>
            </div>
          )}
        </div>

        
      </div>
    </div>
  )
}

