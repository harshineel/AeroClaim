/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0A1224', 900: '#0E1729', 800: '#141F38', 700: '#1D2B4D', 600: '#2A3A63' },
        mist: '#8A9AC2', snow: '#E8EEFB', board: '#FFB224', go: '#3DDC97', stop: '#FF6B6B', sky: '#6CB6FF',
      },
      fontFamily: { sans: ['B612', 'ui-sans-serif', 'system-ui', 'sans-serif'], mono: ['"B612 Mono"', 'ui-monospace', 'monospace'] },
      boxShadow: { glow: '0 0 0 1px rgba(255,178,36,.35), 0 0 24px rgba(255,178,36,.18)' },
    },
  },
  plugins: [],
};
