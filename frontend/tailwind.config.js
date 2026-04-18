/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'kid-pink': '#FFB7D5',
        'kid-blue': '#A3D9FF',
        'kid-yellow': '#FFF4A3',
        'kid-green': '#B7FFD5',
        'kid-purple': '#D5B7FF',
        'kid-orange': '#FFD0A3',
        'paper-white': '#FFFFFF',
        'paper-bg': '#F8F9FF',
        'bubble-border': '#E2E8F0',
      },
      borderRadius: {
        'bubble': '24px',
        'bubble-sm': '16px',
        'bubble-lg': '32px',
      },
      boxShadow: {
        'bubble': '0 8px 0 rgba(0, 0, 0, 0.05)',
        'bubble-hover': '0 4px 0 rgba(0, 0, 0, 0.05)',
        'kid-glow': '0 0 20px rgba(163, 217, 255, 0.4)',
      },
    },
  },
  plugins: [],
}
