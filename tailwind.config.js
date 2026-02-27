/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0d2240',
          light: '#1a3a6e',
          dark: '#080f1f',
        },
        accent: {
          DEFAULT: '#e8380d',
          light: '#ff5a30',
          dark: '#c02d08',
        },
        gold: {
          DEFAULT: '#d4a017',
          light: '#f0c040',
          dark: '#a07a0f',
        },
        field: {
          green: '#1a6644',
          dirt: '#c19a6b',
          grass: '#0d4a2e',
        },
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body: ['var(--font-noto)', 'sans-serif'],
      },
      animation: {
        'float-up': 'floatUp 0.8s ease-out forwards',
        'pulse-ring': 'pulseRing 1s ease-out forwards',
        'score-pop': 'scorePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'ball-fly': 'ballFly 0.5s ease-in-out',
        'streak-glow': 'streakGlow 1.5s ease-in-out infinite',
      },
      keyframes: {
        floatUp: {
          '0%': { opacity: 1, transform: 'translateY(0) scale(1)' },
          '100%': { opacity: 0, transform: 'translateY(-80px) scale(1.3)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.5)', opacity: 1 },
          '100%': { transform: 'scale(2.5)', opacity: 0 },
        },
        scorePop: {
          '0%': { transform: 'scale(0)', opacity: 0 },
          '60%': { transform: 'scale(1.2)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        streakGlow: {
          '0%, 100%': { boxShadow: '0 0 10px #d4a017' },
          '50%': { boxShadow: '0 0 30px #d4a017, 0 0 60px #d4a01755' },
        },
      },
      backgroundImage: {
        'field-gradient': 'radial-gradient(ellipse at center, #1a6644 0%, #0d4a2e 50%, #0a2a1a 100%)',
        'navy-gradient': 'linear-gradient(135deg, #080f1f 0%, #0d2240 50%, #1a3a6e 100%)',
        'diamond-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(232,56,13,0.5), 0 0 40px rgba(232,56,13,0.25)',
        'glow-gold': '0 0 20px rgba(212,160,23,0.5), 0 0 40px rgba(212,160,23,0.25)',
        'glow-green': '0 0 20px rgba(26,102,68,0.5)',
        'game': '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}
