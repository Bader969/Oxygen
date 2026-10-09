/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{html,ts,js}"
  ],
  theme: {
    extend: {
      colors: {
        "tertiary-fixed-dim": "#c8c6c9",
        "surface-dim": "#121414",
        "inverse-surface": "#e2e2e2",
        "error": "#ffb4ab",
        "on-surface-variant": "#e7bdb8",
        "surface-container": "#1e2020",
        "tertiary-container": "#747377",
        "primary-container": "#e31e24",
        "background": "#121414",
        "on-primary": "#690006",
        "on-primary-fixed": "#410002",
        "outline-variant": "#5d3f3c",
        "inverse-on-surface": "#2f3131",
        "on-surface": "#e2e2e2",
        "on-error-container": "#ffdad6",
        "on-secondary-fixed-variant": "#474649",
        "secondary-fixed-dim": "#c8c6c8",
        "tertiary": "#c8c6c9",
        "surface-container-high": "#282a2b",
        "surface-tint": "#ffb4ab",
        "on-tertiary-fixed": "#1b1b1e",
        "on-primary-fixed-variant": "#93000d",
        "secondary": "#c8c6c8",
        "on-secondary-fixed": "#1c1b1d",
        "surface-bright": "#38393a",
        "primary-fixed": "#ffdad6",
        "error-container": "#93000a",
        "primary-fixed-dim": "#ffb4ab",
        "outline": "#ae8883",
        "surface-container-low": "#1a1c1c",
        "on-primary-container": "#fffafa",
        "secondary-container": "#474649",
        "surface-container-lowest": "#0c0f0f",
        "on-tertiary": "#303033",
        "on-secondary": "#313032",
        "tertiary-fixed": "#e4e1e5",
        "on-secondary-container": "#b7b4b7",
        "surface": "#121414",
        "surface-container-highest": "#333535",
        "on-tertiary-container": "#fdfafe",
        "secondary-fixed": "#e5e1e4",
        "surface-variant": "#333535",
        "on-background": "#e2e2e2",
        "inverse-primary": "#c00014",
        "on-tertiary-fixed-variant": "#47464a",
        "primary": "#ffb4ab",
        "on-error": "#690005"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "stack-md": "1rem",
        "stack-lg": "2rem",
        "stack-sm": "0.5rem",
        "glass-padding": "1.5rem",
        "gutter": "1rem",
        "container-margin": "1.25rem"
      },
      fontFamily: {
        "headline-lg": ["LiraFix", "Hanken Grotesk", "Inter", "sans-serif"],
        "headline-lg-mobile": ["LiraFix", "Hanken Grotesk", "Inter", "sans-serif"],
        "label-caps": ["LiraFix", "JetBrains Mono", "monospace"],
        "headline-sm": ["LiraFix", "Hanken Grotesk", "Inter", "sans-serif"],
        "body-lg": ["LiraFix", "Inter", "sans-serif"],
        "headline-md": ["LiraFix", "Hanken Grotesk", "Inter", "sans-serif"],
        "body-md": ["LiraFix", "Inter", "sans-serif"]
      },
      fontSize: {
        "xs": ["0.875rem", { lineHeight: "1.3rem" }],
        "sm": ["0.975rem", { lineHeight: "1.45rem" }],
        "base": ["1.075rem", { lineHeight: "1.65rem" }],
        "lg": ["1.22rem", { lineHeight: "1.8rem" }],
        "xl": ["1.45rem", { lineHeight: "2rem" }],
        "2xl": ["1.75rem", { lineHeight: "2.3rem" }],
        "3xl": ["2.25rem", { lineHeight: "2.75rem" }],
        "4xl": ["2.75rem", { lineHeight: "3.25rem" }],
        "label-caps": ["0.875rem", { lineHeight: "1.3rem", letterSpacing: "0.04em", fontWeight: "700" }],
        "body-sm": ["0.9375rem", { lineHeight: "1.45rem" }],
        "body-md": ["1.0625rem", { lineHeight: "1.6rem" }],
        "body-lg": ["1.1875rem", { lineHeight: "1.75rem" }],
        "headline-sm": ["1.25rem", { lineHeight: "1.75rem", fontWeight: "700" }],
        "headline-md": ["1.625rem", { lineHeight: "2.1rem", fontWeight: "700" }],
        "headline-lg": ["2.25rem", { lineHeight: "2.75rem", fontWeight: "800" }],
        "headline-lg-mobile": ["1.75rem", { lineHeight: "2.25rem", fontWeight: "800" }]
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
};
