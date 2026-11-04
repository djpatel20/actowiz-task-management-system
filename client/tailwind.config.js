/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        acto: {
          primary: '#290660', // Actowiz Signature Deep Royal Purple
          gradientStart: '#4400CE', // Actowiz Electric Indigo
          orange: '#FF6B00', // Actowiz Signature CTA Orange
          orangeHover: '#E05D00',
          blue: '#0071CE', // Actowiz Enterprise Blue
          blueHover: '#005BB5',
          dark: '#120726', // Midnight Purple Sidebar
          darkCard: '#1C0D38',
          darkBorder: '#28134C',
          lightPurple: '#F5F2FC',
          subtlePurple: '#ECE6F8',
        },
        bg: {
          primary: '#F8FAFC',
          secondary: '#F1F5F9',
          surface: '#FFFFFF',
          sidebar: '#120726',
        },
        text: {
          primary: '#1E1B26',
          secondary: '#5B616E',
          muted: '#94A3B8',
        },
        border: {
          subtle: '#E2E8F0',
        },
        accent: {
          DEFAULT: '#290660',
          hover: '#1F044A',
          cta: '#FF6B00',
          ctaHover: '#E05D00',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#0071CE',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Poppins', 'Inter', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        'acto-sm': '0 1px 3px 0 rgba(41, 6, 96, 0.05)',
        'acto-md': '0 6px 18px -3px rgba(41, 6, 96, 0.08), 0 3px 8px -2px rgba(41, 6, 96, 0.04)',
        'acto-lg': '0 14px 28px -4px rgba(41, 6, 96, 0.12), 0 6px 12px -3px rgba(41, 6, 96, 0.05)',
        'acto-orange': '0 4px 14px 0 rgba(255, 107, 0, 0.35)',
        'acto-purple': '0 4px 14px 0 rgba(68, 0, 206, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pop-in': 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
};
