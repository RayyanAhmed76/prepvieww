'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'resume', label: 'Resume', href: '/resume' },
  { id: 'interview', label: 'Interview', href: '/interview' },
  { id: 'performance', label: 'Performance', href: '/performance' },
] as const

function activeNavId(pathname: string | null): string {
  if (!pathname) return 'dashboard'
  const p = pathname.replace(/\/+$/, '') || '/dashboard'
  if (p === '/dashboard') return 'dashboard'
  if (p === '/resume' || p.startsWith('/resume/')) return 'resume'
  if (p === '/interview' || p.startsWith('/interview/')) return 'interview'
  if (p === '/performance' || p.startsWith('/performance/')) return 'performance'
  return 'dashboard'
}

export default function DashboardNavbar() {
  const pathname = usePathname()
  const activeSection = activeNavId(pathname)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  const linkClass = (itemId: string) =>
    [
      'block rounded-lg font-medium transition-all',
      activeSection === itemId
        ? 'bg-primary text-white shadow-md'
        : 'text-text-primary hover:bg-gray-100',
    ].join(' ')

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <BrandLogo priority />

            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  scroll={false}
                  className={`px-4 py-2 ${linkClass(item.id)}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden md:inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-900"
            >
              Logout
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6 text-text-primary"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full border-r border-border">
          <div className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                scroll={false}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full text-left px-4 py-3 ${linkClass(item.id)}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="p-4 border-t border-border">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-800 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  )
}
