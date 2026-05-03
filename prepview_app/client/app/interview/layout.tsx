'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import DashboardNavbar from '@/components/DashboardNavbar'
import AppShellPage from '@/components/AppShellPage'

/**
 * Picker at /interview uses the same shell as other app sections.
 * Live session at /interview/[fieldId] stays full-screen (no navbar here).
 */
export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    const handleFocus = () => {
      window.dispatchEvent(new Event('dashboard-refresh'))
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const normalized = (pathname || '').replace(/\/+$/, '') || '/interview'
  const isPicker = normalized === '/interview'

  if (isPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary-50/25">
        <DashboardNavbar />
        <div className="pt-16">
          <AppShellPage>{children}</AppShellPage>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
