import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        eotc: {
          gold: '#C59B27',
          'gold-light': '#FDF8EC',
          navy: '#0C2340',
          burgundy: '#6B1226',
          green: '#1B5E20',
          paper: '#FCFBF7',
        },
      },
    },
  },
  plugins: [],
};

export default config;
