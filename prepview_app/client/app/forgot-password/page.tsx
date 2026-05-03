'use client'

import { useState } from 'react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setMessage(data.message || 'Check your email for reset instructions.')
      } else {
        setError(data.message || 'Something went wrong.')
      }
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl border-2 border-button-primary shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mb-3 flex justify-center px-1">
              <BrandLogo className="h-24 w-auto max-w-full object-contain sm:h-28" priority />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password</h1>
            <p className="text-gray-600 text-sm">
              Enter the email you used to sign up. We&apos;ll send a link to reset your password (valid for 1 hour).
            </p>
          </div>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg mb-4 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-button-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login" className="text-accent font-semibold hover:opacity-80">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
