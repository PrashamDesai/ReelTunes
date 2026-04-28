import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          900: "#0b0820",
          950: "#06041a",
          975: "#04031a",
        },
        surface: {
          50: "#f4f1ff",
          100: "#ede7ff",
          200: "#d6c9ff",
        },
        violet: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        pink: {
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
        },
        cyan: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
        },
        emerald: {
          300: "#6ee7b7",
          400: "#34d399",
        },
        rose: {
          300: "#fda4af",
          400: "#fb7185",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(167, 139, 250, 0.25), 0 22px 60px -28px rgba(124, 58, 237, 0.65)",
        glowPink:
          "0 0 0 1px rgba(244, 114, 182, 0.25), 0 22px 60px -28px rgba(236, 72, 153, 0.55)",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(20px, 28px, 0) scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        drift: "drift 18s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
