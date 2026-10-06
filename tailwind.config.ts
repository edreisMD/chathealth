import type { Config } from "tailwindcss";

/** @type {import('tailwindcss').Config} */
const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
