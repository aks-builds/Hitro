/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        pk: {
          bg:        'rgb(var(--pk-bg-rgb) / <alpha-value>)',
          surface:   'rgb(var(--pk-surface-rgb) / <alpha-value>)',
          panel:     'rgb(var(--pk-panel-rgb) / <alpha-value>)',
          sidebar:   'rgb(var(--pk-sidebar-rgb) / <alpha-value>)',
          elevated:  'rgb(var(--pk-elevated-rgb) / <alpha-value>)',
          border:    'rgb(var(--pk-border-rgb) / <alpha-value>)',
          hover:     'rgb(var(--pk-hover-rgb) / <alpha-value>)',
          text:      'rgb(var(--pk-text-rgb) / <alpha-value>)',
          muted:     'rgb(var(--pk-muted-rgb) / <alpha-value>)',
          faint:     'rgb(var(--pk-faint-rgb) / <alpha-value>)',
          accent:    'rgb(var(--pk-accent-rgb) / <alpha-value>)',
          'accent-h':'rgb(var(--pk-accent-h-rgb) / <alpha-value>)',
          success:   'rgb(var(--pk-success-rgb) / <alpha-value>)',
          warning:   'rgb(var(--pk-warning-rgb) / <alpha-value>)',
          error:     'rgb(var(--pk-error-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
        mono: ["'JetBrains Mono'", "'Fira Code'", 'Cascadia Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card':         '0 1px 3px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)',
        'card-md':      '0 4px 12px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.14)',
        'card-lg':      '0 8px 24px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.14)',
        'glow-accent':  '0 0 0 3px rgba(99,102,241,0.22), 0 0 12px rgba(99,102,241,0.12)',
        'glow-sm':      '0 0 0 1px rgba(99,102,241,0.5)',
        'glow-success': '0 0 0 2px rgba(63,185,80,0.3)',
        'glow-error':   '0 0 0 2px rgba(248,81,73,0.3)',
        'modal':        '0 24px 64px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.05)',
        'sidebar':      '1px 0 0 rgba(255,255,255,0.05)',
        'titlebar':     '0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 0 2px rgba(99,102,241,0.4)' },
          '50%':     { boxShadow: '0 0 0 4px rgba(99,102,241,0.15), 0 0 12px rgba(99,102,241,0.25)' },
        },
        'spin-fast': {
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.3' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in':   'scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':   'slide-up-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer':    'shimmer 2s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'spin-fast':  'spin-fast 0.65s linear infinite',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
