import type { Config } from "tailwindcss";
import preset from "@ecom/config/tailwind-preset";

const config: Config = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // include the design system so its classes are not purged
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
