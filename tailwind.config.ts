/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    function ({ addComponents }: { addComponents: (components: Record<string, object>) => void }) {
      addComponents({
        '.prose': {
          color: '#374151', // text-gray-700
          '& p': {
            marginBottom: '1rem',
          },
          '& strong': {
            fontWeight: '600',
            color: '#1f2937', // text-gray-900
          },
          '& em': {
            fontStyle: 'italic',
          },
          '& u': {
            textDecoration: 'underline',
          },
        },
      });
    },
  ],
};
