'use client'

import {
  BarChart3,
  Bot,
  FileText,
  Grid3x3,
  Terminal,
  Video,
  type LucideIcon,
} from 'lucide-react'

export default function Features() {
  const features: {
    title: string
    description: string
    icon: LucideIcon
    gradient: string
  }[] = [
    {
      title: 'AI-Powered Interviews',
      description:
        'Practice with intelligent AI that adapts to your skill level and provides real-time feedback.',
      icon: Bot,
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      title: 'Real-Time Coding',
      description:
        'Code in a full-featured IDE with syntax highlighting, autocomplete, and debugging tools.',
      icon: Terminal,
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'Video Recording',
      description: 'Record your interview sessions to review your performance and improve over time.',
      icon: Video,
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      title: 'Performance Analytics',
      description:
        'Track your progress with detailed analytics and personalized improvement recommendations.',
      icon: BarChart3,
      gradient: 'from-primary-500 to-indigo-500',
    },
    {
      title: 'Multiple Domains',
      description: 'Practice interviews for Data Science, Software Engineering, DevOps, and more.',
      icon: Grid3x3,
      gradient: 'from-indigo-500 to-accent-500',
    },
    {
      title: 'Resume Builder',
      description: 'Create a professional resume with our built-in CV builder and templates.',
      icon: FileText,
      gradient: 'from-accent-500 to-primary-500',
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Powerful Features to Help You Succeed
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to prepare for your next technical interview
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-border hover:border-accent transform hover:-translate-y-2"
              >
                <div
                  className={`w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 overflow-visible shadow-md text-white`}
                >
                  <Icon
                    className="h-8 w-8 shrink-0 text-white"
                    strokeWidth={2}
                    color="white"
                    aria-hidden
                  />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
