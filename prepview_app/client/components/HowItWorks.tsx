'use client'

import { Rocket, Target, TrendingUp, UserPlus, type LucideIcon } from 'lucide-react'

export default function HowItWorks() {
  const steps: {
    number: string
    title: string
    description: string
    icon: LucideIcon
    gradient: string
  }[] = [
    {
      number: '01',
      title: 'Create Your Profile',
      description:
        'Sign up and build your professional resume with our easy-to-use CV builder.',
      icon: UserPlus,
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      number: '02',
      title: 'Choose Your Domain',
      description:
        'Select from various IT and CS fields like Data Science, Software Engineering, or DevOps.',
      icon: Target,
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      number: '03',
      title: 'Start Practicing',
      description:
        'Begin your AI-powered interview session with real-time coding challenges and feedback.',
      icon: Rocket,
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      number: '04',
      title: 'Track Progress',
      description:
        'Monitor your performance with detailed analytics and improve with each session.',
      icon: TrendingUp,
      gradient: 'from-primary-500 to-indigo-500',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get interview-ready in just a few simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative">
                <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border h-full">
                  <div
                    className={`mb-6 flex h-16 w-16 shrink-0 items-center justify-center overflow-visible rounded-xl bg-gradient-to-br ${step.gradient} shadow-md text-white`}
                  >
                    <Icon
                      className="h-8 w-8 shrink-0 text-white"
                      strokeWidth={2}
                      color="white"
                      aria-hidden
                    />
                  </div>
                  <div className="text-accent font-bold text-sm mb-2">STEP {step.number}</div>
                  <h3 className="text-2xl font-bold text-text-primary mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <div className="w-8 h-0.5 bg-accent opacity-50"></div>
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-8 border-l-accent border-l-opacity-50 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
