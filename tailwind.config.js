/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'neon': {
          green: '#00ffa3',
          pink: '#ff00ff',
          blue: '#00ffff',
        },
        'dark': {
          surface: '#0c1620',
        },
      },
      animation: {
        'slideUpcomingRight': 'slideUpcomingRight 0.8s ease-in-out forwards',
        'slideLeft': 'slideLeft 0.8s ease-in-out forwards',
        'slideRight': 'slideRight 0.8s ease-in-out forwards',
        'neonPulse': 'neonPulse 2s ease-in-out infinite alternate',
        'neonLineGlow': 'neonLineGlow 2s ease-in-out infinite alternate',
        'borderGlow': 'borderGlow 2s ease-in-out infinite alternate',
        'moveToPastBlock': 'moveToPastBlock 0.8s ease-in-out forwards',
        'moveToCurrentMeme': 'moveToCurrentMeme 0.8s ease-in-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'number-pulse': 'number-pulse 2s ease-in-out infinite',
        'progress-pulse': 'progress-pulse 1.5s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite'
      },
      keyframes: {
        slideUpcomingRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(400px)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(-400px)', opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { transform: 'translateX(-120px)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(400px)', opacity: '1' },
        },
        neonPulse: {
          'from': {
            textShadow: '0 0 10px rgba(0, 255, 163, 0.5), 0 0 20px rgba(0, 255, 163, 0.3)',
          },
          'to': {
            textShadow: '0 0 15px rgba(0, 255, 163, 0.7), 0 0 30px rgba(0, 255, 163, 0.5), 0 0 45px rgba(0, 255, 163, 0.3)',
          },
        },
        neonLineGlow: {
          'from': {
            opacity: '0.5',
            boxShadow: '0 0 5px rgba(0, 255, 163, 0.5)',
          },
          'to': {
            opacity: '0.8',
            boxShadow: '0 0 10px rgba(0, 255, 163, 0.8), 0 0 20px rgba(0, 255, 163, 0.4)',
          },
        },
        borderGlow: {
          'from': {
            opacity: '0.3',
            filter: 'blur(5px)',
          },
          'to': {
            opacity: '0.6',
            filter: 'blur(10px)',
          },
        },
        moveToPastBlock: {
          '0%': {
            top: 'var(--start-y)',
            left: 'var(--start-x)',
            width: '400px',
            height: '400px',
            opacity: '1',
          },
          '100%': {
            top: 'var(--end-y)',
            left: 'var(--end-x)',
            width: '120px',
            height: '120px',
            opacity: '1',
          },
        },
        moveToCurrentMeme: {
          '0%': {
            transform: 'translate(0, 0) scale(1)',
            width: '120px',
            height: '120px',
            opacity: '1',
          },
          '100%': {
            transform: 'translate(var(--target-x), var(--target-y)) scale(1)',
            width: '400px',
            height: '400px',
            opacity: '1',
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.95' },
        },
        'number-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' }
        },
        'progress-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        'heartbeat': {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.1)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.1)' }
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'gradient-fade': 'linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent)',
      },
      boxShadow: {
        'neon': '0 0 30px rgba(0, 255, 163, 0.1)',
      },
    },
  },
  plugins: [],
};

