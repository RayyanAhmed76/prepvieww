'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface CVData {
  personalInfo: {
    fullName: string
    email: string
    phone: string
    linkedin: string
    github: string
  }
  summary: string
  skills: string[]
  projects: Array<{
    title: string
    role: string
    techStack: string
    description: string
  }>
  education: Array<{
    degree: string
    institution: string
    graduationYear: string
    fyp?: string
  }>
  experience?: Array<{
    jobTitle: string
    company: string
    startDate: string
    endDate: string
    responsibilities: string
  }>
}

export default function DashboardResume() {
  const router = useRouter()
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchResume = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('http://localhost:5000/api/cv', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (response.status === 404) {
        setCvData(null)
        return
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        setFetchError((errBody as { message?: string })?.message || 'Could not load resume')
        setCvData(null)
        return
      }

      const data = await response.json()
      setCvData({
        personalInfo: data.personalInfo || {},
        summary: data.summary || '',
        skills: data.skills || [],
        projects: data.projects || [],
        education: data.education || [],
        experience: data.experience || [],
      })
    } catch (error) {
      console.error('Error fetching resume:', error)
      setFetchError('Network error while loading resume')
      setCvData(null)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchResume()
    const handleRefresh = () => fetchResume()
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [fetchResume])

  const handleUpdate = async () => {
    if (!cvData) return
    const token = localStorage.getItem('token')
    try {
      const response = await fetch('http://localhost:5000/api/cv', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cvData),
      })
      if (response.ok) {
        setEditing(false)
        alert('Resume updated successfully!')
      }
    } catch (error) {
      console.error('Error updating resume:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
        <div className="mb-6 h-10 w-48 animate-pulse rounded-lg bg-gray-200/80 motion-reduce:animate-none" />
        <div className="space-y-4 rounded-2xl border border-border/80 bg-white/80 p-8 shadow-lg">
          <div className="h-4 w-3/4 max-w-md rounded bg-gray-200/90" />
          <div className="h-4 w-full max-w-lg rounded bg-gray-100" />
          <div className="h-4 w-5/6 max-w-sm rounded bg-gray-100" />
          <div className="mt-8 h-32 w-full rounded-xl bg-gradient-to-br from-primary/5 to-accent/5" />
        </div>
      </div>
    )
  }

  if (!cvData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
        <div className="mx-auto max-w-lg rounded-2xl border border-border/80 bg-white/95 p-10 text-center shadow-xl shadow-primary/10 backdrop-blur-sm">
          {fetchError ? (
            <>
              <p className="text-red-600 mb-2 font-medium">{fetchError}</p>
              <p className="text-sm text-text-primary/70 mb-6">Try again or create a resume if you have not yet.</p>
              <button
                type="button"
                onClick={() => fetchResume()}
                className="inline-block rounded-xl bg-gray-100 px-6 py-2.5 font-medium text-text-primary transition-all hover:bg-gray-200 mr-2"
              >
                Retry
              </button>
            </>
          ) : (
            <p className="text-text-primary/70 mb-6">No resume found. Please create one first.</p>
          )}
          <a
            href="/cv-creation"
            className="inline-block rounded-xl bg-gradient-to-r from-button-primary to-accent px-8 py-3 font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:opacity-95 hover:shadow-xl"
          >
            Create Resume
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight">My Resume</h1>
          
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl bg-gradient-to-r from-button-primary to-primary px-6 py-2.5 font-semibold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0"
          >
            Edit Resume
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-white/95 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-8 md:p-10 transition-shadow duration-300 hover:shadow-2xl animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:120ms] motion-reduce:[animation-delay:0ms]">
        {editing ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-primary/75 mb-2">Full Name</label>
              <input
                type="text"
                value={cvData.personalInfo.fullName}
                onChange={(e) =>
                  setCvData({
                    ...cvData,
                    personalInfo: { ...cvData.personalInfo, fullName: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-border px-4 py-2.5 text-text-primary placeholder:text-text-primary/40 transition-shadow focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary/75 mb-2">Email</label>
              <input
                type="email"
                value={cvData.personalInfo.email}
                onChange={(e) =>
                  setCvData({
                    ...cvData,
                    personalInfo: { ...cvData.personalInfo, email: e.target.value },
                  })
                }
                className="w-full rounded-xl border border-border px-4 py-2.5 text-text-primary placeholder:text-text-primary/40 transition-shadow focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary/75 mb-2">Summary</label>
              <textarea
                value={cvData.summary}
                onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-text-primary placeholder:text-text-primary/40 transition-shadow focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleUpdate}
                className="rounded-xl bg-gradient-to-r from-button-primary to-primary px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl bg-gray-100 px-6 py-2.5 font-medium text-text-primary/80 transition-all hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-b-2 border-primary/40 pb-6">
              <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
                {cvData.personalInfo.fullName}
              </h2>
              <div className="mt-2 text-text-primary/70">
                {cvData.personalInfo.email} • {cvData.personalInfo.phone}
              </div>
            </div>
            {cvData.summary && (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Professional Summary</h3>
                <p className="text-text-primary/80 leading-relaxed">{cvData.summary}</p>
              </div>
            )}
            {cvData.skills && cvData.skills.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Technical Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {cvData.skills.filter((s) => s.trim()).map((skill, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary ring-1 ring-primary/20 transition-transform hover:scale-105 motion-reduce:hover:scale-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {cvData.projects && cvData.projects.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Projects</h3>
                {cvData.projects.map((project, index) => (
                  <div key={index} className="mb-4">
                    <h4 className="font-bold text-text-primary">{project.title}</h4>
                    <p className="text-sm font-medium text-accent-800">{project.role}</p>
                    {project.techStack && (
                      <p className="mt-1 text-sm text-accent-800">
                        <span className="font-semibold text-primary-800">Tech Stack:</span>{' '}
                        {project.techStack}
                      </p>
                    )}
                    <p className="mt-2 text-text-primary/80 leading-relaxed">{project.description}</p>
                  </div>
                ))}
              </div>
            )}
            {cvData.education && cvData.education.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Education</h3>
                {cvData.education.map((edu, index) => (
                  <div key={index} className="mb-3">
                    <h4 className="font-bold text-text-primary">{edu.degree}</h4>
                    <p className="text-accent">{edu.institution} • {edu.graduationYear}</p>
                    {edu.fyp && (
                      <p className="text-gray-600 text-sm mt-1">
                        <span className="font-semibold">FYP:</span> {edu.fyp}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {cvData.experience && cvData.experience.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Work Experience</h3>
                {cvData.experience.map((exp, index) => (
                  <div key={index} className="mb-4">
                    <h4 className="font-bold text-text-primary">{exp.jobTitle}</h4>
                    <p className="font-medium text-accent-800">
                      {exp.company} • {exp.startDate} - {exp.endDate}
                    </p>
                    <p className="mt-1 text-text-primary/80 leading-relaxed">{exp.responsibilities}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

