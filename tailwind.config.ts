import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        toss: {
          blue: "#3182f6",
          blueDark: "#1b64da",
          sky: "#e8f3ff",
          ink: "#191f28",
          ink2: "#4e5968",
          gray: "#8b95a1",
          line: "#e5e8eb",
          wash: "#f6f8fb",
          wash2: "#eef1f5"
        },
        pos: "#00a661",
        neg: "#f04452",
        warn: "#ff8f00"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(25, 31, 40, 0.08)",
        card: "0 1px 2px rgba(25, 31, 40, 0.04), 0 8px 24px rgba(25, 31, 40, 0.05)",
        pop: "0 12px 32px rgba(25, 31, 40, 0.12)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
