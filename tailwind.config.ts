import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-card": "var(--bg-card)",
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          coral: "var(--accent-coral)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        border: "var(--border)",
        success: "var(--success)",
        error: "var(--error)",
        warning: "var(--warning)",
      },
      backgroundImage: {
        "gradient-accent": "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        "glow-lg": "0 0 40px rgba(45, 212, 191, 0.3), 0 0 80px rgba(45, 212, 191, 0.1)",
        "glow-coral": "0 0 20px rgba(168, 85, 247, 0.3)",
        "glow-purple": "0 0 20px rgba(168, 85, 247, 0.3)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "gradient": "gradientRotate 5s ease infinite",
        "orb": "orbFloat 15s ease-in-out infinite",
        "orb-2": "orbFloat2 18s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(45, 212, 191, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(45, 212, 191, 0.4)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientRotate: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        orbFloat: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(10px, -20px) scale(1.05)" },
          "50%": { transform: "translate(-5px, -10px) scale(0.98)" },
          "75%": { transform: "translate(-15px, -25px) scale(1.02)" },
        },
        orbFloat2: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(-15px, 10px) scale(0.97)" },
          "50%": { transform: "translate(10px, 15px) scale(1.03)" },
          "75%": { transform: "translate(20px, -5px) scale(0.99)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
