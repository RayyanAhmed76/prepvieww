'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import InterviewLaunchOverlay from '@/components/InterviewLaunchOverlay'
import {
  INTERVIEW_LAUNCH_MIN_MS,
  setInterviewLaunchDeadline,
} from '@/lib/interviewLaunchTiming'
import {
  BarChart3,
  Globe2,
  Laptop,
  Palette,
  Rocket,
  Server,
  Shield,
  Smartphone,
  Loader2,
  type LucideIcon,
} from 'lucide-react'

interface InterviewCard {
  id: string
  topic: string
  coverage: string[]
  icon: LucideIcon
  /** Tailwind classes for the icon (stroke uses currentColor) */
  iconClass: string
  /** Tailwind classes for the frosted tile behind the icon */
  tileClass: string
}

export default function DashboardInterview() {
  const router = useRouter()
  const [navigatingFieldId, setNavigatingFieldId] = useState<string | null>(null)
  const [navTopic, setNavTopic] = useState<string | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current)
        navigateTimeoutRef.current = null
      }
    }
  }, [])

  const interviewFields: InterviewCard[] = [
    {
      id: 'data-science',
      topic: 'Data Science',
      coverage: ['Python', 'Machine Learning', 'Statistics', 'Data Analysis'],
      icon: BarChart3,
      iconClass:
        'text-emerald-300 drop-shadow-[0_0_14px_rgba(110,231,183,0.55)] sm:drop-shadow-[0_0_18px_rgba(110,231,183,0.5)]',
      tileClass:
        'bg-gradient-to-br from-emerald-500/35 via-teal-500/20 to-cyan-400/25 ring-1 ring-emerald-300/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
    },
    {
      id: 'software-engineering',
      topic: 'Software Engineering',
      coverage: ['Algorithms', 'Data Structures', 'System Design', 'Problem Solving'],
      icon: Laptop,
      iconClass:
        'text-sky-300 drop-shadow-[0_0_14px_rgba(125,211,252,0.55)] sm:drop-shadow-[0_0_18px_rgba(125,211,252,0.45)]',
      tileClass:
        'bg-gradient-to-br from-sky-500/35 via-blue-600/25 to-indigo-500/30 ring-1 ring-sky-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
    },
    {
      id: 'frontend-development',
      topic: 'Frontend Development',
      coverage: ['React', 'JavaScript', 'CSS', 'Web APIs'],
      icon: Palette,
      iconClass:
        'text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.55)] sm:drop-shadow-[0_0_18px_rgba(251,191,36,0.45)]',
      tileClass:
        'bg-gradient-to-br from-amber-500/40 via-orange-500/25 to-rose-500/25 ring-1 ring-amber-300/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
    },
    {
      id: 'backend-development',
      topic: 'Backend Development',
      coverage: ['Node.js', 'Databases', 'APIs', 'System Architecture'],
      icon: Server,
      iconClass:
        'text-violet-300 drop-shadow-[0_0_14px_rgba(196,181,253,0.55)] sm:drop-shadow-[0_0_18px_rgba(167,139,250,0.45)]',
      tileClass:
        'bg-gradient-to-br from-violet-600/35 via-purple-500/25 to-indigo-600/30 ring-1 ring-violet-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
    },
    {
      id: 'devops',
      topic: 'DevOps',
      coverage: ['Docker', 'Kubernetes', 'CI/CD', 'Cloud Services'],
      icon: Rocket,
      iconClass:
        'text-orange-300 drop-shadow-[0_0_14px_rgba(253,186,116,0.55)] sm:drop-shadow-[0_0_18px_rgba(251,146,60,0.45)]',
      tileClass:
        'bg-gradient-to-br from-orange-500/35 via-amber-500/20 to-rose-500/25 ring-1 ring-orange-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
    },
    {
      id: 'full-stack',
      topic: 'Full Stack Development',
      coverage: ['Full Stack', 'MERN Stack', 'Database Design', 'Deployment'],
      icon: Globe2,
      iconClass:
        'text-accent drop-shadow-[0_0_14px_rgba(1,241,191,0.55)] sm:drop-shadow-[0_0_20px_rgba(1,241,191,0.45)]',
      tileClass:
        'bg-gradient-to-br from-accent/35 via-teal-400/25 to-cyan-500/25 ring-1 ring-accent/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
    },
    {
      id: 'mobile-development',
      topic: 'Mobile Development',
      coverage: ['React Native', 'iOS', 'Android', 'Mobile APIs'],
      icon: Smartphone,
      iconClass:
        'text-fuchsia-300 drop-shadow-[0_0_14px_rgba(240,171,252,0.55)] sm:drop-shadow-[0_0_18px_rgba(232,121,249,0.45)]',
      tileClass:
        'bg-gradient-to-br from-fuchsia-500/35 via-pink-500/25 to-rose-500/25 ring-1 ring-fuchsia-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
    },
    {
      id: 'cybersecurity',
      topic: 'Cybersecurity',
      coverage: ['Security', 'Network Security', 'Encryption', 'Best Practices'],
      icon: Shield,
      iconClass:
        'text-cyan-300 drop-shadow-[0_0_14px_rgba(103,232,249,0.55)] sm:drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]',
      tileClass:
        'bg-gradient-to-br from-cyan-500/30 via-sky-600/25 to-slate-500/25 ring-1 ring-cyan-300/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
    },
  ]

  const handleStartInterview = (fieldId: string, topic: string) => {
    setNavigatingFieldId(fieldId)
    setNavTopic(topic)
    setInterviewLaunchDeadline()
    if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current)
    navigateTimeoutRef.current = setTimeout(() => {
      navigateTimeoutRef.current = null
      router.push(`/interview/${fieldId}`)
    }, INTERVIEW_LAUNCH_MIN_MS)
  }

  const isNavigating = navigatingFieldId !== null

  const loadingOverlay =
    isNavigating && portalRoot
      ? createPortal(<InterviewLaunchOverlay topic={navTopic} />, portalRoot)
      : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {loadingOverlay}
      <div className="mb-8 md:mb-10 animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl mb-2">
          Choose Your Interview Field
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Select a domain to start practicing with AI-powered interviews
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {interviewFields.map((field, cardIndex) => {
          const Icon = field.icon
          const isThisStarting = navigatingFieldId === field.id
          return (
          <div
            key={field.id}
            style={{ animationDelay: `${90 + cardIndex * 55}ms` }}
            className="group overflow-hidden rounded-2xl border border-border/90 bg-white/95 shadow-lg backdrop-blur-sm transition-all duration-300 animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100 hover:-translate-y-2 hover:border-accent/40 hover:shadow-2xl hover:shadow-primary/10 motion-reduce:hover:translate-y-0"
          >
            <div className="bg-gradient-to-br from-primary via-primary-700 to-primary-900 p-8 text-center">
              <div className="flex justify-center mb-4">
                <span className={`inline-flex rounded-2xl p-4 ${field.tileClass}`}>
                  <Icon
                    className={`h-14 w-14 sm:h-16 sm:w-16 ${field.iconClass}`}
                    strokeWidth={1.65}
                    aria-hidden
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white">{field.topic}</h3>
            </div>
            <div className="p-6 md:p-7">
              <h4 className="mb-3 font-semibold text-text-primary">You may be asked about</h4>
              <ul className="mb-3 space-y-2">
                {field.coverage.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center text-gray-600 transition-colors group-hover:text-gray-700"
                  >
                    <span className="mr-2 font-bold text-accent">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mb-6 text-xs leading-relaxed text-gray-500">
                Examples only — actual questions and depth vary each session.
              </p>
              <button
                type="button"
                disabled={isNavigating}
                aria-busy={isThisStarting}
                onClick={() => handleStartInterview(field.id, field.topic)}
                className={`w-full rounded-xl py-3.5 font-semibold shadow-md transition-all duration-300 ${
                  isNavigating
                    ? isThisStarting
                      ? 'inline-flex cursor-wait items-center justify-center gap-2 bg-gradient-to-r from-button-primary to-accent text-white opacity-100 ring-2 ring-accent/70 ring-offset-2 ring-offset-white'
                      : 'cursor-not-allowed bg-gray-400 text-white/90 opacity-60 shadow-none'
                    : 'bg-gradient-to-r from-button-primary to-primary text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20 motion-reduce:hover:translate-y-0'
                }`}
              >
                {isThisStarting ? (
                  <>
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    Opening…
                  </>
                ) : isNavigating ? (
                  'Please wait…'
                ) : (
                  'Start Interview'
                )}
              </button>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

