'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'

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

const inputClass =
  'w-full rounded-xl border border-border px-4 py-2.5 text-text-primary placeholder:text-text-primary/40 transition-shadow focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/30'

function dateForInput(value: string | undefined | null): string {
  if (!value) return ''
  // Native date inputs require YYYY-MM-DD. If older data is not in that format,
  // show an empty picker and let the user select a date.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
}

function isPresentValue(value: string | undefined | null): boolean {
  if (!value) return false
  return value.trim().toLowerCase() === 'present'
}

function ensureEditableCV(data: CVData): CVData {
  return {
    ...data,
    personalInfo: {
      fullName: data.personalInfo?.fullName ?? '',
      email: data.personalInfo?.email ?? '',
      phone: data.personalInfo?.phone ?? '',
      linkedin: data.personalInfo?.linkedin ?? '',
      github: data.personalInfo?.github ?? '',
    },
    summary: data.summary ?? '',
    skills: data.skills?.length ? [...data.skills] : [''],
    projects:
      data.projects?.length > 0
        ? data.projects.map((p) => ({
            title: p.title ?? '',
            role: p.role ?? '',
            techStack: p.techStack ?? '',
            description: p.description ?? '',
          }))
        : [{ title: '', role: '', techStack: '', description: '' }],
    education:
      data.education?.length > 0
        ? data.education.map((e) => ({
            degree: e.degree ?? '',
            institution: e.institution ?? '',
            graduationYear: e.graduationYear ?? '',
            fyp: e.fyp ?? '',
          }))
        : [{ degree: '', institution: '', graduationYear: '', fyp: '' }],
    experience: data.experience?.length ? [...data.experience] : [],
  }
}

export default function DashboardResume() {
  const router = useRouter()
  const toast = useToast()
  const [cvData, setCvData] = useState<CVData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [resumeDraftLoaded, setResumeDraftLoaded] = useState(false)
  const [hasEditDraft, setHasEditDraft] = useState(false)
  const skillInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const pendingSkillFocusIndexRef = useRef<number | null>(null)

  const fetchResume = useCallback(async () => {
    // If we're in edit mode (especially restoring from a draft), avoid flipping
    // the UI back to the loading skeleton while the fetch runs.
    if (!editing) setLoading(true)
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
  }, [editing, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem('resume_edit_draft_v1')
      if (!raw) {
        setResumeDraftLoaded(true)
        return
      }
      const parsed = JSON.parse(raw) as { editing?: boolean; cvData?: CVData }
      if (parsed?.cvData) {
        setCvData(ensureEditableCV(parsed.cvData))
      }
      if (parsed?.editing) {
        setEditing(true)
      }
      setHasEditDraft(Boolean(parsed?.editing && parsed?.cvData))
    } catch {
      // Ignore corrupted drafts.
    } finally {
      // If a draft exists, don't show the skeleton while fetch runs.
      setLoading(false)
      setResumeDraftLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!resumeDraftLoaded) return
    fetchResume()
    const handleRefresh = () => fetchResume()
    window.addEventListener('dashboard-refresh', handleRefresh)
    return () => window.removeEventListener('dashboard-refresh', handleRefresh)
  }, [fetchResume, resumeDraftLoaded])

  useEffect(() => {
    const idx = pendingSkillFocusIndexRef.current
    if (idx === null) return
    pendingSkillFocusIndexRef.current = null
    const el = skillInputRefs.current[idx]
    el?.focus()
  }, [cvData?.skills?.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!resumeDraftLoaded) return
    try {
      if (!editing) {
        window.sessionStorage.removeItem('resume_edit_draft_v1')
        return
      }
      if (!cvData) return
      window.sessionStorage.setItem(
        'resume_edit_draft_v1',
        JSON.stringify({ editing: true, cvData })
      )
    } catch {
      // Storage can fail (quota / private mode). Safe to ignore.
    }
  }, [cvData, editing, resumeDraftLoaded])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!resumeDraftLoaded) return
    const handleVisibility = () => {
      try {
        if (!editing || !cvData) return
        window.sessionStorage.setItem(
          'resume_edit_draft_v1',
          JSON.stringify({ editing: true, cvData })
        )
      } catch {
        // Ignore
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handleVisibility)
    }
  }, [cvData, editing, resumeDraftLoaded])

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
        toast.success('Resume updated successfully')
      } else {
        const body = await response.json().catch(() => ({}))
        toast.error((body as { message?: string })?.message || 'Could not update resume')
      }
    } catch (error) {
      console.error('Error updating resume:', error)
      toast.error('Network error while updating resume')
    }
  }

  const handlePersonalInfoChange = (field: keyof CVData['personalInfo'], value: string) => {
    if (!cvData) return
    setCvData({
      ...cvData,
      personalInfo: { ...cvData.personalInfo, [field]: value },
    })
  }

  const handleSkillChange = (index: number, value: string) => {
    if (!cvData) return
    const skills = [...cvData.skills]
    skills[index] = value
    setCvData({ ...cvData, skills })
  }

  const addSkill = () => {
    if (!cvData) return
    pendingSkillFocusIndexRef.current = cvData.skills.length
    setCvData({ ...cvData, skills: [...cvData.skills, ''] })
  }

  const removeSkill = (index: number) => {
    if (!cvData || cvData.skills.length <= 1) return
    setCvData({ ...cvData, skills: cvData.skills.filter((_, i) => i !== index) })
  }

  const handleProjectChange = (index: number, field: keyof CVData['projects'][0], value: string) => {
    if (!cvData) return
    const projects = [...cvData.projects]
    projects[index] = { ...projects[index], [field]: value }
    setCvData({ ...cvData, projects })
  }

  const addProject = () => {
    if (!cvData) return
    setCvData({
      ...cvData,
      projects: [...cvData.projects, { title: '', role: '', techStack: '', description: '' }],
    })
  }

  const removeProject = (index: number) => {
    if (!cvData || cvData.projects.length <= 1) return
    setCvData({ ...cvData, projects: cvData.projects.filter((_, i) => i !== index) })
  }

  const handleEducationChange = (index: number, field: keyof CVData['education'][0], value: string) => {
    if (!cvData) return
    const education = [...cvData.education]
    education[index] = { ...education[index], [field]: value }
    setCvData({ ...cvData, education })
  }

  const addEducation = () => {
    if (!cvData) return
    setCvData({
      ...cvData,
      education: [...cvData.education, { degree: '', institution: '', graduationYear: '', fyp: '' }],
    })
  }

  const removeEducation = (index: number) => {
    if (!cvData || cvData.education.length <= 1) return
    setCvData({ ...cvData, education: cvData.education.filter((_, i) => i !== index) })
  }

  const handleExperienceChange = (
    index: number,
    field: keyof NonNullable<CVData['experience']>[0],
    value: string
  ) => {
    if (!cvData) return
    const experience = [...(cvData.experience || [])]
    experience[index] = { ...experience[index], [field]: value }
    setCvData({ ...cvData, experience })
  }

  const addExperience = () => {
    if (!cvData) return
    setCvData({
      ...cvData,
      experience: [
        ...(cvData.experience || []),
        { jobTitle: '', company: '', startDate: '', endDate: '', responsibilities: '' },
      ],
    })
  }

  const removeExperience = (index: number) => {
    if (!cvData) return
    const experience = (cvData.experience || []).filter((_, i) => i !== index)
    setCvData({ ...cvData, experience })
  }

  const startEditing = () => {
    setCvData((prev) => (prev ? ensureEditableCV(prev) : prev))
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    try {
      window.sessionStorage.removeItem('resume_edit_draft_v1')
    } catch {
      // ignore
    }
    void fetchResume()
  }

  // If we restored an edit draft (e.g. after Snipping Tool focus changes),
  // keep the editor visible while the background fetch completes.
  if (loading && !(editing && hasEditDraft && cvData)) {
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
            onClick={startEditing}
            className="rounded-xl bg-gradient-to-r from-button-primary to-primary px-6 py-2.5 font-semibold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0"
          >
            Edit Resume
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-white/95 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-8 md:p-10 transition-shadow duration-300 hover:shadow-2xl animate-fade-up motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:120ms] motion-reduce:[animation-delay:0ms]">
        {editing ? (
          <div className="space-y-8">
            <section className="rounded-xl border border-border/80 bg-white/80 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-text-primary mb-4">Personal information</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary/75">Full name</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={cvData.personalInfo.fullName}
                    onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary/75">Email</label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={cvData.personalInfo.email}
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary/75">Phone</label>
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={cvData.personalInfo.phone}
                    onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary/75">LinkedIn URL</label>
                  <input
                    type="text"
                    placeholder="LinkedIn URL"
                    value={cvData.personalInfo.linkedin}
                    onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary/75">GitHub URL</label>
                  <input
                    type="text"
                    placeholder="GitHub URL"
                    value={cvData.personalInfo.github}
                    onChange={(e) => handlePersonalInfoChange('github', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border/80 bg-white/80 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-text-primary mb-2">Professional summary</h2>
              <p className="mb-3 text-sm text-text-primary/60">Career goal (3–4 lines max)</p>
              <textarea
                placeholder="Brief summary about yourself and your goals..."
                value={cvData.summary}
                onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                rows={4}
                maxLength={500}
                className={inputClass}
              />
            </section>

            <section className="rounded-xl border-2 border-primary/25 bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Technical skills</h2>
                  <p className="text-sm text-text-primary/60">e.g. Python, React, SQL</p>
                </div>
                <button
                  type="button"
                  onClick={addSkill}
                  className="text-sm font-semibold text-primary hover:text-primary-800"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {cvData.skills.map((skill, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      ref={(el) => {
                        skillInputRefs.current[index] = el
                      }}
                      type="text"
                      placeholder="Skill"
                      value={skill}
                      onChange={(e) => handleSkillChange(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        addSkill()
                      }}
                      className={inputClass}
                    />
                    {cvData.skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="shrink-0 rounded-lg px-3 text-sm text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border-2 border-primary/25 bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Projects</h2>
                  <p className="text-sm text-text-primary/60">Title, role, stack, and impact</p>
                </div>
                <button
                  type="button"
                  onClick={addProject}
                  className="text-sm font-semibold text-primary hover:text-primary-800"
                >
                  + Add
                </button>
              </div>
              {cvData.projects.map((project, index) => (
                <div
                  key={index}
                  className="mb-6 space-y-3 border-b border-border/60 pb-6 last:mb-0 last:border-0 last:pb-0"
                >
                  <input
                    type="text"
                    placeholder="Project title"
                    value={project.title}
                    onChange={(e) => handleProjectChange(index, 'title', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Backend developer)"
                    value={project.role}
                    onChange={(e) => handleProjectChange(index, 'role', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Tech stack"
                    value={project.techStack}
                    onChange={(e) => handleProjectChange(index, 'techStack', e.target.value)}
                    className={inputClass}
                  />
                  <textarea
                    placeholder="Description / impact"
                    value={project.description}
                    onChange={(e) => handleProjectChange(index, 'description', e.target.value)}
                    rows={3}
                    className={inputClass}
                  />
                  {cvData.projects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove project
                    </button>
                  )}
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-border/80 bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Education</h2>
                <button
                  type="button"
                  onClick={addEducation}
                  className="text-sm font-semibold text-primary hover:text-primary-800"
                >
                  + Add
                </button>
              </div>
              {cvData.education.map((edu, index) => (
                <div
                  key={index}
                  className="mb-6 space-y-3 border-b border-border/60 pb-6 last:mb-0 last:border-0 last:pb-0"
                >
                  <input
                    type="text"
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Institution"
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Graduation year"
                    value={edu.graduationYear}
                    onChange={(e) => handleEducationChange(index, 'graduationYear', e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Final year project (optional)"
                    value={edu.fyp || ''}
                    onChange={(e) => handleEducationChange(index, 'fyp', e.target.value)}
                    className={inputClass}
                  />
                  {cvData.education.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove education
                    </button>
                  )}
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-border/80 bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Work experience (optional)</h2>
                  <p className="text-sm text-text-primary/60">Add roles if you have them</p>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="text-sm font-semibold text-primary hover:text-primary-800"
                >
                  + Add
                </button>
              </div>
              {(cvData.experience || []).length === 0 ? (
                <p className="text-sm italic text-text-primary/50">
                  No experience rows yet. Use + Add to add one.
                </p>
              ) : (
                (cvData.experience || []).map((exp, index) => (
                  <div
                    key={index}
                    className="mb-6 space-y-3 border-b border-border/60 pb-6 last:mb-0 last:border-0 last:pb-0"
                  >
                    <input
                      type="text"
                      placeholder="Job title"
                      value={exp.jobTitle}
                      onChange={(e) => handleExperienceChange(index, 'jobTitle', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                      className={inputClass}
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        placeholder="Start date"
                        value={dateForInput(exp.startDate)}
                        onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)}
                        className={inputClass}
                      />
                      <div className="space-y-2">
                        <input
                          type="date"
                          placeholder="End date"
                          value={dateForInput(exp.endDate)}
                          onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)}
                          className={inputClass}
                          disabled={isPresentValue(exp.endDate)}
                        />
                        <label className="flex items-center gap-2 text-sm text-text-primary/70">
                          <input
                            type="checkbox"
                            checked={isPresentValue(exp.endDate)}
                            onChange={(e) =>
                              handleExperienceChange(index, 'endDate', e.target.checked ? 'Present' : '')
                            }
                            className="h-4 w-4 rounded border-border"
                          />
                          Currently working here (Present)
                        </label>
                      </div>
                    </div>
                    <textarea
                      placeholder="Responsibilities"
                      value={exp.responsibilities}
                      onChange={(e) =>
                        handleExperienceChange(index, 'responsibilities', e.target.value)
                      }
                      rows={2}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove experience
                    </button>
                  </div>
                ))
              )}
            </section>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleUpdate}
                className="rounded-xl bg-gradient-to-r from-button-primary to-primary px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={cancelEditing}
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

