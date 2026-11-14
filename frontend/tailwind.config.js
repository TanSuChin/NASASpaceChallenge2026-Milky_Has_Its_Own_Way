/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
          marscare: {
            bg: '#0B0D1A',
            card: '#121522',
            elevated: '#181C2E',
            ink: '#FAF9FA',
            muted: '#E5E5E4',
            glow: '#A5D8FF',
            btn: '#EEF0F6',
            btnInk: '#040404',
          }
        },
        fontFamily: {
          sans: ['"Host Grotesk Variable"', '"Host Grotesk"', 'Segoe UI', 'system-ui', 'sans-serif'],
          mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
        }
      },
    },
    plugins: [],
  }
