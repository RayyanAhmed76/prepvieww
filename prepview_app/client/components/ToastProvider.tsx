'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  type: ToastType
  message: string
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = randomId()
      setToasts((prev) => [...prev, { id, type, message }])
      window.setTimeout(() => remove(id), 2000)
    },
    [remove]
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex w-[92vw] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={[
              'rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm transition-all',
              t.type === 'success'
                ? 'border-green-200 bg-green-50/95 text-green-900'
                : t.type === 'error'
                  ? 'border-red-200 bg-red-50/95 text-red-900'
                  : 'border-border bg-white/95 text-text-primary',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium leading-snug">{t.message}</div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="rounded-lg px-2 py-1 text-xs font-semibold opacity-70 hover:bg-black/5 hover:opacity-100"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

