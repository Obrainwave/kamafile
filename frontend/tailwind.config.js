/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a2332',
          light: '#2d3a4f',
          dark: '#0f1419',
        },
        secondary: {
          DEFAULT: '#4caf50',
          light: '#81c784',
          dark: '#388e3c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

