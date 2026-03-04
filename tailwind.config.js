/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'apex-dark': '#0F0F23',
        'apex-primary': '#4F46E5',
        'apex-gold': '#C9A227',
        'apex-surface': '#1a1a3e',
        'apex-border': 'rgba(255,255,255,0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}