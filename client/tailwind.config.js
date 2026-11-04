/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F7F7F4',
          secondary: '#F0F0EC',
          surface: '#FFFFFF',
          sidebar: '#202321',
        },
        text: {
          primary: '#252824',
          secondary: '#777B76',
          muted: '#969A94',
        },
        border: {
          subtle: '#E5E6E1',
        },
        accent: {
          DEFAULT: '#5556A6',
          hover: '#45468F',
        },
        status: {
          success: '#438568',
          warning: '#B9843D',
          danger: '#C35D5D',
          info: '#547DA6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
      },
    },
  },
  plugins: [],
};
