/** NIT Delhi-inspired palette. Change `nitd` here to retune the brand blue everywhere. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nitd: {
          50: '#eef4fb', 100: '#d9e6f5', 200: '#b3cdeb', 300: '#82aedb', 400: '#4f88c6',
          500: '#2a68ad', 600: '#1d4f91', 700: '#173f75', 800: '#143560', 900: '#0f2745',
        },
        ink: '#111827',
      },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
