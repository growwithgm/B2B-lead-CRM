import type { Config } from "tailwindcss";

// Palette + type scale lifted from the SampleRoute design handoff.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201B",
        // Brand greens
        brand: {
          DEFAULT: "#0E7B57",
          dark: "#0B6447",
          deep: "#0A5A40",
          tint: "#E2F1EA",
        },
        // Warm neutral surfaces from the design
        canvas: "#F4F4F1",
        surface: "#FFFFFF",
        line: "#EAEAE3",
        muted: {
          DEFAULT: "#9AA093",
          soft: "#6B7268",
          strong: "#3E463C",
        },
      },
      fontFamily: {
        sans: ["'Hanken Grotesk'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,32,27,.04), 0 1px 3px rgba(23,32,27,.05)",
        cardHover: "0 5px 16px rgba(23,32,27,.08)",
        drawer: "-14px 0 44px rgba(23,32,27,.2)",
        toast: "0 12px 34px rgba(23,32,27,.28)",
      },
      keyframes: {
        "om-fade": {
          from: { opacity: "0", transform: "translateY(7px)" },
          to: { opacity: "1", transform: "none" },
        },
        "om-slide": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "om-pop": {
          from: { opacity: "0", transform: "scale(.97)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        fade: "om-fade .18s ease",
        slide: "om-slide .22s cubic-bezier(.32,.72,0,1)",
        pop: "om-pop .16s ease",
      },
    },
  },
  plugins: [],
};

export default config;
