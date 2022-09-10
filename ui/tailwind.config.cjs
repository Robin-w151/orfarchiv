/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontFamily: {
      sans: ['Roboto', 'system-ui', 'sans-serif'],
      serif: ['Georgia', 'system-ui', 'serif'],
    },
    extend: {
      transitionDelay: {
        '25': '25ms',
        '50': '50ms',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
