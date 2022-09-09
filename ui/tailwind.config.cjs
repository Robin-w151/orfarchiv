/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    fontFamily: {
      sans: ['Roboto', 'system-ui', 'sans-serif'],
      serif: ['Georgia', 'system-ui', 'serif'],
    }
  },
  plugins: [require('@tailwindcss/forms')],
};
