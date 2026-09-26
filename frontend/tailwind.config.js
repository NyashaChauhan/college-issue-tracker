/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── CampusResolve Primary (Teal) ─────────────────────
        primary: {
          50:  '#F0FDFB',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0F766E',   // brand primary
          700: '#115E59',   // primary dark / hover
          800: '#134E4A',
          900: '#042F2E',
        },
        // ── CampusResolve Accent (Terracotta/Amber) ──────────
        accent: {
          DEFAULT: '#D97745',
          dark:    '#C26030',
          light:   '#FAEBD7',
        },
        // ── Semantic Colors ───────────────────────────────────
        success: {
          DEFAULT: '#16805B',
          light:   '#D1FAE5',
          text:    '#065F46',
        },
        warning: {
          DEFAULT: '#C47A16',
          light:   '#FEF3C7',
          text:    '#92400E',
        },
        danger: {
          DEFAULT: '#C94A4A',
          light:   '#FEE2E2',
          text:    '#991B1B',
        },
        // ── Brand Neutrals ────────────────────────────────────
        brand: {
          bg:     '#F6F4EF',
          surface:'#FFFFFF',
          text:   '#17201F',
          muted:  '#66736F',
          border: '#E3E5DF',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'card':   '0 1px 3px 0 rgba(15,118,110,0.06), 0 1px 2px -1px rgba(15,118,110,0.04)',
        'card-md':'0 4px 12px 0 rgba(15,118,110,0.08), 0 2px 4px -2px rgba(15,118,110,0.04)',
        'card-lg':'0 10px 24px 0 rgba(15,118,110,0.10), 0 4px 8px -4px rgba(15,118,110,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
