/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        system: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        chrome: {
          900: "#1c1c1e",
          800: "#2c2c2e",
          700: "#3a3a3c",
          600: "#48484a",
          500: "#636366",
          400: "#8e8e93",
          300: "#aeaeb2",
          200: "#c7c7cc",
          100: "#e5e5ea",
          50:  "#f2f2f7",
        },
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [],
};
