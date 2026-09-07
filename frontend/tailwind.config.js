export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Outfit"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        creole: {
          DEFAULT: '#1F0E06',
          light: '#2E150B',
        },
        limeshade: {
          DEFAULT: '#C6E385',
          hover: '#B5D86F',
        },
        champion: {
          DEFAULT: '#151130',
          card: '#1D183F',
        },
        lavender: {
          DEFAULT: '#C8BEFA',
          subtle: '#E2DCFC',
        },
        masterpiece: {
          DEFAULT: '#5A2132',
          card: '#6E2A3F',
        },
        dirtywhite: {
          DEFAULT: '#EFE9E9',
          card: '#F6F2F2',
        }
      }
    },
  },
  plugins: [],
}
