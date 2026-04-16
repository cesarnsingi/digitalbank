/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:       '#0A0E1A',
        'ink-mid': '#141928',
        'ink-light': '#1E2640',
        border:    '#252D45',
        muted:     '#4A5570',
        soft:      '#8892AA',
        'text-base': '#E8EBF4',
        'text-dim':  '#9BA3B8',
        gold:       '#F5A623',
        'gold-light':'#FFD166',
        'gold-dark': '#C07800',
        emerald:    '#2ECC71',
        danger:     '#E74C3C',
        info:       '#3498DB',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm:  '8px',
        lg:  '20px',
        full:'9999px',
      },
      boxShadow: {
        DEFAULT: '0 4px 24px rgba(0,0,0,0.4)',
        sm:      '0 2px 8px rgba(0,0,0,0.3)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
        shimmer:   'shimmer 1.5s infinite',
        spin:      'spin 0.7s linear infinite',
      },
    },
  },
  plugins: [],
}
