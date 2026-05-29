const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [path.join(__dirname, 'src/**/*.{html,ts}')],
  theme: {
    extend: {
      colors: {
        'lab-white': '#f8fafc',
        'deep-navy': '#0f172a',
        'neon-green': '#10b981',
        'acid-lime': '#bef264'
      },
      fontFamily: {
        sans: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      boxShadow: {
        'brutal-navy': '6px 6px 0 0 rgba(15, 23, 42, 1)',
        'brutal-green': '6px 6px 0 0 rgba(16, 185, 129, 1)'
      }
    }
  },
  plugins: []
};
