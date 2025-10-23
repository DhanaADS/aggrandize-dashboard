/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00A78E",
        "background-light": "#F8F9FA",
        "background-dark": "#1A1A1A",
        "sidebar-light": "#FFFFFF",
        "sidebar-dark": "#2C2C2C",
        "text-light": "#1F2937",
        "text-dark": "#E5E7EB",
        "text-light-secondary": "#6B7280",
        "text-dark-secondary": "#9CA3AF",
        "hover-light": "#F3F4F6",
        "hover-dark": "#374151",
        "active-light": "#E0F2F1",
        "active-dark": "#374151",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [],
}