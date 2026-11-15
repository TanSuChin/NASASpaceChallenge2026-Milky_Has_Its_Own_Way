/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tc: {
          bg: 'var(--tc-bg)',
          surface: 'var(--tc-surface)',
          elevated: 'var(--tc-elevated)',
          border: 'var(--tc-border)',
          borderStrong: 'var(--tc-border-strong)',
          text: 'var(--tc-text)',
          secondary: 'var(--tc-text-secondary)',
          muted: 'var(--tc-text-muted)',
          accent: 'var(--tc-accent)',
          accentSoft: 'var(--tc-accent-soft)',
          btnBg: 'var(--tc-btn-bg)',
          btnFg: 'var(--tc-btn-fg)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Roboto"', 'system-ui', '-apple-system', 'sans-serif'],
        numeric: ['"IBM Plex Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
    },
},
plugins: [],
};
