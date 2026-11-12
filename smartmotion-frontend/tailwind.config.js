/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // SmartMotion palette
        navy: {
          50: '#F0F4FA',
          100: '#D9E2EF',
          200: '#B2C3DC',
          300: '#7E9AC0',
          400: '#4D70A0',
          500: '#2787D9', // medical blue
          600: '#1E6BB5',
          700: '#173F70',
          800: '#142B4A', // deep navy primary
          900: '#0E1E36',
          950: '#08121F',
        },
        teal: {
          50: '#E8FBF6',
          100: '#CFF5EB',
          200: '#9FEBD6',
          300: '#6FDDBE',
          400: '#43CDA6',
          500: '#20B89A', // accent teal
          600: '#16967B',
          700: '#117561',
          800: '#0C5446',
          900: '#07332B',
        },
        amber: {
          50: '#FFF8EB',
          100: '#FFEFC6',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        canvas: '#F5F7FA',
        ink: '#172B43',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(20,43,74,0.06), 0 1px 2px -1px rgba(20,43,74,0.04)',
        cardHover: '0 8px 24px -6px rgba(20,43,74,0.12), 0 2px 6px -2px rgba(20,43,74,0.06)',
        soft: '0 2px 12px -2px rgba(20,43,74,0.08)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
