/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
        extend: {
          colors: {
            carbon: {
              950: '#07080A',
              900: '#0B0D10',
              800: '#12151B',
              700: '#1E232D',
              600: '#2A3140'
            },
            industrial: {
              yellow: '#F5B700',
              amber: '#FFCC33'
            }
          },
          fontFamily: {
            display: ['"Chakra Petch"', 'sans-serif'],
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
            medusa: ['"Antonio"', '"Montserrat"', 'sans-serif'],
          }
        }
      },
  plugins: [],
};
