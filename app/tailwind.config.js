/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
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
        // Apple light-mode neutrals.
        chrome: {
          50:  "#ffffff",
          100: "#f5f5f7",
          150: "#eeeef0",
          200: "#e5e5ea",
          300: "#d2d2d7",
          400: "#aeaeb2",
          500: "#86868b",
          600: "#6e6e73",
          700: "#48484a",
          800: "#2c2c2e",
          900: "#1d1d1f",
        },
        accent: {
          DEFAULT: "#007aff",
          hover: "#006fe5",
        },
        flag: {
          pick: "#34c759",
          reject: "#ff3b30",
          yellow: "#ffcc00",
        },
      },
      boxShadow: {
        cell: "0 1px 2px rgba(0,0,0,0.05)",
        sheet: "0 6px 24px rgba(0,0,0,0.08)",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [],
};
