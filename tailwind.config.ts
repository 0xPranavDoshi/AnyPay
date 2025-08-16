import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Crypto Theme Colors
        crypto: {
          primary: "var(--color-crypto-primary)",
          "primary-dark": "var(--color-crypto-primary-dark)",
          secondary: "var(--color-crypto-secondary)",
          accent: "var(--color-crypto-accent)",
          success: "var(--color-crypto-success)",
          warning: "var(--color-crypto-warning)",
          error: "var(--color-crypto-error)",

          // Background colors
          "bg-primary": "var(--color-crypto-bg-primary)",
          "bg-secondary": "var(--color-crypto-bg-secondary)",
          "bg-tertiary": "var(--color-crypto-bg-tertiary)",
          "bg-card": "var(--color-crypto-bg-card)",
          "bg-glass": "var(--color-crypto-bg-glass)",

          // Text colors
          "text-primary": "var(--color-crypto-text-primary)",
          "text-secondary": "var(--color-crypto-text-secondary)",
          "text-muted": "var(--color-crypto-text-muted)",
          "text-accent": "var(--color-crypto-text-accent)",

          // Border colors
          border: "var(--color-crypto-border)",
          "border-light": "var(--color-crypto-border-light)",
          "border-glow": "var(--color-crypto-border-glow)",
        },
      },

      backgroundImage: {
        "crypto-gradient-primary": "var(--color-crypto-gradient-primary)",
        "crypto-gradient-secondary": "var(--color-crypto-gradient-secondary)",
        "crypto-gradient-accent": "var(--color-crypto-gradient-accent)",
        "crypto-gradient-success": "var(--color-crypto-gradient-success)",
      },

      boxShadow: {
        "crypto-primary": "var(--color-crypto-shadow-primary)",
        "crypto-secondary": "var(--color-crypto-shadow-secondary)",
        "crypto-accent": "var(--color-crypto-shadow-accent)",
      },

      animation: {
        "crypto-pulse": "crypto-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "crypto-bounce": "crypto-bounce 1s infinite",
        "crypto-spin": "crypto-spin 1s linear infinite",
        "crypto-fade-in": "crypto-fade-in 0.6s ease-out",
        "crypto-slide-in-right": "crypto-slide-in-right 0.6s ease-out",
      },

      keyframes: {
        "crypto-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "crypto-bounce": {
          "0%, 100%": {
            transform: "translateY(-25%)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "none",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
        "crypto-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "crypto-fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "crypto-slide-in-right": {
          from: {
            opacity: "0",
            transform: "translateX(20px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },

      backdropBlur: {
        crypto: "20px",
      },

      borderRadius: {
        crypto: "0.75rem",
        "crypto-lg": "1rem",
      },

      spacing: {
        crypto: "1.5rem",
        "crypto-lg": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
