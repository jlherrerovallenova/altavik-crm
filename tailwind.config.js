/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Altavik basada en el azul del logo (#6b94b9)
        altavik: {
          50: '#f4f7f9',
          100: '#e7eef3',
          200: '#cedde8',
          300: '#abc6d9',
          400: '#88aec9',
          500: '#6b94b9', // Principal del logo
          600: '#557ba0',
          700: '#466383',
          800: '#3a516b',
          900: '#2d3f54',
        },
        brand: {
          light: '#f4f7f9',
          primary: '#6b94b9',
          dark: '#3a516b',
        },
        slate: {
          850: '#1e293b', 
          950: '#020617', 
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      // Eliminamos los bordes exagerados (4xl) del diseño anterior en los nuevos componentes
    },
  },
  plugins: [],
};