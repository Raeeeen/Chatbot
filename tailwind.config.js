/** @type {import('tailwindcss').Config} */
import daisyui from "./node_modules/daisyui";
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        wheat: "#F5DEB3",
        tan: "#d2b48c",
      },
    },
  },
  plugins: [daisyui],
};
