import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        'xs': '12px',
        'sm': '13px',
        'base': '14px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      fontWeight: {
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
      },
      borderRadius: {
        ' DEFAULT': '7px',
        'sm': '4px',
        'md': '7px',
        'lg': '10px',
        'xl': '16px',
      },
      colors: {
        // Base
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-foreground)",
        },
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        "border-hover": "var(--color-border-hover)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        popover: {
          DEFAULT: "var(--color-popover)",
          foreground: "var(--color-popover-foreground)",
        },

        // Primary
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },

        // Secondary
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },

        // Muted
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },

        // Accent
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },

        // Gold (custom accent)
        gold: {
          DEFAULT: "var(--color-gold)",
          hover: "var(--color-gold-hover)",
        },

        // Semantic
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",

        // Environment
        prod: "var(--color-prod)",
        dev: "var(--color-dev)",
        staging: "var(--color-staging)",
        test: "var(--color-test)",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fadeIn': 'fadeIn 0.15s ease-out',
        'scaleIn': 'scaleIn 0.15s ease-out',
        'slideInRight': 'slideInRight 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
