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
          DEFAULT: '#7c3aed',
          50:  '#f5f3ff',
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
        secondary: {
          DEFAULT: '#06b6d4',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        tertiary: {
          DEFAULT: '#a855f7',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
        },
        surface: {
          DEFAULT: '#0f172a',
          50:  '#f8fafc',
          100: '#1e293b',
          200: '#334155',
        },
      },
      fontFamily: {
        sans:     ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display:  ['Montserrat', 'Inter', 'ui-sans-serif', 'sans-serif'],
        mono:     ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary':   'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'gradient-dark':      'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      },
      boxShadow: {
        'glow-primary':   '0 0 20px rgba(124, 58, 237, 0.35)',
        'glow-secondary': '0 0 20px rgba(6, 182, 212, 0.35)',
        'card':           '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        'card-hover':     '0 4px 20px rgba(0,0,0,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
