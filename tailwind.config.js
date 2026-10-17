/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

/**
 * OOMS Office — design tokens from the OOMS Brand Kit.
 * - OOMS Blue #1A73E8 (600) / blue-strong #1552D4 (700) / blue-tint #DBEAFE (100).
 *   Both `indigo-*` and `blue-*` resolve to this ramp, so every existing utility in
 *   the codebase renders in brand blue (no Bootstrap blue, no violet drift).
 * - OOMS Green #13D180 is `brand-green`; text-safe green is emerald-700 (#047857).
 * - Neutrals are slate with the brand line colour (#D7E0EC) at 200; `gray` aliases it.
 * - Edges, not shadows: `shadow-sm` / `shadow` are flat; overlays keep elevation.
 */
const oomsBlue = {
  50: '#EEF5FE',
  100: '#DBEAFE',
  200: '#BBD6FB',
  300: '#8AB8F8',
  400: '#4D93F0',
  500: '#2A80EC',
  600: '#1A73E8',
  700: '#1552D4',
  800: '#1443A6',
  900: '#133A84',
  950: '#0F2554',
};

const oomsSlate = { ...colors.slate, 200: '#D7E0EC' };

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: oomsSlate,
        slate: oomsSlate,
        indigo: oomsBlue,
        blue: oomsBlue,
        brand: {
          ...oomsBlue,
          DEFAULT: '#1A73E8',
          strong: '#1552D4',
          tint: '#DBEAFE',
          green: '#13D180',
          'green-strong': '#047857',
          'green-tint': '#D5F7E8',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#F4F8FF',
        },
        line: {
          DEFAULT: '#D7E0EC',
          strong: '#6B7A90',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        sm: '0 0 #0000',
        DEFAULT: '0 0 #0000',
        md: '0 4px 12px -4px rgb(15 23 42 / 0.10)',
        lg: '0 12px 28px -10px rgb(15 23 42 / 0.16)',
        xl: '0 20px 40px -14px rgb(15 23 42 / 0.20)',
        '2xl': '0 32px 64px -16px rgb(15 23 42 / 0.26)',
        card: '0 0 #0000',
        pop: '0 16px 40px -12px rgb(15 23 42 / 0.22), 0 0 0 1px rgb(15 23 42 / 0.05)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'scale(0.98)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out forwards',
        'slide-up': 'slide-up 0.22s ease-out forwards',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
