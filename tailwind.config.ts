import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: {
            bg: "#ffffff",
            surface: "#f5f9ff",
            border: "#dbe7fb",
            text: "#0b1f3a",
            muted: "#5a6b85",
            accent: "#3b82f6",
            accentSoft: "#dbeafe",
          },
          dark: {
            bg: "#0a0a0f",
            surface: "#15131f",
            border: "#2a2440",
            text: "#f3eefe",
            muted: "#9d92c4",
            accent: "#a855f7",
            accentSoft: "#3b1d6b",
          },
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
      },
    },
  },
  plugins: [],
};

export default config;
