import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0d2240",
          light: "#1a3a60",
          dark: "#081525",
        },
        brand: {
          red: "#e8380d",
          gold: "#d4a017",
          mid: "#2d5a8e",
        },
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        noto: ["var(--font-noto)", "sans-serif"],
      },
      animation: {
        "ping-slow": "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "bounce-once": "bounce 0.5s ease-in-out 1",
        "flash": "flash 0.3s ease-in-out",
      },
      keyframes: {
        flash: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
