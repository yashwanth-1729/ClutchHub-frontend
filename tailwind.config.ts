/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        'dm-sans': ['var(--font-dm-sans)', 'sans-serif'],
      },
      colors: {
        'ch-bg': '#0a0a0f',
        'ch-surface': '#111118',
        'ch-border': '#1e1e2e',
        'ch-orange': '#ff6b2b',
        'ch-gold': '#f5c842',
      },
    },
  },
  plugins: [],
};
