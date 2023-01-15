/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      transitionDelay: {
        25: '25ms',
        50: '50ms',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
