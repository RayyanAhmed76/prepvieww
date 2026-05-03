'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

type SectionId = 'features' | 'how-it-works' | 'reviews'

const SECTION_IDS: SectionId[] = ['features', 'how-it-works', 'reviews']

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
      const featuresEl = document.getElementById('features')
      if (featuresEl) {
        const { top } = featuresEl.getBoundingClientRect()
        if (top > window.innerHeight * 0.45) setActiveSection(null)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el)
    )
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting && e.intersectionRatio > 0.05)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) =>
          a.intersectionRatio >= b.intersectionRatio ? a : b
        )
        const id = top.target.id as SectionId
        if (SECTION_IDS.includes(id)) setActiveSection(id)
      },
      {
        root: null,
        rootMargin: '-35% 0px -35% 0px',
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollToSection = useCallback((sectionId: SectionId) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const sectionNavClass = (id: SectionId) =>
    activeSection === id
      ? 'text-accent font-medium transition-colors'
      : 'text-text-primary hover:text-accent font-medium transition-colors'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-lg py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <BrandLogo priority />
          </div>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className={sectionNavClass('features')}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className={sectionNavClass('how-it-works')}
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('reviews')}
              className={sectionNavClass('reviews')}
            >
              Reviews
            </button>
          </div>

          {/* Right Side - Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-text-primary hover:text-accent font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-button-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

