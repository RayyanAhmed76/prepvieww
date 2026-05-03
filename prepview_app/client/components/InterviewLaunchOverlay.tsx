'use client'

import { Loader2 } from 'lucide-react'

type InterviewLaunchOverlayProps = {
  topic?: string | null
  /** z-index above app chrome (navbar uses z-50) */
  zClassName?: string
}

export default function InterviewLaunchOverlay({
  topic,
  zClassName = 'z-[200]',
}: InterviewLaunchOverlayProps) {
  return (
    <div
      className={`fixed inset-0 ${zClassName} flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm px-6`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-14 w-14 animate-spin text-primary sm:h-16 sm:w-16" aria-hidden />
      <p className="mt-6 text-center text-lg font-semibold text-text-primary sm:text-xl">
        Preparing your interview
      </p>
      {topic ? (
        <p className="mt-2 text-center text-sm text-gray-600 sm:text-base">{topic}</p>
      ) : null}
      <p className="mt-4 max-w-sm text-center text-xs text-gray-500 sm:text-sm">
        Setting up the room — hang tight for a few seconds.
      </p>
    </div>
  )
}
