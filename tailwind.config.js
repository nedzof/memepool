/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-from': 'var(--primary-gradient-from)',
        'primary-to': 'var(--primary-gradient-to)',
        'bg-dark': 'var(--background-dark)',
        'bg-light': 'var(--background-light)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, var(--primary-gradient-from), var(--primary-gradient-to))',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(153, 69, 255, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

