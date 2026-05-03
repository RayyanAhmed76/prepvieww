'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import { Eye, EyeOff } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!token || !email) {
      setError('Invalid reset link. Open the link from your email or request a new reset.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        setSuccess(data.message || 'Password updated.')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setError(data.message || 'Reset failed.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="text-center text-gray-600 text-sm">
        <p className="mb-4">This page needs a valid link from your reset email.</p>
        <Link href="/forgot-password" className="text-accent font-semibold">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-gray-600">
        Resetting password for <span className="font-medium text-text-primary">{email}</span>
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
          {success} Redirecting to sign in…
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="no-native-password-toggle w-full appearance-none px-4 py-3 pr-12 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
            placeholder="••••••••"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <Eye className="h-5 w-5" aria-hidden /> : <EyeOff className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm new password
        </label>
        <input
          id="confirm"
          type={showPassword ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="no-native-password-toggle w-full appearance-none px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !!success}
        className="w-full bg-button-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl border-2 border-button-primary shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mb-3 flex justify-center px-1">
              <BrandLogo className="h-24 w-auto max-w-full object-contain sm:h-28" priority />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set a new password</h1>
          </div>

          <Suspense
            fallback={<div className="text-center text-gray-500 text-sm py-8">Loading…</div>}
          >
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-gray-600">
            <Link href="/login" className="text-accent font-semibold hover:opacity-80">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
