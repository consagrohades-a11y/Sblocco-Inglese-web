/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18221f',
        paper: '#fbf7f1',
        linen: '#f3eadf',
        clay: '#c76545',
        coral: '#e86f51',
        moss: '#0e7c66',
        mint: '#dcefe8',
        sea: '#174e63',
        butter: '#fff2c7',
        blush: '#f8e4df',
      },
      boxShadow: {
        soft: '0 18px 55px rgba(24, 34, 31, 0.10)',
        lift: '0 14px 30px rgba(14, 124, 102, 0.16)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
