'use client'

import ReactMarkdown from 'react-markdown'

type Props = {
  content: string
  className?: string
}

/**
 * Renders LLM interview feedback (markdown with ### headings) as styled HTML.
 */
export default function InterviewFeedbackMarkdown({ content, className = '' }: Props) {
  if (!content?.trim()) return null

  return (
    <article
      className={`interview-feedback-md text-slate-800 ${className}`}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h2 className="mt-10 first:mt-0 mb-4 text-2xl font-bold tracking-tight text-slate-900 border-b border-primary/20 pb-3">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-9 first:mt-0 mb-3 text-xl font-bold tracking-tight text-slate-900">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 first:mt-0 mb-3 flex items-start gap-3 text-lg font-bold text-slate-900">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent shadow-sm shadow-primary/30"
                aria-hidden
              />
              <span className="leading-snug">{children}</span>
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-6 mb-2 text-base font-semibold text-slate-800">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-[15px] leading-relaxed text-slate-700 md:text-base">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 ml-1 space-y-2 border-l-2 border-primary/20 pl-4 text-slate-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-decimal space-y-2 text-slate-700 marker:font-semibold marker:text-primary">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
          hr: () => <hr className="my-8 border-0 border-t border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
