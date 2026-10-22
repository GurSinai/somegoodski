/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)',
        lift: '0 2px 4px rgba(15,23,42,0.04), 0 20px 40px -16px rgba(15,23,42,0.18)',
        glow: '0 10px 40px -10px rgba(14,165,233,0.55)',
      },
    },
  },
  plugins: [],
};
