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
    },
  },
  plugins: [],
}
