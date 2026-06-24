/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  // Enable built-in RTL variants: rtl:text-right, ltr:ps-4, etc.
  // No plugin needed — Tailwind v3 ships this natively.
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Noto Sans Arabic',
          'Noto Sans',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // Mawasem brand — earthy green palette
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
    },
  },
  plugins: [],
};
