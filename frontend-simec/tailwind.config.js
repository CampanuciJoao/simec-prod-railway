/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e3a8a", // Exemplo de azul SIMEC
        secondary: "#64748b",
      },
      fontFamily: {
        sans:    ['"Geist Variable"', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Geist Variable"', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        body:    ['"Geist Variable"', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"Geist Mono Variable"', '"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        'display-tight': '-0.015em',
      },
    },
  },
  plugins: [],
}