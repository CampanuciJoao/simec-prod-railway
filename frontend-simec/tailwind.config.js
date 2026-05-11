/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mantém aliases legados para não quebrar telas já existentes,
        // mas remapeados para a paleta Bauhaus Contemporâneo.
        primary:   "#0a0a0a",
        secondary: "#5a5a55",

        ink:        "#0a0a0a",
        "ink-soft": "#2d2d2d",
        paper:      "#efeae1",
        "paper-2":  "#e3dccd",
        accent:     "#ffd400",
        "accent-2": "#f5c200",
        signal:     "#e63946",
        bauhaus:    "#2a4cdc",
        clinic:     "#207d56",
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      boxShadow: {
        bh:    '4px 4px 0 #0a0a0a',
        'bh-sm': '2px 2px 0 #0a0a0a',
        'bh-lg': '8px 8px 0 #0a0a0a',
      },
      borderRadius: {
        none: '0',
      },
    },
  },
  plugins: [],
}
