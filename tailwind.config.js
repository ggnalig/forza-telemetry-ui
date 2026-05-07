/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        olive: {
          100: "#f0f5e9",
          // 100: "#eab308", <----- night mode
          300: "#c2d6a5", // Example shade for olive-300
          500: "#808000",
          700: "#556b2f",
        },
      },
      fontFamily: {
        digital: ['"DS-Digital"', "monospace"],
        "digital-plain": ['"DS-Digital-Plain"', "monospace"],
      },
      keyframes: {
        "blink-red": {
          "0%, 100%": { backgroundColor: "none" },
          "50%": { backgroundColor: "#7f1d1d" }, // Warna bg-red-500
        },
        "blink-green": {
          "0%, 100%": { backgroundColor: "none" },
          "50%": { backgroundColor: "#1d7f1d" }, // Warna bg-green-500
        },
      },
      animation: {
        "blink-bg-red": "blink-red 0.8s infinite",
        "blink-bg-green": "blink-green 0.8s infinite",
      },
    },
  },
  plugins: [],
};
