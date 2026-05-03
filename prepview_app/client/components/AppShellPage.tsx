'use client'

import { usePathname } from 'next/navigation'

/**
 * Soft mesh background + route transition (re-mount on pathname).
 */
export default function AppShellPage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-[-10%] h-[22rem] w-[22rem] rounded-full bg-primary/[0.11] blur-3xl motion-reduce:blur-xl" />
        <div className="absolute top-[28%] -left-20 h-56 w-56 rounded-full bg-accent/[0.14] blur-3xl motion-reduce:blur-xl" />
        <div className="absolute bottom-[-5%] right-[20%] h-48 max-w-[28rem] w-[85%] rounded-full bg-secondary-200/25 blur-3xl motion-reduce:blur-xl" />
      </div>
      <div
        key={pathname}
        className="relative z-10 animate-page-enter motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0"
      >
        {children}
      </div>
    </div>
  )
}
