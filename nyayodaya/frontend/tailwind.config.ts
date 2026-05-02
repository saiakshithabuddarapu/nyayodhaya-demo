import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  '#f0faf8',
          100: '#ccf0e8',
          200: '#9ae0d2',
          300: '#63c9b9',
          400: '#35ae9e',
          500: '#1d9e75', // primary brand
          600: '#1a8a64',
          700: '#0f6e56', // deep brand
          800: '#0d5b47',
          900: '#0b4a3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
