import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F3A8A', // Deep Blue
          50: '#e8ecf5',
          100: '#c5d0e6',
          200: '#9fb0d4',
          300: '#7890c2',
          400: '#5b78b5',
          500: '#3d60a8',
          600: '#1F3A8A', // Main primary
          700: '#1a2f6f',
          800: '#142554',
          900: '#0d1738',
        },
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        accent: {
          DEFAULT: '#01F1BF', // Bright Teal
          50: '#e0fdf9',
          100: '#b3faf0',
          200: '#80f7e6',
          300: '#4df4dc',
          400: '#26f1d5',
          500: '#01F1BF', // Main accent
          600: '#01d9ac',
          700: '#01bf96',
          800: '#01a580',
          900: '#017c5c',
        },
        button: {
          primary: '#00BFA5', // Primary button color
        },
        background: {
          DEFAULT: '#F8F9FA', // Off-White
        },
        text: {
          primary: '#212529', // Dark Charcoal
        },
        border: {
          DEFAULT: '#DEE2E6', // Light Gray
        },
        success: '#28A745',
        warning: '#FFC107',
        danger: '#DC3545',
      },
      keyframes: {
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-soft': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'page-enter': 'page-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up': 'fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in-soft': 'fade-in-soft 0.45s ease-out both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config

