'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardNavbar from '@/components/DashboardNavbar'
import AppShellPage from '@/components/AppShellPage'

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary-50/25">
      <DashboardNavbar />
      <div className="pt-16">
        <AppShellPage>{children}</AppShellPage>
      </div>
    </div>
  )
}
