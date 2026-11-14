/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#070b14',
          900: '#0d1424',
          850: '#111a2e',
          800: '#16213a',
          700: '#1e2d4d',
        }
      },
      fontFamily: {
        sans: ['Public Sans', 'Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
