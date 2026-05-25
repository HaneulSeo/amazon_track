import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        toss: {
          blue: "#3182f6",
          sky: "#e8f3ff",
          ink: "#191f28",
          gray: "#8b95a1",
          line: "#e5e8eb",
          wash: "#f6f8fb"
        }
      },
      boxShadow: {
        soft: "0 20px 60px rgba(25, 31, 40, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
