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
        void: {
          DEFAULT: "#08090C",
          2: "#111318",
          3: "#181B22",
          surface: "rgba(17, 19, 24, 0.72)",
        },
        aurum: {
          DEFAULT: "#C9A961",
          light: "#E0BE70",
          dim: "#8B733E",
          hair: "rgba(201, 169, 97, 0.20)",
        },
        marble: {
          DEFAULT: "#F5F3EF",
          dim: "#C9C4B8",
          muted: "#8C887F",
        },
        ash: {
          DEFAULT: "#6B6862",
          dark: "#2A2926",
        },
        current: {
          DEFAULT: "#3E6E8E",
          bright: "#4A85AC",
        },
        ember: {
          DEFAULT: "#B4532A",
          bright: "#E05A47",
        },
      },
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
        fraunces: ["Fraunces", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        script: ["var(--font-brand-script)", "cursive", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
