/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        pk: {
          // Space-separated RGB channels — supports Tailwind opacity modifiers (bg-pk-bg/50, etc.)
          bg:         'rgb(var(--pk-bg-rgb) / <alpha-value>)',
          surface:    'rgb(var(--pk-surface-rgb) / <alpha-value>)',
          panel:      'rgb(var(--pk-panel-rgb) / <alpha-value>)',
          sidebar:    'rgb(var(--pk-sidebar-rgb) / <alpha-value>)',
          border:     'rgb(var(--pk-border-rgb) / <alpha-value>)',
          hover:      'rgb(var(--pk-hover-rgb) / <alpha-value>)',
          text:       'rgb(var(--pk-text-rgb) / <alpha-value>)',
          muted:      'rgb(var(--pk-muted-rgb) / <alpha-value>)',
          faint:      'rgb(var(--pk-faint-rgb) / <alpha-value>)',
          accent:     'rgb(var(--pk-accent-rgb) / <alpha-value>)',
          'accent-h': 'rgb(var(--pk-accent-h-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
        mono: ["'JetBrains Mono'", "'Fira Code'", 'Consolas', 'monospace'],
      },
      boxShadow: {
        'card':        '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md':     '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        'card-lg':     '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)',
        'glow-accent': '0 0 0 3px rgba(99,102,241,0.15)',
        'glow-sm':     '0 0 0 1px rgba(99,102,241,0.4)',
        'modal':       '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
        'sidebar':     '2px 0 8px rgba(0,0,0,0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
