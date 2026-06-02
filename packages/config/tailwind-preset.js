/**
 * Shared Tailwind preset — the brand design system.
 *
 * Direction: premium black + gold on warm off-white. Image-forward and bold
 * (Fashion Nova energy), clean modern sans typography, tasteful fluid motion.
 *
 * Colors are exposed as CSS variables (set in globals.css) so the CMS/admin can
 * theme the store at runtime without a rebuild. Values below are HSL channels.
 */

/** @type {import('tailwindcss').Config} */
const preset = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", lg: "2rem" },
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // --- brand scale (warm neutral "ink" + gold accent) ---
        ink: {
          DEFAULT: "hsl(var(--ink) / <alpha-value>)",
          soft: "hsl(var(--ink-soft) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "hsl(var(--gold) / <alpha-value>)",
          soft: "hsl(var(--gold-soft) / <alpha-value>)",
        },
        brass: {
          DEFAULT: "hsl(var(--gold) / <alpha-value>)",
          soft: "hsl(var(--gold-soft) / <alpha-value>)",
        },
        claret: "hsl(var(--claret) / <alpha-value>)",
        // --- semantic tokens (shadcn-style) ---
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
      },
      fontFamily: {
        // Loaded via next/font in apps/web; CSS vars are the contract.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      transitionTimingFunction: {
        // fluid premium easing for hero / large motion
        fluid: "cubic-bezier(0.22, 1, 0.36, 1)",
        "fluid-in": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(110%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        kenburns: {
          from: { transform: "scale(1)" },
          to: { transform: "scale(1.08)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease both",
        marquee: "marquee 30s linear infinite",
        kenburns: "kenburns 12s ease-out both",
      },
    },
  },
  plugins: [],
};

export default preset;
