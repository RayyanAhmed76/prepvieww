'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import InterviewInterface from '@/components/InterviewInterface'
import InterviewLaunchOverlay from '@/components/InterviewLaunchOverlay'
import { INTERVIEW_LOADER_UNTIL_KEY } from '@/lib/interviewLaunchTiming'

export default function InterviewPage() {
  const params = useParams()
  const fieldId = params.fieldId as string
  const [entryLoader, setEntryLoader] = useState(false)

  useEffect(() => {
    const untilStr = sessionStorage.getItem(INTERVIEW_LOADER_UNTIL_KEY)
    if (!untilStr) return
    const until = parseInt(untilStr, 10)
    if (Number.isNaN(until)) {
      sessionStorage.removeItem(INTERVIEW_LOADER_UNTIL_KEY)
      return
    }
    const remaining = until - Date.now()
    if (remaining <= 0) {
      sessionStorage.removeItem(INTERVIEW_LOADER_UNTIL_KEY)
      return
    }
    setEntryLoader(true)
    const id = window.setTimeout(() => {
      sessionStorage.removeItem(INTERVIEW_LOADER_UNTIL_KEY)
      setEntryLoader(false)
    }, remaining)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <>
      {entryLoader ? <InterviewLaunchOverlay zClassName="z-[9999]" /> : null}
      <InterviewInterface fieldId={fieldId} />
    </>
  )
}
